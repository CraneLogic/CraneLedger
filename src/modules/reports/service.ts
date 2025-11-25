import { eq, and, lte, gte, between, sql } from 'drizzle-orm';
import { db, accounts, journalLines, journalEntries } from '../../db/index.js';
import { logger } from '../../utils/logger.js';
import * as decimal from '../../utils/decimal.js';

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: string;
  credit: string;
  balance: string;
}

export interface TrialBalanceReport {
  entityId: string;
  asOf: string;
  accounts: TrialBalanceRow[];
  totalDebits: string;
  totalCredits: string;
  isBalanced: boolean;
}

export async function getTrialBalance(
  entityId: string,
  asOf: string
): Promise<TrialBalanceReport> {
  logger.info('Generating trial balance', { entityId, asOf });

  // Get all accounts for the entity
  const entityAccounts = await db
    .select()
    .from(accounts)
    .where(eq(accounts.entityId, entityId));

  const trialBalanceRows: TrialBalanceRow[] = [];
  let totalDebits = '0.0000';
  let totalCredits = '0.0000';

  for (const account of entityAccounts) {
    // Get all journal lines for this account up to the asOf date
    const lines = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.accountId, account.id),
          eq(journalEntries.status, 'POSTED'),
          lte(journalEntries.date, asOf)
        )
      );

    let accountDebit = '0.0000';
    let accountCredit = '0.0000';

    for (const line of lines) {
      accountDebit = decimal.add(accountDebit, line.debit);
      accountCredit = decimal.add(accountCredit, line.credit);
    }

    const balance = decimal.subtract(accountDebit, accountCredit);

    // Only include accounts with activity
    if (!decimal.isZero(accountDebit) || !decimal.isZero(accountCredit)) {
      trialBalanceRows.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        debit: accountDebit,
        credit: accountCredit,
        balance,
      });

      totalDebits = decimal.add(totalDebits, accountDebit);
      totalCredits = decimal.add(totalCredits, accountCredit);
    }
  }

  const isBalanced = decimal.isEqual(totalDebits, totalCredits);

  logger.info('Trial balance generated', { 
    entityId, 
    accountCount: trialBalanceRows.length,
    isBalanced 
  });

  return {
    entityId,
    asOf,
    accounts: trialBalanceRows,
    totalDebits,
    totalCredits,
    isBalanced,
  };
}

export interface ProfitAndLossRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: 'REVENUE' | 'EXPENSE';
  amount: string;
}

export interface ProfitAndLossReport {
  entityId: string;
  from: string;
  to: string;
  revenue: ProfitAndLossRow[];
  expenses: ProfitAndLossRow[];
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
}

export async function getProfitAndLoss(
  entityId: string,
  from: string,
  to: string
): Promise<ProfitAndLossReport> {
  logger.info('Generating P&L report', { entityId, from, to });

  // Get revenue and expense accounts
  const entityAccounts = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.entityId, entityId),
        sql`${accounts.type} IN ('REVENUE', 'EXPENSE')`
      )
    );

  const revenueRows: ProfitAndLossRow[] = [];
  const expenseRows: ProfitAndLossRow[] = [];
  let totalRevenue = '0.0000';
  let totalExpenses = '0.0000';

  for (const account of entityAccounts) {
    // Get journal lines for this account in the date range
    const lines = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.accountId, account.id),
          eq(journalEntries.status, 'POSTED'),
          between(journalEntries.date, from, to)
        )
      );

    let accountDebit = '0.0000';
    let accountCredit = '0.0000';

    for (const line of lines) {
      accountDebit = decimal.add(accountDebit, line.debit);
      accountCredit = decimal.add(accountCredit, line.credit);
    }

    // For revenue: credit balance is positive
    // For expenses: debit balance is positive
    const amount = decimal.subtract(accountCredit, accountDebit);

    if (!decimal.isZero(amount)) {
      const row: ProfitAndLossRow = {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type as 'REVENUE' | 'EXPENSE',
        amount,
      };

      if (account.type === 'REVENUE') {
        revenueRows.push(row);
        totalRevenue = decimal.add(totalRevenue, amount);
      } else if (account.type === 'EXPENSE') {
        expenseRows.push(row);
        totalExpenses = decimal.add(totalExpenses, decimal.multiply(amount, -1)); // Expenses are negative
      }
    }
  }

  const netProfit = decimal.subtract(totalRevenue, totalExpenses);

  logger.info('P&L report generated', { entityId, netProfit });

  return {
    entityId,
    from,
    to,
    revenue: revenueRows,
    expenses: expenseRows,
    totalRevenue,
    totalExpenses,
    netProfit,
  };
}

