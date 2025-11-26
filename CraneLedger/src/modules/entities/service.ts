import { eq } from 'drizzle-orm';
import { db, entities } from '../../db/index.js';
import { NotFoundError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export interface CreateEntityInput {
  name: string;
  legalIdentifier?: string;
  currencyCode?: string;
}

export async function createEntity(input: CreateEntityInput) {
  logger.info('Creating entity', { name: input.name });

  const [entity] = await db
    .insert(entities)
    .values({
      name: input.name,
      legalIdentifier: input.legalIdentifier,
      currencyCode: input.currencyCode || 'AUD',
      updatedAt: new Date(),
    })
    .returning();

  logger.info('Entity created', { entityId: entity.id });
  return entity;
}

export async function getEntity(entityId: string) {
  const [entity] = await db
    .select()
    .from(entities)
    .where(eq(entities.id, entityId));

  if (!entity) {
    throw new NotFoundError('Entity');
  }

  return entity;
}

export async function listEntities() {
  return db.select().from(entities);
}
