import { Router } from 'express';
import { createEntity, listEntities, getEntity } from '../modules/entities/service.js';
import { createAccount, listAccountsByEntity } from '../modules/accounts/service.js';
import { AppError } from '../utils/errors.js';

const router = Router();

// Create entity
router.post('/', async (req, res, next) => {
  try {
    const entity = await createEntity(req.body);
    res.status(201).json(entity);
  } catch (error) {
    next(error);
  }
});

// List entities
router.get('/', async (req, res, next) => {
  try {
    const entities = await listEntities();
    res.json(entities);
  } catch (error) {
    next(error);
  }
});

// Get entity by ID
router.get('/:entityId', async (req, res, next) => {
  try {
    const entity = await getEntity(req.params.entityId);
    res.json(entity);
  } catch (error) {
    next(error);
  }
});

// Create account for entity
router.post('/:entityId/accounts', async (req, res, next) => {
  try {
    const account = await createAccount({
      ...req.body,
      entityId: req.params.entityId,
    });
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// List accounts for entity
router.get('/:entityId/accounts', async (req, res, next) => {
  try {
    const accounts = await listAccountsByEntity(req.params.entityId);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

export default router;