export interface BalanceSheetRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: 'ASSET' | 'LIABILITY' | 'EQUITY';
  balance: string;
}

export interface BalanceSheetReport {
  entityId: string;
  asOf: string;
  assets: BalanceSheetRow[];
  liabilities: BalanceSheetRow[];
  equity: BalanceSheetRow[];
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  isBalanced: boolean;
}

export async function getBalanceSheet(
  entityId: string,
  asOf: string
): Promise<BalanceSheetReport> {
  logger.info('Generating balance sheet', { entityId, asOf });

  // Get asset, liability, and equity accounts
  const entityAccounts = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.entityId, entityId),
        sql`${accounts.type} IN ('ASSET', 'LIABILITY', 'EQUITY')`
      )
    );

  const assetRows: BalanceSheetRow[] = [];
  const liabilityRows: BalanceSheetRow[] = [];
  const equityRows: BalanceSheetRow[] = [];
  let totalAssets = '0.0000';
  let totalLiabilities = '0.0000';
  let totalEquity = '0.0000';

  for (const account of entityAccounts) {
    // Get all journal lines for this account up to the asOf date
    const lines = await db
      .select({
        debit: journalLines.debit,
        credit: journalLines.credit,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalLines.accountId, account.id),
          eq(journalEntries.status, 'POSTED'),
          lte(journalEntries.date, asOf)
        )
      );

    let accountDebit = '0.0000';
    let accountCredit = '0.0000';

    for (const line of lines) {
      accountDebit = decimal.add(accountDebit, line.debit);
      accountCredit = decimal.add(accountCredit, line.credit);
    }

    // Assets: debit balance is positive
    // Liabilities & Equity: credit balance is positive
    const balance = decimal.subtract(accountDebit, accountCredit);

    if (!decimal.isZero(balance)) {
      const row: BalanceSheetRow = {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type as 'ASSET' | 'LIABILITY' | 'EQUITY',
        balance,
      };

      if (account.type === 'ASSET') {
        assetRows.push(row);
        totalAssets = decimal.add(totalAssets, balance);
      } else if (account.type === 'LIABILITY') {
        liabilityRows.push(row);
        totalLiabilities = decimal.add(totalLiabilities, decimal.multiply(balance, -1)); // Liabilities are credit balance
      } else if (account.type === 'EQUITY') {
        equityRows.push(row);
        totalEquity = decimal.add(totalEquity, decimal.multiply(balance, -1)); // Equity is credit balance
      }
    }
  }

  // Assets = Liabilities + Equity
  const liabilitiesAndEquity = decimal.add(totalLiabilities, totalEquity);
  const isBalanced = decimal.isEqual(totalAssets, liabilitiesAndEquity);

  logger.info('Balance sheet generated', { entityId, isBalanced });

  return {
    entityId,
    asOf,
    assets: assetRows,
    liabilities: liabilityRows,
    equity: equityRows,
    totalAssets,
    totalLiabilities,
    totalEquity,
    isBalanced,
  };
}

/**
 * Booking-specific reports
 */

import { bookings, bookingEvents } from '../../db/index.js';
import { and, gte, lte, inArray } from 'drizzle-orm';

export interface BookingSummary {
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: string;
  totalMargin: string;
  totalSupplierPayouts: string;
  outstandingDeposits: string;
}

export interface OutstandingDeposit {
  bookingId: string;
  externalBookingId: string;
  customerName: string;
  depositAmount: string;
  status: string;
  createdAt: Date;
}

export interface UpcomingPayout {
  bookingId: string;
  externalBookingId: string;
  supplierName: string;
  payoutAmount: string;
  status: string;
}

/**
 * Get booking financial summary for a date range
 */
