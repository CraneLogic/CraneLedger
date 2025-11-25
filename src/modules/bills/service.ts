import { eq, and } from 'drizzle-orm';
import { db, bills, billPayments, payments, contacts } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { postJournalEntry } from '../journals/service.js';
import * as decimal from '../../utils/decimal.js';

export type BillStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'VOIDED';

export interface CreateBillInput {
  entityId: string;
  contactId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  currencyCode?: string;
  subtotalAmount: string | number;
  taxAmount: string | number;
  externalRef?: string;
}

export async function createBill(input: CreateBillInput) {
  logger.info('Creating bill', { entityId: input.entityId, number: input.number });

  // Verify contact is a supplier or intercompany
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, input.contactId));

  if (!contact) {
    throw new NotFoundError('Contact');
  }

  if (contact.type !== 'SUPPLIER' && contact.type !== 'INTERCOMPANY') {
    throw new ValidationError('Contact must be of type SUPPLIER or INTERCOMPANY for bills');
  }

  // Check for duplicate bill number
  const existing = await db
    .select()
    .from(bills)
    .where(and(eq(bills.entityId, input.entityId), eq(bills.number, input.number)));

  if (existing.length > 0) {
    throw new ValidationError(`Bill number ${input.number} already exists for this entity`);
  }

  const totalAmount = decimal.add(input.subtotalAmount, input.taxAmount);

  const [bill] = await db
    .insert(bills)
    .values({
      entityId: input.entityId,
      contactId: input.contactId,
      number: input.number,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      status: 'DRAFT',
      currencyCode: input.currencyCode || 'AUD',
      subtotalAmount: input.subtotalAmount.toString(),
      taxAmount: input.taxAmount.toString(),
      totalAmount,
      externalRef: input.externalRef,
      updatedAt: new Date(),
    })
    .returning();

  logger.info('Bill created', { billId: bill.id });
  return bill;
}

export async function postBill(
  billId: string,
  payableAccountId: string,
  expenseAccountId: string,
  taxAssetAccountId?: string
) {
  logger.info('Posting bill to ledger', { billId });

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, billId));

  if (!bill) {
    throw new NotFoundError('Bill');
  }

  if (bill.status !== 'DRAFT') {
    throw new ValidationError('Only DRAFT bills can be posted');
  }

  // Create journal entry: DR Expense + Tax Asset, CR Accounts Payable
  const journalLines = [
    {
      accountId: expenseAccountId,
      debit: bill.subtotalAmount,
      credit: '0',
      memo: `Bill ${bill.number} - Expense`,
    },
    {
      accountId: payableAccountId,
      debit: '0',
      credit: bill.totalAmount,
      memo: `Bill ${bill.number}`,
    },
  ];

  // Add tax asset line if tax amount > 0
  if (!decimal.isZero(bill.taxAmount) && taxAssetAccountId) {
    journalLines.push({
      accountId: taxAssetAccountId,
      debit: bill.taxAmount,
      credit: '0',
      memo: `Bill ${bill.number} - GST on Expenses`,
    });
  }

  const journal = await postJournalEntry({
    entityId: bill.entityId,
    date: bill.issueDate,
    description: `Bill ${bill.number} - ${bill.contactId}`,
    sourceSystem: 'CRANELEDGER_MANUAL',
    sourceReference: `BILL_${billId}`,
    lines: journalLines,
  });

  // Update bill status
  const [updatedBill] = await db
    .update(bills)
    .set({ status: 'SENT', updatedAt: new Date() })
    .where(eq(bills.id, billId))
    .returning();

  logger.info('Bill posted', { billId, journalEntryId: journal.entry.id });
  return { bill: updatedBill, journal };
}

export async function recordBillPayment(
  billId: string,
  paymentDetails: {
    amount: string | number;
    date: string;
    method: 'STRIPE' | 'BANK_TRANSFER' | 'PAYPAL' | 'CASH' | 'OTHER';
    externalRef?: string;
    bankAccountId: string;
    payableAccountId: string;
  }
) {
  logger.info('Recording bill payment', { billId });

  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, billId));

  if (!bill) {
    throw new NotFoundError('Bill');
  }

  if (bill.status === 'VOIDED') {
    throw new ValidationError('Cannot record payment for voided bill');
  }

  const result = await db.transaction(async (tx) => {
    // Create payment record
    const [payment] = await tx
      .insert(payments)
      .values({
        entityId: bill.entityId,
        contactId: bill.contactId,
        direction: 'OUTGOING',
        amount: paymentDetails.amount.toString(),
        currencyCode: bill.currencyCode,
        date: paymentDetails.date,
        method: paymentDetails.method,
        externalRef: paymentDetails.externalRef,
        updatedAt: new Date(),
      })
      .returning();

    // Link payment to bill
    await tx.insert(billPayments).values({
      billId,
      paymentId: payment.id,
      amountApplied: paymentDetails.amount.toString(),
    });

    return payment;
  });

  // Create journal entry: DR Accounts Payable, CR Bank
  const journal = await postJournalEntry({
    entityId: bill.entityId,
    date: paymentDetails.date,
    description: `Payment for Bill ${bill.number}`,
    sourceSystem: 'CRANELEDGER_MANUAL',
    sourceReference: `PAYMENT_${result.id}`,
    lines: [
      {
        accountId: paymentDetails.payableAccountId,
        debit: paymentDetails.amount,
        credit: '0',
        memo: `Payment made - Bill ${bill.number}`,
      },
      {
        accountId: paymentDetails.bankAccountId,
        debit: '0',
        credit: paymentDetails.amount,
        memo: `Payment made - Bill ${bill.number}`,
      },
    ],
  });

  // Update bill status based on payment
  const totalPaid = await getTotalPaidForBill(billId);
  let newStatus: BillStatus = 'PARTIAL';
  
  if (decimal.isEqual(totalPaid, bill.totalAmount)) {
    newStatus = 'PAID';
  }

  await db
    .update(bills)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(bills.id, billId));

  logger.info('Bill payment recorded', { 
    billId, 
    paymentId: result.id,
    journalEntryId: journal.entry.id 
  });

  return { payment: result, journal };
}

export async function getBill(billId: string) {
  const [bill] = await db
    .select()
    .from(bills)
    .where(eq(bills.id, billId));

  if (!bill) {
    throw new NotFoundError('Bill');
  }

  return bill;
}

async function getTotalPaidForBill(billId: string): Promise<string> {
  const paymentLinks = await db
    .select()
    .from(billPayments)
    .where(eq(billPayments.billId, billId));

  return paymentLinks.reduce(
    (total, link) => decimal.add(total, link.amountApplied),
    '0.0000'
  );
}
