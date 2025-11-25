import { eq } from 'drizzle-orm';
import { db, journalEntries, journalLines, taxCodes } from '../../db/index.js';
import { NotFoundError, UnbalancedJournalError, ValidationError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import * as decimal from '../../utils/decimal.js';

export type SourceSystem = 'EZYCRANE_APP' | 'CRANELEDGER_MANUAL' | 'AI_CFO' | 'XERO_SYNC' | 'SYSTEM';
export type JournalStatus = 'DRAFT' | 'POSTED' | 'VOIDED';

export interface JournalLineInput {
  accountId: string;
  debit: string | number;
  credit: string | number;
  taxCodeId?: string;
  memo?: string;
}

export interface PostJournalEntryInput {
  entityId: string;
  date: string;
  description: string;
  sourceSystem: SourceSystem;
  sourceReference?: string;
  lines: JournalLineInput[];
  createdByUserId?: string;
}

export async function postJournalEntry(input: PostJournalEntryInput) {
  logger.info('Posting journal entry', { 
    entityId: input.entityId, 
    sourceSystem: input.sourceSystem,
    sourceReference: input.sourceReference 
  });

  // Validate lines
  validateJournalLines(input.lines);

  // Calculate totals
  let totalDebits = '0.0000';
  let totalCredits = '0.0000';

  for (const line of input.lines) {
    totalDebits = decimal.add(totalDebits, line.debit);
    totalCredits = decimal.add(totalCredits, line.credit);
  }

  // Enforce double-entry invariant
  if (!decimal.isEqual(totalDebits, totalCredits)) {
    throw new UnbalancedJournalError(totalDebits, totalCredits);
  }

  // Calculate tax amounts for lines with tax codes
  const linesWithTax = await Promise.all(
    input.lines.map(async (line) => {
      let taxAmount = '0.0000';
      
      if (line.taxCodeId) {
        const [taxCode] = await db
          .select()
          .from(taxCodes)
          .where(eq(taxCodes.id, line.taxCodeId));

        if (taxCode) {
          const baseAmount = decimal.subtract(line.debit, line.credit);
          taxAmount = decimal.multiply(baseAmount, taxCode.rate);
        }
      }

      return {
        ...line,
        taxAmount,
      };
    })
  );

  // Create journal entry and lines in a transaction
  const result = await db.transaction(async (tx) => {
    // Create journal entry header
    const [entry] = await tx
      .insert(journalEntries)
      .values({
        entityId: input.entityId,
        date: input.date,
        description: input.description,
        sourceSystem: input.sourceSystem,
        sourceReference: input.sourceReference,
        status: 'POSTED',
        createdByUserId: input.createdByUserId,
        updatedAt: new Date(),
      })
      .returning();

    // Create journal lines
    const lines = await tx
      .insert(journalLines)
      .values(
        linesWithTax.map((line) => ({
          journalEntryId: entry.id,
          accountId: line.accountId,
          debit: line.debit.toString(),
          credit: line.credit.toString(),
          taxCodeId: line.taxCodeId,
          taxAmount: line.taxAmount,
          memo: line.memo,
          updatedAt: new Date(),
        }))
      )
      .returning();

    return { entry, lines };
  });

  logger.info('Journal entry posted', { 
    journalEntryId: result.entry.id,
    lineCount: result.lines.length 
  });

  return result;
}

export async function reverseJournalEntry(
  journalEntryId: string,
  date: string,
  reason: string,
  createdByUserId?: string
) {
  logger.info('Reversing journal entry', { journalEntryId });

  // Get original entry
  const [originalEntry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, journalEntryId));

  if (!originalEntry) {
    throw new NotFoundError('Journal entry');
  }

  if (originalEntry.status === 'VOIDED') {
    throw new ValidationError('Cannot reverse a voided journal entry');
  }

  // Get original lines
  const originalLines = await db
    .select()
    .from(journalLines)
    .where(eq(journalLines.journalEntryId, journalEntryId));

  // Create reversal with swapped debits/credits
  const reversalLines: JournalLineInput[] = originalLines.map((line) => ({
    accountId: line.accountId,
    debit: line.credit, // Swap
    credit: line.debit, // Swap
    taxCodeId: line.taxCodeId || undefined,
    memo: line.memo || undefined,
  }));

  const reversalEntry = await postJournalEntry({
    entityId: originalEntry.entityId,
    date,
    description: `REVERSAL: ${reason} (Original: ${originalEntry.description})`,
    sourceSystem: originalEntry.sourceSystem,
    sourceReference: `REVERSAL_OF_${journalEntryId}`,
    lines: reversalLines,
    createdByUserId,
  });

  logger.info('Journal entry reversed', { 
    originalId: journalEntryId,
    reversalId: reversalEntry.entry.id 
  });

  return reversalEntry;
}

export async function getJournalEntry(journalEntryId: string) {
  const [entry] = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.id, journalEntryId));

  if (!entry) {
    throw new NotFoundError('Journal entry');
  }

  const lines = await db
    .select()
    .from(journalLines)
    .where(eq(journalLines.journalEntryId, journalEntryId));

  return { entry, lines };
}

function validateJournalLines(lines: JournalLineInput[]) {
  if (lines.length === 0) {
    throw new ValidationError('Journal entry must have at least one line');
  }

  for (const line of lines) {
    const debit = parseFloat(line.debit.toString());
    const credit = parseFloat(line.credit.toString());

    if (debit < 0 || credit < 0) {
      throw new ValidationError('Debit and credit amounts must be non-negative');
    }

    if (debit > 0 && credit > 0) {
      throw new ValidationError('A line cannot have both debit and credit amounts');
    }

    if (debit === 0 && credit === 0) {
      throw new ValidationError('A line must have either a debit or credit amount');
    }
  }
}
