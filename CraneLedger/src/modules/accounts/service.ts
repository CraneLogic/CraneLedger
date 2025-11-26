import { eq, and } from 'drizzle-orm';
import { db, accounts } from '../../db/index.js';
import { NotFoundError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface CreateAccountInput {
  entityId: string;
  code: string;
  name: string;
  type: AccountType;
  isBankAccount?: boolean;
  isActive?: boolean;
}

export async function createAccount(input: CreateAccountInput) {
  logger.info('Creating account', { entityId: input.entityId, code: input.code });

  // Check if account code already exists for this entity
  const existing = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.entityId, input.entityId), eq(accounts.code, input.code)));

  if (existing.length > 0) {
    throw new ValidationError(`Account code ${input.code} already exists for this entity`);
  }

  const [account] = await db
    .insert(accounts)
    .values({
      entityId: input.entityId,
      code: input.code,
      name: input.name,
      type: input.type,
      isBankAccount: input.isBankAccount || false,
      isActive: input.isActive !== undefined ? input.isActive : true,
      updatedAt: new Date(),
    })
    .returning();

  logger.info('Account created', { accountId: account.id });
  return account;
}

export async function getAccount(accountId: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, accountId));

  if (!account) {
    throw new NotFoundError('Account');
  }

  return account;
}

export async function listAccountsByEntity(entityId: string) {
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.entityId, entityId));
}

export async function getAccountByCode(entityId: string, code: string) {
  const [account] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.entityId, entityId), eq(accounts.code, code)));

  if (!account) {
    throw new NotFoundError(`Account with code ${code}`);
  }

  return account;
}
