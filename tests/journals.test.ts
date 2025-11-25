import { describe, it, expect, beforeAll } from 'vitest';
import { postJournalEntry } from '../src/modules/journals/service.js';
import { createEntity } from '../src/modules/entities/service.js';
import { createAccount } from '../src/modules/accounts/service.js';

describe('Journal Service', () => {
  let entityId: string;
  let bankAccountId: string;
  let equityAccountId: string;

  beforeAll(async () => {
    // Create test entity
    const entity = await createEntity({
      name: 'Test Entity',
      legalIdentifier: 'TEST123',
      currencyCode: 'AUD',
    });
    entityId = entity.id;

    // Create test accounts
    const bankAccount = await createAccount({
      entityId,
      code: '100',
      name: 'Bank Account',
      type: 'ASSET',
      isBankAccount: true,
    });
    bankAccountId = bankAccount.id;

    const equityAccount = await createAccount({
      entityId,
      code: '300',
      name: "Owner's Equity",
      type: 'EQUITY',
    });
    equityAccountId = equityAccount.id;
  });

  it('should post a balanced journal entry', async () => {
    const result = await postJournalEntry({
      entityId,
      date: '2024-11-24',
      description: 'Test balanced entry',
      sourceSystem: 'CRANELEDGER_MANUAL',
      lines: [
        {
          accountId: bankAccountId,
          debit: '1000.00',
          credit: '0',
        },
        {
          accountId: equityAccountId,
          debit: '0',
          credit: '1000.00',
        },
      ],
    });

    expect(result.entry).toBeDefined();
    expect(result.entry.status).toBe('POSTED');
    expect(result.lines).toHaveLength(2);
  });

  it('should reject an unbalanced journal entry', async () => {
    await expect(
      postJournalEntry({
        entityId,
        date: '2024-11-24',
        description: 'Test unbalanced entry',
        sourceSystem: 'CRANELEDGER_MANUAL',
        lines: [
          {
            accountId: bankAccountId,
            debit: '1000.00',
            credit: '0',
          },
          {
            accountId: equityAccountId,
            debit: '0',
            credit: '900.00', // Unbalanced!
          },
        ],
      })
    ).rejects.toThrow('unbalanced');
  });

  it('should reject a line with both debit and credit', async () => {
    await expect(
      postJournalEntry({
        entityId,
        date: '2024-11-24',
        description: 'Test invalid line',
        sourceSystem: 'CRANELEDGER_MANUAL',
        lines: [
          {
            accountId: bankAccountId,
            debit: '1000.00',
            credit: '500.00', // Both debit and credit!
          },
        ],
      })
    ).rejects.toThrow('cannot have both debit and credit');
  });

  it('should reject a line with negative amounts', async () => {
    await expect(
      postJournalEntry({
        entityId,
        date: '2024-11-24',
        description: 'Test negative amount',
        sourceSystem: 'CRANELEDGER_MANUAL',
        lines: [
          {
            accountId: bankAccountId,
            debit: '-1000.00', // Negative!
            credit: '0',
          },
          {
            accountId: equityAccountId,
            debit: '0',
            credit: '1000.00',
          },
        ],
      })
    ).rejects.toThrow('non-negative');
  });
});
