import { Router, type Router as RouterType } from 'express';
import { postJournalEntry, reverseJournalEntry, getJournalEntry } from '../modules/journals/service.js';

const router: RouterType = Router();

// Post journal entry
router.post('/:entityId/journals', async (req, res, next) => {
  try {
    const result = await postJournalEntry({
      ...req.body,
      entityId: req.params.entityId,
    });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Get journal entry
router.get('/:entityId/journals/:id', async (req, res, next) => {
  try {
    const result = await getJournalEntry(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Reverse journal entry
router.post('/:entityId/journals/:id/reverse', async (req, res, next) => {
  try {
    const { date, reason, createdByUserId } = req.body;
    const result = await reverseJournalEntry(
      req.params.id,
      date,
      reason,
      createdByUserId
    );
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
