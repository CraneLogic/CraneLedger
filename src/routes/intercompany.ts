import { Router } from 'express';
import { createLoanTransfer } from '../modules/intercompany/service.js';

const router = Router();

// Create intercompany loan transfer
router.post('/loan-transfer', async (req, res, next) => {
  try {
    const result = await createLoanTransfer(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
