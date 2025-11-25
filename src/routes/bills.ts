import { Router } from 'express';
import { createBill, getBill, postBill, recordBillPayment } from '../modules/bills/service.js';

const router = Router();

// Create bill
router.post('/:entityId/bills', async (req, res, next) => {
  try {
    const bill = await createBill({
      ...req.body,
      entityId: req.params.entityId,
    });
    res.status(201).json(bill);
  } catch (error) {
    next(error);
  }
});

// Get bill
router.get('/:entityId/bills/:id', async (req, res, next) => {
  try {
    const bill = await getBill(req.params.id);
    res.json(bill);
  } catch (error) {
    next(error);
  }
});

// Post bill to ledger
router.post('/:entityId/bills/:id/post', async (req, res, next) => {
  try {
    const { payableAccountId, expenseAccountId, taxAssetAccountId } = req.body;
    const result = await postBill(
      req.params.id,
      payableAccountId,
      expenseAccountId,
      taxAssetAccountId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Record payment against bill
router.post('/:entityId/bills/:id/payments', async (req, res, next) => {
  try {
    const result = await recordBillPayment(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
