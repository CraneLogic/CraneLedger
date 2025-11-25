import { pgTable, uuid, varchar, timestamp, boolean, decimal, pgEnum, date, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const accountTypeEnum = pgEnum('account_type', ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']);
export const sourceSystemEnum = pgEnum('source_system', ['EZYCRANE_APP', 'CRANELEDGER_MANUAL', 'AI_CFO', 'XERO_SYNC', 'SYSTEM']);
export const journalStatusEnum = pgEnum('journal_status', ['DRAFT', 'POSTED', 'VOIDED']);
export const contactTypeEnum = pgEnum('contact_type', ['CUSTOMER', 'SUPPLIER', 'INTERCOMPANY']);
export const invoiceStatusEnum = pgEnum('invoice_status', ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'VOIDED']);
export const paymentDirectionEnum = pgEnum('payment_direction', ['INCOMING', 'OUTGOING']);
export const paymentMethodEnum = pgEnum('payment_method', ['STRIPE', 'BANK_TRANSFER', 'PAYPAL', 'CASH', 'OTHER']);

// Entities table
export const entities = pgTable('entities', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  legalIdentifier: varchar('legal_identifier', { length: 100 }),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('AUD'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Accounts table (Chart of Accounts)
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  code: varchar('code', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: accountTypeEnum('type').notNull(),
  isBankAccount: boolean('is_bank_account').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueEntityCode: unique().on(table.entityId, table.code),
  entityIdIdx: index('accounts_entity_id_idx').on(table.entityId),
}));

// Tax codes table
export const taxCodes = pgTable('tax_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  name: varchar('name', { length: 255 }).notNull(),
  rate: decimal('rate', { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityIdIdx: index('tax_codes_entity_id_idx').on(table.entityId),
}));

// Journal entries table
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  date: date('date').notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  sourceSystem: sourceSystemEnum('source_system').notNull(),
  sourceReference: varchar('source_reference', { length: 255 }),
  status: journalStatusEnum('status').notNull().default('POSTED'),
  createdByUserId: varchar('created_by_user_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityIdIdx: index('journal_entries_entity_id_idx').on(table.entityId),
  dateIdx: index('journal_entries_date_idx').on(table.date),
}));

// Journal lines table
export const journalLines = pgTable('journal_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  journalEntryId: uuid('journal_entry_id').notNull().references(() => journalEntries.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  debit: decimal('debit', { precision: 19, scale: 4 }).notNull().default('0'),
  credit: decimal('credit', { precision: 19, scale: 4 }).notNull().default('0'),
  taxCodeId: uuid('tax_code_id').references(() => taxCodes.id),
  taxAmount: decimal('tax_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  memo: varchar('memo', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  journalEntryIdIdx: index('journal_lines_journal_entry_id_idx').on(table.journalEntryId),
  accountIdIdx: index('journal_lines_account_id_idx').on(table.accountId),
}));

// Contacts table
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  type: contactTypeEnum('type').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  externalRef: varchar('external_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityIdIdx: index('contacts_entity_id_idx').on(table.entityId),
}));

// Invoices table (Accounts Receivable)
export const invoices = pgTable('invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  number: varchar('number', { length: 100 }).notNull(),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  status: invoiceStatusEnum('status').notNull().default('DRAFT'),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('AUD'),
  subtotalAmount: decimal('subtotal_amount', { precision: 19, scale: 4 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 19, scale: 4 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 19, scale: 4 }).notNull(),
  externalRef: varchar('external_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueEntityNumber: unique().on(table.entityId, table.number),
  entityIdIdx: index('invoices_entity_id_idx').on(table.entityId),
  contactIdIdx: index('invoices_contact_id_idx').on(table.contactId),
}));

// Bills table (Accounts Payable)
export const bills = pgTable('bills', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  number: varchar('number', { length: 100 }).notNull(),
  issueDate: date('issue_date').notNull(),
  dueDate: date('due_date').notNull(),
  status: invoiceStatusEnum('status').notNull().default('DRAFT'),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('AUD'),
  subtotalAmount: decimal('subtotal_amount', { precision: 19, scale: 4 }).notNull(),
  taxAmount: decimal('tax_amount', { precision: 19, scale: 4 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 19, scale: 4 }).notNull(),
  externalRef: varchar('external_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueEntityNumber: unique().on(table.entityId, table.number),
  entityIdIdx: index('bills_entity_id_idx').on(table.entityId),
  contactIdIdx: index('bills_contact_id_idx').on(table.contactId),
}));

// Payments table
export const payments = pgTable('payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  direction: paymentDirectionEnum('direction').notNull(),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  currencyCode: varchar('currency_code', { length: 3 }).notNull().default('AUD'),
  date: date('date').notNull(),
  method: paymentMethodEnum('method').notNull(),
  externalRef: varchar('external_ref', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  entityIdIdx: index('payments_entity_id_idx').on(table.entityId),
  contactIdIdx: index('payments_contact_id_idx').on(table.contactId),
}));

// Invoice payments link table
export const invoicePayments = pgTable('invoice_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  amountApplied: decimal('amount_applied', { precision: 19, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  invoiceIdIdx: index('invoice_payments_invoice_id_idx').on(table.invoiceId),
  paymentIdIdx: index('invoice_payments_payment_id_idx').on(table.paymentId),
}));

