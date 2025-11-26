import { logger } from '../../utils/logger.js';
import { postJournalEntry } from '../journals/service.js';
import { ValidationError } from '../../utils/errors.js';

export interface CreateLoanTransferInput {
  fromEntityId: string;
  toEntityId: string;
  amount: string | number;
  date: string;
  description: string;
  fromLoanAccountId: string; // "Loan to Subsidiary" in parent
  toLoanAccountId: string; // "Loan from Parent" in subsidiary
  fromBankAccountId: string; // Bank account in parent
  toBankAccountId: string; // Bank account in subsidiary
  createdByUserId?: string;
}

export async function createLoanTransfer(input: CreateLoanTransferInput) {
  logger.info('Creating intercompany loan transfer', {
    fromEntityId: input.fromEntityId,
    toEntityId: input.toEntityId,
    amount: input.amount,
  });

  if (input.fromEntityId === input.toEntityId) {
    throw new ValidationError('Cannot create loan transfer within the same entity');
  }

  try {
    // Journal in FROM entity (parent): DR Loan to Subsidiary, CR Bank
    const fromJournal = await postJournalEntry({
      entityId: input.fromEntityId,
      date: input.date,
      description: `${input.description} - Loan to ${input.toEntityId}`,
      sourceSystem: 'CRANELEDGER_MANUAL',
      sourceReference: `INTERCOMPANY_LOAN_FROM_${input.fromEntityId}_TO_${input.toEntityId}`,
      lines: [
        {
          accountId: input.fromLoanAccountId,
          debit: input.amount,
          credit: '0',
          memo: 'Loan advanced to subsidiary',
        },
        {
          accountId: input.fromBankAccountId,
          debit: '0',
          credit: input.amount,
          memo: 'Cash transferred',
        },
      ],
      createdByUserId: input.createdByUserId,
    });

    // Journal in TO entity (subsidiary): DR Bank, CR Loan from Parent
    const toJournal = await postJournalEntry({
      entityId: input.toEntityId,
      date: input.date,
      description: `${input.description} - Loan from ${input.fromEntityId}`,
      sourceSystem: 'CRANELEDGER_MANUAL',
      sourceReference: `INTERCOMPANY_LOAN_FROM_${input.fromEntityId}_TO_${input.toEntityId}`,
      lines: [
        {
          accountId: input.toBankAccountId,
          debit: input.amount,
          credit: '0',
          memo: 'Cash received',
        },
        {
          accountId: input.toLoanAccountId,
          debit: '0',
          credit: input.amount,
          memo: 'Loan received from parent',
        },
      ],
      createdByUserId: input.createdByUserId,
    });

    logger.info('Intercompany loan transfer created', {
      fromJournalId: fromJournal.entry.id,
      toJournalId: toJournal.entry.id,
    });

    return {
      fromJournal,
      toJournal,
    };
  } catch (error) {
    logger.error('Failed to create intercompany loan transfer', { error });
    throw new ValidationError(
      'Failed to create intercompany loan transfer. Both journal entries must succeed. ' +
      'Manual reconciliation may be required.'
    );
  }
}
