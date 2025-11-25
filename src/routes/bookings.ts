import { Router, Request, Response } from 'express';
import * as bookingService from '../modules/bookings/service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /bookings
 * Create or register a booking
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const booking = await bookingService.createBooking(req.body);
    res.status(201).json(booking);
  } catch (error: any) {
    logger.error('Error creating booking', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * POST /bookings/:id/deposit
 * Record deposit received from customer
 */
router.post('/:id/deposit', async (req: Request, res: Response) => {
  try {
    const { amount, date, accountIds, includeGST = true } = req.body;

    if (!amount || !date || !accountIds) {
      return res.status(400).json({
        error: 'Missing required fields: amount, date, accountIds',
      });
    }

    const result = await bookingService.recordDeposit(
      req.params.id,
      amount,
      date,
      accountIds,
      includeGST
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error recording deposit', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * POST /bookings/:id/balance
 * Record balance payment from customer
 */
router.post('/:id/balance', async (req: Request, res: Response) => {
  try {
    const { amount, date, accountIds, includeGST = true } = req.body;

    if (!amount || !date || !accountIds) {
      return res.status(400).json({
        error: 'Missing required fields: amount, date, accountIds',
      });
    }

    const result = await bookingService.recordBalance(
      req.params.id,
      amount,
      date,
      accountIds,
      includeGST
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error recording balance', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * POST /bookings/:id/payout
 * Record supplier payout
 */
router.post('/:id/payout', async (req: Request, res: Response) => {
  try {
    const { amount, date, accountIds } = req.body;

    if (!amount || !date || !accountIds) {
      return res.status(400).json({
        error: 'Missing required fields: amount, date, accountIds',
      });
    }

    const result = await bookingService.recordSupplierPayout(
      req.params.id,
      amount,
      date,
      accountIds
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error recording payout', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * POST /bookings/:id/margin
 * Recognize marketplace margin revenue
 */
router.post('/:id/margin', async (req: Request, res: Response) => {
  try {
    const { marginAmount, date, accountIds, includeGST = true } = req.body;

    if (!marginAmount || !date || !accountIds) {
      return res.status(400).json({
        error: 'Missing required fields: marginAmount, date, accountIds',
      });
    }

    const result = await bookingService.recognizeMargin(
      req.params.id,
      marginAmount,
      date,
      accountIds,
      includeGST
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error recognizing margin', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * POST /bookings/:id/cancel
 * Cancel a booking with different scenarios
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { date, accountIds, scenario, newSupplierId } = req.body;

    if (!date || !accountIds || !scenario) {
      return res.status(400).json({
        error: 'Missing required fields: date, accountIds, scenario',
      });
    }

    if (!['DEPOSIT_KEPT', 'DEPOSIT_REFUNDED', 'TRANSFER_TO_NEW_SUPPLIER'].includes(scenario)) {
      return res.status(400).json({
        error:
          'Invalid scenario. Must be one of: DEPOSIT_KEPT, DEPOSIT_REFUNDED, TRANSFER_TO_NEW_SUPPLIER',
      });
    }

    const result = await bookingService.cancelBooking(
      req.params.id,
      date,
      accountIds,
      scenario,
      newSupplierId
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error cancelling booking', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * POST /bookings/:id/refund
 * Record refund to customer
 */
router.post('/:id/refund', async (req: Request, res: Response) => {
  try {
    const { amount, date, accountIds, refundFromDeposit = true } = req.body;

    if (!amount || !date || !accountIds) {
      return res.status(400).json({
        error: 'Missing required fields: amount, date, accountIds',
      });
    }

    const result = await bookingService.recordRefund(
      req.params.id,
      amount,
      date,
      accountIds,
      refundFromDeposit
    );

    res.json(result);
  } catch (error: any) {
    logger.error('Error recording refund', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * GET /bookings/:id
 * Get booking by ID with events
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await bookingService.getBooking(req.params.id);
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching booking', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

/**
 * GET /bookings/external/:entityId/:externalBookingId
 * Get booking by external booking ID
 */
router.get('/external/:entityId/:externalBookingId', async (req: Request, res: Response) => {
  try {
    const result = await bookingService.getBookingByExternalId(
      req.params.entityId,
      req.params.externalBookingId
    );
    res.json(result);
  } catch (error: any) {
    logger.error('Error fetching booking by external ID', { error: error.message });
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

export default router;