// Bill payments link table
export const billPayments = pgTable('bill_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  billId: uuid('bill_id').notNull().references(() => bills.id),
  paymentId: uuid('payment_id').notNull().references(() => payments.id),
  amountApplied: decimal('amount_applied', { precision: 19, scale: 4 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  billIdIdx: index('bill_payments_bill_id_idx').on(table.billId),
  paymentIdIdx: index('bill_payments_payment_id_idx').on(table.paymentId),
}));

// Relations
export const entitiesRelations = relations(entities, ({ many }) => ({
  accounts: many(accounts),
  taxCodes: many(taxCodes),
  journalEntries: many(journalEntries),
  contacts: many(contacts),
  invoices: many(invoices),
  bills: many(bills),
  payments: many(payments),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  entity: one(entities, {
    fields: [accounts.entityId],
    references: [entities.id],
  }),
  journalLines: many(journalLines),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  entity: one(entities, {
    fields: [journalEntries.entityId],
    references: [entities.id],
  }),
  lines: many(journalLines),
}));

export const journalLinesRelations = relations(journalLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalLines.accountId],
    references: [accounts.id],
  }),
  taxCode: one(taxCodes, {
    fields: [journalLines.taxCodeId],
    references: [taxCodes.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  entity: one(entities, {
    fields: [contacts.entityId],
    references: [entities.id],
  }),
  invoices: many(invoices),
  bills: many(bills),
  payments: many(payments),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  entity: one(entities, {
    fields: [invoices.entityId],
    references: [entities.id],
  }),
  contact: one(contacts, {
    fields: [invoices.contactId],
    references: [contacts.id],
  }),
  payments: many(invoicePayments),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  entity: one(entities, {
    fields: [bills.entityId],
    references: [entities.id],
  }),
  contact: one(contacts, {
    fields: [bills.contactId],
    references: [contacts.id],
  }),
  payments: many(billPayments),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  entity: one(entities, {
    fields: [payments.entityId],
    references: [entities.id],
  }),
  contact: one(contacts, {
    fields: [payments.contactId],
    references: [contacts.id],
  }),
  invoicePayments: many(invoicePayments),
  billPayments: many(billPayments),
}));

// Booking enums
export const bookingStatusEnum = pgEnum('booking_status', ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
export const bookingEventTypeEnum = pgEnum('booking_event_type', ['DEPOSIT', 'BALANCE', 'PAYOUT', 'MARGIN', 'CANCEL', 'REFUND']);

// Bookings table
export const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  externalBookingId: varchar('external_booking_id', { length: 255 }).notNull(),
  entityId: uuid('entity_id').notNull().references(() => entities.id),
  customerId: uuid('customer_id').notNull().references(() => contacts.id),
  supplierId: uuid('supplier_id').references(() => contacts.id),
  status: bookingStatusEnum('status').notNull().default('PENDING'),
  depositAmount: decimal('deposit_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  balanceAmount: decimal('balance_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  totalJobAmount: decimal('total_job_amount', { precision: 19, scale: 4 }).notNull(),
  marginAmount: decimal('margin_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  supplierPayoutAmount: decimal('supplier_payout_amount', { precision: 19, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueExternalBookingId: unique().on(table.entityId, table.externalBookingId),
  entityIdIdx: index('bookings_entity_id_idx').on(table.entityId),
  customerIdIdx: index('bookings_customer_id_idx').on(table.customerId),
  supplierIdIdx: index('bookings_supplier_id_idx').on(table.supplierId),
  externalBookingIdIdx: index('bookings_external_booking_id_idx').on(table.externalBookingId),
}));

// Booking events table
export const bookingEvents = pgTable('booking_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookingId: uuid('booking_id').notNull().references(() => bookings.id, { onDelete: 'cascade' }),
  type: bookingEventTypeEnum('type').notNull(),
  amount: decimal('amount', { precision: 19, scale: 4 }).notNull(),
  journalEntryId: uuid('journal_entry_id').references(() => journalEntries.id),
  metadata: varchar('metadata', { length: 2000 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  bookingIdIdx: index('booking_events_booking_id_idx').on(table.bookingId),
  journalEntryIdIdx: index('booking_events_journal_entry_id_idx').on(table.journalEntryId),
  typeIdx: index('booking_events_type_idx').on(table.type),
}));

// Booking relations
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  entity: one(entities, {
    fields: [bookings.entityId],
    references: [entities.id],
  }),
  customer: one(contacts, {
    fields: [bookings.customerId],
    references: [contacts.id],
  }),
  supplier: one(contacts, {
    fields: [bookings.supplierId],
    references: [contacts.id],
  }),
  events: many(bookingEvents),
}));

export const bookingEventsRelations = relations(bookingEvents, ({ one }) => ({
  booking: one(bookings, {
    fields: [bookingEvents.bookingId],
    references: [bookings.id],
  }),
  journalEntry: one(journalEntries, {
    fields: [bookingEvents.journalEntryId],
    references: [journalEntries.id],
  }),
}));
