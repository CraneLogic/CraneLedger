import { eq, and } from 'drizzle-orm';
import { db, bookings, bookingEvents, contacts } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { postJournalEntry } from '../journals/service.js';
import * as decimal from '../../utils/decimal.js';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type BookingEventType = 'DEPOSIT' | 'BALANCE' | 'PAYOUT' | 'MARGIN' | 'CANCEL' | 'REFUND';

export interface CreateBookingInput {
  externalBookingId: string;
  entityId: string;
  customerName: string;
  customerEmail?: string;
  supplierName?: string;
  supplierEmail?: string;
  totalJobAmount: string | number;
  depositAmount?: string | number;
  marginAmount?: string | number;
}

export interface BookingAccountIds {
  bankAccountId: string;
  customerDepositsHeldAccountId: string;
  accountsReceivableAccountId: string;
  marginRevenueAccountId: string;
  supplierPayoutsAccountId: string;
  gstOnIncomeAccountId: string;
  gstOnExpensesAccountId?: string;
}

/**
 * Create or register a booking in CraneLedger
 */
export async function createBooking(input: CreateBookingInput) {
  logger.info('Creating booking', { externalBookingId: input.externalBookingId });

  // Check if booking already exists
  const existing = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.entityId, input.entityId),
        eq(bookings.externalBookingId, input.externalBookingId)
      )
    );

  if (existing.length > 0) {
    throw new ValidationError(
      `Booking ${input.externalBookingId} already exists for this entity`
    );
  }

  // Create or get customer contact
  let customer = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.entityId, input.entityId),
        eq(contacts.name, input.customerName),
        eq(contacts.type, 'CUSTOMER')
      )
    );

  if (customer.length === 0) {
    const [newCustomer] = await db
      .insert(contacts)
      .values({
        entityId: input.entityId,
        type: 'CUSTOMER',
        name: input.customerName,
        email: input.customerEmail,
        externalRef: `EZYCRANE_CUSTOMER_${input.customerName.replace(/\s+/g, '_')}`,
        updatedAt: new Date(),
      })
      .returning();
    customer = [newCustomer];
  }

  // Create or get supplier contact (if provided)
  let supplierId: string | undefined;
  if (input.supplierName) {
    let supplier = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.entityId, input.entityId),
          eq(contacts.name, input.supplierName),
          eq(contacts.type, 'SUPPLIER')
        )
      );

    if (supplier.length === 0) {
      const [newSupplier] = await db
        .insert(contacts)
        .values({
          entityId: input.entityId,
          type: 'SUPPLIER',
          name: input.supplierName,
          email: input.supplierEmail,
          externalRef: `EZYCRANE_SUPPLIER_${input.supplierName.replace(/\s+/g, '_')}`,
          updatedAt: new Date(),
        })
        .returning();
      supplier = [newSupplier];
    }
    supplierId = supplier[0].id;
  }

  // Create booking
  const [booking] = await db
    .insert(bookings)
    .values({
      externalBookingId: input.externalBookingId,
      entityId: input.entityId,
      customerId: customer[0].id,
      supplierId,
      status: 'PENDING',
      totalJobAmount: input.totalJobAmount.toString(),
      depositAmount: input.depositAmount?.toString() || '0',
      marginAmount: input.marginAmount?.toString() || '0',
      updatedAt: new Date(),
    })
    .returning();

  logger.info('Booking created', { bookingId: booking.id });
  return booking;
}

/**
 * Record deposit received from customer
 * Journal: DR Bank/Clearing, CR Customer Deposits Held (Liability)
 */
