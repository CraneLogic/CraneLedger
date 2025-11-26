import { Router, type Router as RouterType } from 'express';
import { getTrialBalance, getProfitAndLoss, getBalanceSheet, getBookingSummary, getOutstandingDeposits, getUpcomingPayouts, getMarginReport } from '../modules/reports/service.js';

const router: RouterType = Router();

// Get trial balance
router.get('/:entityId/trial-balance', async (req, res, next) => {
  try {
    const asOf = req.query.asOf as string;
    if (!asOf) {
      return res.status(400).json({ error: 'asOf query parameter is required (YYYY-MM-DD)' });
    }
    const report = await getTrialBalance(req.params.entityId, asOf);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

// Get profit and loss
router.get('/:entityId/pnl', async (req, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query parameters are required (YYYY-MM-DD)' });
    }
    const report = await getProfitAndLoss(req.params.entityId, from, to);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

// Get balance sheet
router.get('/:entityId/balance-sheet', async (req, res, next) => {
  try {
    const asOf = req.query.asOf as string;
    if (!asOf) {
      return res.status(400).json({ error: 'asOf query parameter is required (YYYY-MM-DD)' });
    }
    const report = await getBalanceSheet(req.params.entityId, asOf);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

// Get booking summary
router.get('/:entityId/booking-summary', async (req, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query parameters are required (YYYY-MM-DD)' });
    }
    const report = await getBookingSummary(req.params.entityId, from, to);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

// Get outstanding deposits
router.get('/:entityId/outstanding-deposits', async (req, res, next) => {
  try {
    const deposits = await getOutstandingDeposits(req.params.entityId);
    return res.json(deposits);
  } catch (error) {
    return next(error);
  }
});

// Get upcoming payouts
router.get('/:entityId/upcoming-payouts', async (req, res, next) => {
  try {
    const payouts = await getUpcomingPayouts(req.params.entityId);
    return res.json(payouts);
  } catch (error) {
    return next(error);
  }
});

// Get margin report
router.get('/:entityId/margin-report', async (req, res, next) => {
  try {
    const from = req.query.from as string;
    const to = req.query.to as string;
    if (!from || !to) {
      return res.status(400).json({ error: 'from and to query parameters are required (YYYY-MM-DD)' });
    }
    const report = await getMarginReport(req.params.entityId, from, to);
    return res.json(report);
  } catch (error) {
    return next(error);
  }
});

export default router;
