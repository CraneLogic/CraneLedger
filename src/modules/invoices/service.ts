import { eq, and } from 'drizzle-orm';
import { db, invoices, invoicePayments, payments, contacts } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { postJournalEntry } from '../journals/service.js';
import * as decimal from '../../utils/decimal.js';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'VOIDED';

export interface CreateInvoiceInput {
  entityId: string;
  contactId: string;
  number: string;
  issueDate: string;
  dueDate: string;
  currencyCode?: string;
  subtotalAmount: string | number;
  taxAmount: string | number;
  externalRef?: string;
  // Account IDs for posting
  receivableAccountId: string;
  revenueAccountId: string;
  taxLiabilityAccountId?: string;
}

export async function createInvoice(input: CreateInvoiceInput) {
  logger.info('Creating invoice', { entityId: input.entityId, number: input.number });

  // Verify contact is a customer
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, input.contactId));

  if (!contact) {
    throw new NotFoundError('Contact');
  }

  if (contact.type !== 'CUSTOMER') {
    throw new ValidationError('Contact must be of type CUSTOMER for invoices');
  }

  // Check for duplicate invoice number
  const existing = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.entityId, input.entityId), eq(invoices.number, input.number)));

  if (existing.length > 0) {
    throw new ValidationError(`Invoice number ${input.number} already exists for this entity`);
  }

  const totalAmount = decimal.add(input.subtotalAmount, input.taxAmount);

  const result = await db.transaction(async (tx) => {
    // Create invoice
    const [invoice] = await tx
      .insert(invoices)
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

    return invoice;
  });

  logger.info('Invoice created', { invoiceId: result.id });
  return result;
}

export async function postInvoice(
  invoiceId: string,
  receivableAccountId: string,
  revenueAccountId: string,
  taxLiabilityAccountId?: string
) {
  logger.info('Posting invoice to ledger', { invoiceId });

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw new NotFoundError('Invoice');
  }

  if (invoice.status !== 'DRAFT') {
    throw new ValidationError('Only DRAFT invoices can be posted');
  }

  // Create journal entry: DR Accounts Receivable, CR Revenue + Tax Liability
  const journalLines = [
    {
      accountId: receivableAccountId,
      debit: invoice.totalAmount,
      credit: '0',
      memo: `Invoice ${invoice.number}`,
    },
    {
      accountId: revenueAccountId,
      debit: '0',
      credit: invoice.subtotalAmount,
      memo: `Invoice ${invoice.number} - Revenue`,
    },
  ];

  // Add tax liability line if tax amount > 0
  if (!decimal.isZero(invoice.taxAmount) && taxLiabilityAccountId) {
    journalLines.push({
      accountId: taxLiabilityAccountId,
      debit: '0',
      credit: invoice.taxAmount,
      memo: `Invoice ${invoice.number} - GST`,
    });
  }

  const journal = await postJournalEntry({
    entityId: invoice.entityId,
    date: invoice.issueDate,
    description: `Invoice ${invoice.number} - ${invoice.contactId}`,
    sourceSystem: 'CRANELEDGER_MANUAL',
    sourceReference: `INVOICE_${invoiceId}`,
    lines: journalLines,
  });

  // Update invoice status
  const [updatedInvoice] = await db
    .update(invoices)
    .set({ status: 'SENT', updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId))
    .returning();

  logger.info('Invoice posted', { invoiceId, journalEntryId: journal.entry.id });
  return { invoice: updatedInvoice, journal };
}

export async function recordInvoicePayment(
  invoiceId: string,
  paymentDetails: {
    amount: string | number;
    date: string;
    method: 'STRIPE' | 'BANK_TRANSFER' | 'PAYPAL' | 'CASH' | 'OTHER';
    externalRef?: string;
    bankAccountId: string;
    receivableAccountId: string;
  }
) {
  logger.info('Recording invoice payment', { invoiceId });

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw new NotFoundError('Invoice');
  }

  if (invoice.status === 'VOIDED') {
    throw new ValidationError('Cannot record payment for voided invoice');
  }

  const result = await db.transaction(async (tx) => {
    // Create payment record
    const [payment] = await tx
      .insert(payments)
      .values({
        entityId: invoice.entityId,
        contactId: invoice.contactId,
        direction: 'INCOMING',
        amount: paymentDetails.amount.toString(),
        currencyCode: invoice.currencyCode,
        date: paymentDetails.date,
        method: paymentDetails.method,
        externalRef: paymentDetails.externalRef,
        updatedAt: new Date(),
      })
      .returning();

    // Link payment to invoice
    await tx.insert(invoicePayments).values({
      invoiceId,
      paymentId: payment.id,
      amountApplied: paymentDetails.amount.toString(),
    });

    return payment;
  });

  // Create journal entry: DR Bank, CR Accounts Receivable
  const journal = await postJournalEntry({
    entityId: invoice.entityId,
    date: paymentDetails.date,
    description: `Payment for Invoice ${invoice.number}`,
    sourceSystem: 'CRANELEDGER_MANUAL',
    sourceReference: `PAYMENT_${result.id}`,
    lines: [
      {
        accountId: paymentDetails.bankAccountId,
        debit: paymentDetails.amount,
        credit: '0',
        memo: `Payment received - Invoice ${invoice.number}`,
      },
      {
        accountId: paymentDetails.receivableAccountId,
        debit: '0',
        credit: paymentDetails.amount,
        memo: `Payment received - Invoice ${invoice.number}`,
      },
    ],
  });

  // Update invoice status based on payment
  const totalPaid = await getTotalPaidForInvoice(invoiceId);
  let newStatus: InvoiceStatus = 'PARTIAL';
  
  if (decimal.isEqual(totalPaid, invoice.totalAmount)) {
    newStatus = 'PAID';
  }

  await db
    .update(invoices)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  logger.info('Invoice payment recorded', { 
    invoiceId, 
    paymentId: result.id,
    journalEntryId: journal.entry.id 
  });

  return { payment: result, journal };
}

export async function getInvoice(invoiceId: string) {
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, invoiceId));

  if (!invoice) {
    throw new NotFoundError('Invoice');
  }

  return invoice;
}

async function getTotalPaidForInvoice(invoiceId: string): Promise<string> {
  const paymentLinks = await db
    .select()
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoiceId));

  return paymentLinks.reduce(
    (total, link) => decimal.add(total, link.amountApplied),
    '0.0000'
  );
}
