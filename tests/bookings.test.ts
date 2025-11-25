import { describe, it, expect, beforeAll } from 'vitest';
import * as bookingService from '../src/modules/bookings/service.js';
import * as entityService from '../src/modules/entities/service.js';
import * as accountService from '../src/modules/accounts/service.js';

describe('Booking Workflows', () => {
  let entityId: string;
  let accountIds: bookingService.BookingAccountIds;

  beforeAll(async () => {
    // Create test entity
    const entity = await entityService.createEntity({
      name: 'EzyCrane Test Entity',
      legalIdentifier: 'ABN 12345678901',
      currencyCode: 'AUD',
    });
    entityId = entity.id;

    // Create required accounts
    const bankAccount = await accountService.createAccount({
      entityId,
      code: '110',
      name: 'Bank / Clearing',
      type: 'ASSET',
      isBankAccount: true,
    });

    const depositsHeldAccount = await accountService.createAccount({
      entityId,
      code: '800',
      name: 'Customer Deposits Held',
      type: 'LIABILITY',
    });

    const accountsReceivableAccount = await accountService.createAccount({
      entityId,
      code: '112',
      name: 'Accounts Receivable',
      type: 'ASSET',
    });

    const marginRevenueAccount = await accountService.createAccount({
      entityId,
      code: '201',
      name: 'Marketplace Margin Revenue',
      type: 'REVENUE',
    });

    const supplierPayoutsAccount = await accountService.createAccount({
      entityId,
      code: '300',
      name: 'Supplier Payouts (COGS)',
      type: 'EXPENSE',
    });

    const gstOnIncomeAccount = await accountService.createAccount({
      entityId,
      code: '210',
      name: 'GST on Income',
      type: 'LIABILITY',
    });

    accountIds = {
      bankAccountId: bankAccount.id,
      customerDepositsHeldAccountId: depositsHeldAccount.id,
      accountsReceivableAccountId: accountsReceivableAccount.id,
      marginRevenueAccountId: marginRevenueAccount.id,
      supplierPayoutsAccountId: supplierPayoutsAccount.id,
      gstOnIncomeAccountId: gstOnIncomeAccount.id,
    };
  });

  describe('Create Booking', () => {
    it('should create a booking with customer and supplier', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-001',
        entityId,
        customerName: 'ABC Construction',
        customerEmail: 'accounts@abc.com.au',
        supplierName: 'Crane Hire Co',
        supplierEmail: 'accounts@cranehire.com.au',
        totalJobAmount: 1100.0,
        depositAmount: 330.0,
        marginAmount: 300.0,
      });

      expect(booking).toBeDefined();
      expect(booking.externalBookingId).toBe('BOOKING-TEST-001');
      expect(booking.status).toBe('PENDING');
      expect(booking.totalJobAmount).toBe('1100');
    });

    it('should reject duplicate external booking ID', async () => {
      await expect(
        bookingService.createBooking({
          externalBookingId: 'BOOKING-TEST-001',
          entityId,
          customerName: 'ABC Construction',
          totalJobAmount: 1100.0,
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('Record Deposit', () => {
    it('should record deposit with correct journal entries', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-002',
        entityId,
        customerName: 'XYZ Builders',
        totalJobAmount: 1100.0,
      });

      const result = await bookingService.recordDeposit(
        booking.id,
        330.0,
        '2024-11-24',
        accountIds,
        true
      );

      expect(result.booking).toBeDefined();
      expect(result.journal).toBeDefined();
      expect(result.journal.entry.sourceSystem).toBe('EZYCRANE_APP');

      // Check journal lines
      const lines = result.journal.lines;
      expect(lines.length).toBe(3); // Bank, Deposits Held, GST

      // Verify debits = credits
      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      expect(totalDebits).toBeCloseTo(totalCredits, 2);

      // Verify GST calculation (10%)
      const gstLine = lines.find((l) => l.accountId === accountIds.gstOnIncomeAccountId);
      expect(gstLine).toBeDefined();
      expect(parseFloat(gstLine!.credit)).toBeCloseTo(30.0, 2); // 330 - 330/1.1 = 30
    });

    it('should update booking status to CONFIRMED', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-003',
        entityId,
        customerName: 'DEF Construction',
        totalJobAmount: 1100.0,
      });

      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      const updated = await bookingService.getBooking(booking.id);
      expect(updated.booking.status).toBe('CONFIRMED');
      expect(updated.booking.depositAmount).toBe('330');
    });
  });

  describe('Record Balance Payment', () => {
    it('should record balance payment with correct journal entries', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-004',
        entityId,
        customerName: 'GHI Builders',
        totalJobAmount: 1100.0,
      });

      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      const result = await bookingService.recordBalance(
        booking.id,
        770.0,
        '2024-11-25',
        accountIds,
        true
      );

      expect(result.journal).toBeDefined();

      // Check journal lines
      const lines = result.journal.lines;
      expect(lines.length).toBe(3); // Bank, AR, GST

      // Verify debits = credits
      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      expect(totalDebits).toBeCloseTo(totalCredits, 2);
    });
  });

  describe('Record Supplier Payout', () => {
    it('should record supplier payout with correct journal entries', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-005',
        entityId,
        customerName: 'JKL Construction',
        supplierName: 'Crane Supplier Ltd',
        totalJobAmount: 1100.0,
      });

      const result = await bookingService.recordSupplierPayout(
        booking.id,
        800.0,
        '2024-11-26',
        accountIds
      );

      expect(result.journal).toBeDefined();

      // Check journal lines
      const lines = result.journal.lines;
      expect(lines.length).toBe(2); // Supplier Payouts (DR), Bank (CR)

      // Verify debits = credits
      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      expect(totalDebits).toBeCloseTo(totalCredits, 2);

      // Verify correct accounts
      const debitLine = lines.find((l) => parseFloat(l.debit) > 0);
      const creditLine = lines.find((l) => parseFloat(l.credit) > 0);
      expect(debitLine?.accountId).toBe(accountIds.supplierPayoutsAccountId);
      expect(creditLine?.accountId).toBe(accountIds.bankAccountId);
    });

    it('should reject payout for booking without supplier', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-006',
        entityId,
        customerName: 'MNO Construction',
        totalJobAmount: 1100.0,
      });

      await expect(
        bookingService.recordSupplierPayout(booking.id, 800.0, '2024-11-26', accountIds)
      ).rejects.toThrow('does not have a supplier');
    });
  });

  describe('Recognize Margin', () => {
    it('should recognize margin revenue with correct journal entries', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-007',
        entityId,
        customerName: 'PQR Builders',
        totalJobAmount: 1100.0,
      });

      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      const result = await bookingService.recognizeMargin(
        booking.id,
        300.0,
        '2024-11-27',
        accountIds,
        true
      );

      expect(result.journal).toBeDefined();

      // Check journal lines
      const lines = result.journal.lines;
      expect(lines.length).toBe(3); // Deposits Held (DR), Margin Revenue (CR), GST (CR)

      // Verify debits = credits
      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      expect(totalDebits).toBeCloseTo(totalCredits, 2);

      // Verify booking status updated to COMPLETED
      const updated = await bookingService.getBooking(booking.id);
      expect(updated.booking.status).toBe('COMPLETED');
      expect(updated.booking.marginAmount).toBe('300');
    });
  });

  describe('Cancel Booking', () => {
    it('should cancel booking with deposit kept', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-008',
        entityId,
        customerName: 'STU Construction',
        totalJobAmount: 1100.0,
      });

      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      const result = await bookingService.cancelBooking(
        booking.id,
        '2024-11-28',
        accountIds,
        'DEPOSIT_KEPT'
      );

      expect(result.journal).toBeDefined();

      // Check journal lines
      const lines = result.journal!.lines;
      expect(lines.length).toBe(3); // Deposits Held (DR), Revenue (CR), GST (CR)

      // Verify booking status
      const updated = await bookingService.getBooking(booking.id);
      expect(updated.booking.status).toBe('CANCELLED');
    });

    it('should cancel booking with deposit refunded', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-009',
        entityId,
        customerName: 'VWX Builders',
        totalJobAmount: 1100.0,
      });

      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      const result = await bookingService.cancelBooking(
        booking.id,
        '2024-11-28',
        accountIds,
        'DEPOSIT_REFUNDED'
      );

      expect(result.journal).toBeDefined();

      // Check journal lines
      const lines = result.journal!.lines;
      expect(lines.length).toBe(2); // Deposits Held (DR), Bank (CR)

      // Verify debits = credits
      const totalDebits = lines.reduce((sum, line) => sum + parseFloat(line.debit), 0);
      const totalCredits = lines.reduce((sum, line) => sum + parseFloat(line.credit), 0);
      expect(totalDebits).toBeCloseTo(totalCredits, 2);
    });
  });

  describe('Record Refund', () => {
    it('should record refund from deposit', async () => {
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-010',
        entityId,
        customerName: 'YZA Construction',
        totalJobAmount: 1100.0,
      });

      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      const result = await bookingService.recordRefund(
        booking.id,
        330.0,
        '2024-11-29',
        accountIds,
        true
      );

      expect(result.journal).toBeDefined();

      // Check journal lines
      const lines = result.journal.lines;
      expect(lines.length).toBe(2); // Deposits Held (DR), Bank (CR)

      // Verify correct accounts
      const debitLine = lines.find((l) => parseFloat(l.debit) > 0);
      const creditLine = lines.find((l) => parseFloat(l.credit) > 0);
      expect(debitLine?.accountId).toBe(accountIds.customerDepositsHeldAccountId);
      expect(creditLine?.accountId).toBe(accountIds.bankAccountId);
    });
  });

  describe('Complete Booking Workflow', () => {
    it('should handle complete booking lifecycle', async () => {
      // 1. Create booking
      const booking = await bookingService.createBooking({
        externalBookingId: 'BOOKING-TEST-COMPLETE',
        entityId,
        customerName: 'Complete Test Customer',
        supplierName: 'Complete Test Supplier',
        totalJobAmount: 1100.0,
        marginAmount: 300.0,
      });

      expect(booking.status).toBe('PENDING');

      // 2. Record deposit
      await bookingService.recordDeposit(booking.id, 330.0, '2024-11-24', accountIds, true);

      let updated = await bookingService.getBooking(booking.id);
      expect(updated.booking.status).toBe('CONFIRMED');
      expect(updated.events.length).toBe(1);
      expect(updated.events[0].type).toBe('DEPOSIT');

      // 3. Record balance
      await bookingService.recordBalance(booking.id, 770.0, '2024-11-25', accountIds, true);

      updated = await bookingService.getBooking(booking.id);
      expect(updated.events.length).toBe(2);

      // 4. Record supplier payout
      await bookingService.recordSupplierPayout(booking.id, 800.0, '2024-11-26', accountIds);

      updated = await bookingService.getBooking(booking.id);
      expect(updated.events.length).toBe(3);

      // 5. Recognize margin
      await bookingService.recognizeMargin(booking.id, 300.0, '2024-11-27', accountIds, true);

      updated = await bookingService.getBooking(booking.id);
      expect(updated.booking.status).toBe('COMPLETED');
      expect(updated.events.length).toBe(4);

      // Verify all events are linked to journal entries
      for (const event of updated.events) {
        expect(event.journalEntryId).toBeDefined();
      }
    });
  });
});