export async function recordDeposit(
  bookingId: string,
  amount: string | number,
  date: string,
  accountIds: BookingAccountIds,
  includeGST: boolean = true
) {
  logger.info('Recording deposit', { bookingId, amount });

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Calculate GST if applicable
  const depositAmount = parseFloat(amount.toString());
  const gstAmount = includeGST ? depositAmount - depositAmount / 1.1 : 0;
  const depositExGST = includeGST ? depositAmount / 1.1 : depositAmount;

  const journalLines = [
    {
      accountId: accountIds.bankAccountId,
      debit: depositAmount.toFixed(4),
      credit: '0',
      memo: `Deposit received - Booking ${booking.externalBookingId}`,
    },
    {
      accountId: accountIds.customerDepositsHeldAccountId,
      debit: '0',
      credit: depositExGST.toFixed(4),
      memo: `Customer deposit held - Booking ${booking.externalBookingId}`,
    },
  ];

  // Add GST line if applicable
  if (includeGST && gstAmount > 0) {
    journalLines.push({
      accountId: accountIds.gstOnIncomeAccountId,
      debit: '0',
      credit: gstAmount.toFixed(4),
      memo: `GST on deposit - Booking ${booking.externalBookingId}`,
    });
  }

  // Post journal entry
  const journal = await postJournalEntry({
    entityId: booking.entityId,
    date,
    description: `Deposit received for booking ${booking.externalBookingId}`,
    sourceSystem: 'EZYCRANE_APP',
    sourceReference: booking.externalBookingId,
    lines: journalLines,
  });

  // Create booking event
  await db.insert(bookingEvents).values({
    bookingId,
    type: 'DEPOSIT',
    amount: amount.toString(),
    journalEntryId: journal.entry.id,
    metadata: JSON.stringify({ includeGST, gstAmount }),
  });

  // Update booking
  await db
    .update(bookings)
    .set({
      depositAmount: amount.toString(),
      status: 'CONFIRMED',
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  logger.info('Deposit recorded', { bookingId, journalEntryId: journal.entry.id });
  return { booking, journal };
}

/**
 * Record balance paid by customer
 * Journal: DR Bank/Clearing, CR Accounts Receivable, CR GST on Income
 */
export async function recordBalance(
  bookingId: string,
  amount: string | number,
  date: string,
  accountIds: BookingAccountIds,
  includeGST: boolean = true
) {
  logger.info('Recording balance payment', { bookingId, amount });

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Calculate GST if applicable
  const balanceAmount = parseFloat(amount.toString());
  const gstAmount = includeGST ? balanceAmount - balanceAmount / 1.1 : 0;
  const balanceExGST = includeGST ? balanceAmount / 1.1 : balanceAmount;

  const journalLines = [
    {
      accountId: accountIds.bankAccountId,
      debit: balanceAmount.toFixed(4),
      credit: '0',
      memo: `Balance payment received - Booking ${booking.externalBookingId}`,
    },
    {
      accountId: accountIds.accountsReceivableAccountId,
      debit: '0',
      credit: balanceExGST.toFixed(4),
      memo: `Balance payment - Booking ${booking.externalBookingId}`,
    },
  ];

  // Add GST line if applicable
  if (includeGST && gstAmount > 0) {
    journalLines.push({
      accountId: accountIds.gstOnIncomeAccountId,
      debit: '0',
      credit: gstAmount.toFixed(4),
      memo: `GST on balance - Booking ${booking.externalBookingId}`,
    });
  }

  // Post journal entry
  const journal = await postJournalEntry({
    entityId: booking.entityId,
    date,
    description: `Balance payment for booking ${booking.externalBookingId}`,
    sourceSystem: 'EZYCRANE_APP',
    sourceReference: booking.externalBookingId,
    lines: journalLines,
  });

  // Create booking event
  await db.insert(bookingEvents).values({
    bookingId,
    type: 'BALANCE',
    amount: amount.toString(),
    journalEntryId: journal.entry.id,
    metadata: JSON.stringify({ includeGST, gstAmount }),
  });

  // Update booking
  await db
    .update(bookings)
    .set({
      balanceAmount: amount.toString(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  logger.info('Balance recorded', { bookingId, journalEntryId: journal.entry.id });
  return { booking, journal };
}

/**
 * Record supplier payout
 * Journal: DR Supplier Payouts (COGS), CR Bank/Clearing
 */
export async function recordSupplierPayout(
  bookingId: string,
  amount: string | number,
  date: string,
  accountIds: BookingAccountIds
) {
  logger.info('Recording supplier payout', { bookingId, amount });

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  if (!booking.supplierId) {
    throw new ValidationError('Booking does not have a supplier assigned');
  }

  const journalLines = [
    {
      accountId: accountIds.supplierPayoutsAccountId,
      debit: amount.toString(),
      credit: '0',
      memo: `Supplier payout - Booking ${booking.externalBookingId}`,
    },
    {
      accountId: accountIds.bankAccountId,
      debit: '0',
      credit: amount.toString(),
      memo: `Payment to supplier - Booking ${booking.externalBookingId}`,
    },
  ];

  // Post journal entry
  const journal = await postJournalEntry({
    entityId: booking.entityId,
    date,
    description: `Supplier payout for booking ${booking.externalBookingId}`,
    sourceSystem: 'EZYCRANE_APP',
    sourceReference: booking.externalBookingId,
    lines: journalLines,
  });

  // Create booking event
  await db.insert(bookingEvents).values({
    bookingId,
    type: 'PAYOUT',
    amount: amount.toString(),
    journalEntryId: journal.entry.id,
    metadata: JSON.stringify({ supplierId: booking.supplierId }),
  });

  // Update booking
  await db
    .update(bookings)
    .set({
      supplierPayoutAmount: amount.toString(),
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  logger.info('Supplier payout recorded', { bookingId, journalEntryId: journal.entry.id });
  return { booking, journal };
}

/**
 * Recognize marketplace margin revenue
 * Journal: DR Customer Deposits Held, CR Marketplace Margin Revenue, CR GST on Income
 */
export async function recognizeMargin(
  bookingId: string,
  marginAmount: string | number,
  date: string,
  accountIds: BookingAccountIds,
  includeGST: boolean = true
) {
  logger.info('Recognizing margin revenue', { bookingId, marginAmount });

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  // Calculate GST if applicable
  const margin = parseFloat(marginAmount.toString());
  const gstAmount = includeGST ? margin - margin / 1.1 : 0;
  const marginExGST = includeGST ? margin / 1.1 : margin;

  const journalLines = [
    {
      accountId: accountIds.customerDepositsHeldAccountId,
      debit: margin.toFixed(4),
      credit: '0',
      memo: `Release deposit for margin - Booking ${booking.externalBookingId}`,
    },
    {
      accountId: accountIds.marginRevenueAccountId,
      debit: '0',
      credit: marginExGST.toFixed(4),
      memo: `Margin revenue - Booking ${booking.externalBookingId}`,
    },
  ];

  // Add GST line if applicable
  if (includeGST && gstAmount > 0) {
    journalLines.push({
      accountId: accountIds.gstOnIncomeAccountId,
      debit: '0',
      credit: gstAmount.toFixed(4),
      memo: `GST on margin - Booking ${booking.externalBookingId}`,
    });
  }

  // Post journal entry
  const journal = await postJournalEntry({
    entityId: booking.entityId,
    date,
    description: `Margin revenue recognized for booking ${booking.externalBookingId}`,
    sourceSystem: 'EZYCRANE_APP',
    sourceReference: booking.externalBookingId,
    lines: journalLines,
  });

  // Create booking event
  await db.insert(bookingEvents).values({
    bookingId,
    type: 'MARGIN',
    amount: marginAmount.toString(),
    journalEntryId: journal.entry.id,
    metadata: JSON.stringify({ includeGST, gstAmount }),
  });

  // Update booking
  await db
    .update(bookings)
    .set({
      marginAmount: marginAmount.toString(),
      status: 'COMPLETED',
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId));

  logger.info('Margin recognized', { bookingId, journalEntryId: journal.entry.id });
  return { booking, journal };
}

/**
 * Cancel booking with different scenarios
 */
export async function cancelBooking(
  bookingId: string,
  date: string,
  accountIds: BookingAccountIds,
  scenario: 'DEPOSIT_KEPT' | 'DEPOSIT_REFUNDED' | 'TRANSFER_TO_NEW_SUPPLIER',
  newSupplierId?: string
) {
  logger.info('Cancelling booking', { bookingId, scenario });

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  if (booking.status === 'CANCELLED') {
    throw new ValidationError('Booking is already cancelled');
  }

  let journal;
  const depositAmount = parseFloat(booking.depositAmount);

  if (scenario === 'DEPOSIT_KEPT') {
    // Case 1: Deposit kept as revenue
    const gstAmount = depositAmount - depositAmount / 1.1;
    const depositExGST = depositAmount / 1.1;

    const journalLines = [
      {
        accountId: accountIds.customerDepositsHeldAccountId,
        debit: depositAmount.toFixed(4),
        credit: '0',
        memo: `Release deposit (kept) - Booking ${booking.externalBookingId}`,
      },
      {
        accountId: accountIds.marginRevenueAccountId,
        debit: '0',
        credit: depositExGST.toFixed(4),
        memo: `Cancellation fee revenue - Booking ${booking.externalBookingId}`,
      },
      {
        accountId: accountIds.gstOnIncomeAccountId,
        debit: '0',
        credit: gstAmount.toFixed(4),
        memo: `GST on cancellation fee - Booking ${booking.externalBookingId}`,
      },
    ];

    journal = await postJournalEntry({
      entityId: booking.entityId,
      date,
      description: `Booking cancelled - deposit kept as cancellation fee ${booking.externalBookingId}`,
      sourceSystem: 'EZYCRANE_APP',
      sourceReference: booking.externalBookingId,
      lines: journalLines,
    });
  } else if (scenario === 'DEPOSIT_REFUNDED') {
    // Case 2: Deposit refunded to customer
    const journalLines = [
      {
        accountId: accountIds.customerDepositsHeldAccountId,
        debit: depositAmount.toFixed(4),
        credit: '0',
        memo: `Release deposit (refunded) - Booking ${booking.externalBookingId}`,
      },
      {
        accountId: accountIds.bankAccountId,
        debit: '0',
        credit: depositAmount.toFixed(4),
        memo: `Refund to customer - Booking ${booking.externalBookingId}`,
      },
    ];

    journal = await postJournalEntry({
      entityId: booking.entityId,
      date,
      description: `Booking cancelled - deposit refunded ${booking.externalBookingId}`,
      sourceSystem: 'EZYCRANE_APP',
      sourceReference: booking.externalBookingId,
      lines: journalLines,
    });
  } else if (scenario === 'TRANSFER_TO_NEW_SUPPLIER') {
    // Case 3: Deposit transferred to new supplier (no P&L impact)
    if (!newSupplierId) {
      throw new ValidationError('New supplier ID required for transfer scenario');
    }

    // This is more of a memo entry - deposit stays in liability account
    // Just update the booking record with new supplier
    journal = await postJournalEntry({
      entityId: booking.entityId,
      date,
      description: `Booking supplier changed - deposit transferred ${booking.externalBookingId}`,
      sourceSystem: 'EZYCRANE_APP',
      sourceReference: booking.externalBookingId,
      lines: [
        {
          accountId: accountIds.customerDepositsHeldAccountId,
          debit: depositAmount.toFixed(4),
          credit: '0',
          memo: `Transfer from old supplier - Booking ${booking.externalBookingId}`,
        },
        {
          accountId: accountIds.customerDepositsHeldAccountId,
          debit: '0',
          credit: depositAmount.toFixed(4),
          memo: `Transfer to new supplier - Booking ${booking.externalBookingId}`,
        },
      ],
    });

    // Update supplier
    await db
      .update(bookings)
      .set({
        supplierId: newSupplierId,
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }

  // Create booking event
  await db.insert(bookingEvents).values({
    bookingId,
    type: 'CANCEL',
    amount: booking.depositAmount,
    journalEntryId: journal!.entry.id,
    metadata: JSON.stringify({ scenario, newSupplierId }),
  });

  // Update booking status
  if (scenario !== 'TRANSFER_TO_NEW_SUPPLIER') {
    await db
      .update(bookings)
      .set({
        status: 'CANCELLED',
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, bookingId));
  }

  logger.info('Booking cancelled', { bookingId, scenario, journalEntryId: journal!.entry.id });
  return { booking, journal };
}

/**
 * Record refund to customer
 * Journal: DR Customer Deposits Held (or AR), CR Bank
 */
export async function recordRefund(
  bookingId: string,
  amount: string | number,
  date: string,
  accountIds: BookingAccountIds,
  refundFromDeposit: boolean = true
) {
  logger.info('Recording refund', { bookingId, amount });

  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  const refundAmount = parseFloat(amount.toString());
  const sourceAccountId = refundFromDeposit
    ? accountIds.customerDepositsHeldAccountId
    : accountIds.accountsReceivableAccountId;

  const journalLines = [
    {
      accountId: sourceAccountId,
      debit: refundAmount.toFixed(4),
      credit: '0',
      memo: `Refund issued - Booking ${booking.externalBookingId}`,
    },
    {
      accountId: accountIds.bankAccountId,
      debit: '0',
      credit: refundAmount.toFixed(4),
      memo: `Refund to customer - Booking ${booking.externalBookingId}`,
    },
  ];

  // Post journal entry
  const journal = await postJournalEntry({
    entityId: booking.entityId,
    date,
    description: `Refund issued for booking ${booking.externalBookingId}`,
    sourceSystem: 'EZYCRANE_APP',
    sourceReference: booking.externalBookingId,
    lines: journalLines,
  });

  // Create booking event
  await db.insert(bookingEvents).values({
    bookingId,
    type: 'REFUND',
    amount: amount.toString(),
    journalEntryId: journal.entry.id,
    metadata: JSON.stringify({ refundFromDeposit }),
  });

  logger.info('Refund recorded', { bookingId, journalEntryId: journal.entry.id });
  return { booking, journal };
}

/**
 * Get booking by ID with events
 */
export async function getBooking(bookingId: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, bookingId));

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  const events = await db
    .select()
    .from(bookingEvents)
    .where(eq(bookingEvents.bookingId, bookingId));

  return { booking, events };
}

/**
 * Get booking by external booking ID
 */
export async function getBookingByExternalId(entityId: string, externalBookingId: string) {
  const [booking] = await db
    .select()
    .from(bookings)
    .where(
      and(eq(bookings.entityId, entityId), eq(bookings.externalBookingId, externalBookingId))
    );

  if (!booking) {
    throw new NotFoundError('Booking');
  }

  const events = await db
    .select()
    .from(bookingEvents)
    .where(eq(bookingEvents.bookingId, booking.id));

  return { booking, events };
}
