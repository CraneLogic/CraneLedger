import { Router, type Router as RouterType } from 'express';
import { createInvoice, getInvoice, postInvoice, recordInvoicePayment } from '../modules/invoices/service.js';

const router: RouterType = Router();

// Create invoice
router.post('/:entityId/invoices', async (req, res, next) => {
  try {
    const invoice = await createInvoice({
      ...req.body,
      entityId: req.params.entityId,
    });
    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

// Get invoice
router.get('/:entityId/invoices/:id', async (req, res, next) => {
  try {
    const invoice = await getInvoice(req.params.id);
    res.json(invoice);
  } catch (error) {
    next(error);
  }
});

// Post invoice to ledger
router.post('/:entityId/invoices/:id/post', async (req, res, next) => {
  try {
    const { receivableAccountId, revenueAccountId, taxLiabilityAccountId } = req.body;
    const result = await postInvoice(
      req.params.id,
      receivableAccountId,
      revenueAccountId,
      taxLiabilityAccountId
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Record payment against invoice
router.post('/:entityId/invoices/:id/payments', async (req, res, next) => {
  try {
    const result = await recordInvoicePayment(req.params.id, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