export async function getBookingSummary(
  entityId: string,
  from: string,
  to: string
): Promise<BookingSummary> {
  logger.info('Generating booking summary', { entityId, from, to });

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Get all bookings in date range
  const entityBookings = await db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.entityId, entityId),
        gte(bookings.createdAt, fromDate),
        lte(bookings.createdAt, toDate)
      )
    );

  const summary: BookingSummary = {
    totalBookings: entityBookings.length,
    confirmedBookings: entityBookings.filter((b) => b.status === 'CONFIRMED').length,
    completedBookings: entityBookings.filter((b) => b.status === 'COMPLETED').length,
    cancelledBookings: entityBookings.filter((b) => b.status === 'CANCELLED').length,
    totalRevenue: '0.0000',
    totalMargin: '0.0000',
    totalSupplierPayouts: '0.0000',
    outstandingDeposits: '0.0000',
  };

  // Calculate totals
  for (const booking of entityBookings) {
    const totalJob = parseFloat(booking.totalJobAmount);
    const margin = parseFloat(booking.marginAmount);
    const payout = parseFloat(booking.supplierPayoutAmount);
    const deposit = parseFloat(booking.depositAmount);

    if (booking.status === 'COMPLETED') {
      summary.totalRevenue = decimal.add(summary.totalRevenue, totalJob.toFixed(4));
      summary.totalMargin = decimal.add(summary.totalMargin, margin.toFixed(4));
    }

    summary.totalSupplierPayouts = decimal.add(summary.totalSupplierPayouts, payout.toFixed(4));

    // Outstanding deposits are for CONFIRMED bookings (not yet completed)
    if (booking.status === 'CONFIRMED' && deposit > 0) {
      summary.outstandingDeposits = decimal.add(summary.outstandingDeposits, deposit.toFixed(4));
    }
  }

  return summary;
}

/**
 * Get outstanding deposit liabilities
 */
export async function getOutstandingDeposits(entityId: string): Promise<OutstandingDeposit[]> {
  logger.info('Getting outstanding deposits', { entityId });

  // Get all confirmed bookings with deposits
  const confirmedBookings = await db
    .select({
      bookingId: bookings.id,
      externalBookingId: bookings.externalBookingId,
      customerId: bookings.customerId,
      depositAmount: bookings.depositAmount,
      status: bookings.status,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .where(and(eq(bookings.entityId, entityId), eq(bookings.status, 'CONFIRMED')));

  const result: OutstandingDeposit[] = [];

  for (const booking of confirmedBookings) {
    // Get customer name
    const [customer] = await db
      .select({ name: contacts.name })
      .from(contacts)
      .where(eq(contacts.id, booking.customerId));

    result.push({
      bookingId: booking.bookingId,
      externalBookingId: booking.externalBookingId,
      customerName: customer?.name || 'Unknown',
      depositAmount: booking.depositAmount,
      status: booking.status,
      createdAt: booking.createdAt,
    });
  }

  return result;
}

/**
 * Get upcoming supplier payouts
 */
export async function getUpcomingPayouts(entityId: string): Promise<UpcomingPayout[]> {
  logger.info('Getting upcoming payouts', { entityId });

  // Get all confirmed/completed bookings that haven't been paid out yet
  const unpaidBookings = await db
    .select({
      bookingId: bookings.id,
      externalBookingId: bookings.externalBookingId,
      supplierId: bookings.supplierId,
      supplierPayoutAmount: bookings.supplierPayoutAmount,
      status: bookings.status,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.entityId, entityId),
        inArray(bookings.status, ['CONFIRMED', 'COMPLETED'])
      )
    );

  const result: UpcomingPayout[] = [];

  for (const booking of unpaidBookings) {
    if (!booking.supplierId) continue;

    // Check if payout has been recorded
    const [payoutEvent] = await db
      .select()
      .from(bookingEvents)
      .where(and(eq(bookingEvents.bookingId, booking.bookingId), eq(bookingEvents.type, 'PAYOUT')));

    // Only include if no payout event exists
    if (!payoutEvent) {
      // Get supplier name
      const [supplier] = await db
        .select({ name: contacts.name })
        .from(contacts)
        .where(eq(contacts.id, booking.supplierId));

      result.push({
        bookingId: booking.bookingId,
        externalBookingId: booking.externalBookingId,
        supplierName: supplier?.name || 'Unknown',
        payoutAmount: booking.supplierPayoutAmount,
        status: booking.status,
      });
    }
  }

  return result;
}

/**
 * Get margin earned over a date range
 */
export async function getMarginReport(
  entityId: string,
  from: string,
  to: string
): Promise<{ totalMargin: string; bookingCount: number; averageMargin: string }> {
  logger.info('Generating margin report', { entityId, from, to });

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Get all completed bookings in date range
  const completedBookings = await db
    .select({
      marginAmount: bookings.marginAmount,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.entityId, entityId),
        eq(bookings.status, 'COMPLETED'),
        gte(bookings.updatedAt, fromDate),
        lte(bookings.updatedAt, toDate)
      )
    );

  let totalMargin = '0.0000';

  for (const booking of completedBookings) {
    totalMargin = decimal.add(totalMargin, booking.marginAmount);
  }

  const bookingCount = completedBookings.length;
  const averageMargin =
    bookingCount > 0 ? (parseFloat(totalMargin) / bookingCount).toFixed(4) : '0.0000';

  return {
    totalMargin,
    bookingCount,
    averageMargin,
  };
}
