# CraneLedger Overview

## What is CraneLedger?

CraneLedger is a **production-grade, multi-entity, double-entry accounting service** built specifically for the CraneLogic group of companies. It serves as the **internal source of truth** for all financial transactions across multiple legal entities.

## Purpose

CraneLedger addresses the need for:

1. **Centralized Financial Records**: A single system of record for all financial transactions across the CraneLogic group
2. **Multi-Entity Accounting**: Support for multiple legal entities with separate books
3. **Audit Compliance**: Immutable transaction history with full audit trails
4. **AI Integration**: Rich metadata to enable an AI-CFO layer for automated financial analysis and decision-making
5. **System Integration**: Clean API for integration with external systems (Xero, Stripe, EzyCrane)

## Core Principles

### 1. Double-Entry Bookkeeping

CraneLedger strictly enforces the fundamental accounting equation:

```
Assets = Liabilities + Equity
```

Every transaction must balance:

```
Debits = Credits
```

This invariant is enforced at the service layer, ensuring data integrity.

### 2. Multi-Entity Support

The system supports multiple legal entities, each with:

- Separate chart of accounts
- Independent financial statements
- Intercompany transaction tracking
- Consolidated reporting capabilities

**Supported Entities:**

- **CraneLogic Pty Ltd** – Parent company
- **EzyCrane Pty Ltd** – Marketplace and merchant of record
- **CraneFlo Pty Ltd** – Software and scheduling platform

### 3. Immutability & Audit Trail

Financial records are **immutable**:

- No deletions allowed
- Corrections are made via **reversing entries**
- Every transaction includes:
  - Timestamp
  - Source system
  - Source reference
  - User ID (when applicable)

This ensures complete auditability and compliance.

### 4. AI-Ready Architecture

CraneLedger is designed to support an AI-CFO layer:

- **Rich Metadata**: Every journal entry includes `sourceSystem` and `sourceReference`
- **Structured Data**: Strongly typed schema for reliable AI reasoning
- **API-First**: RESTful API for programmatic access
- **Contextual Information**: Memos, descriptions, and references provide context for AI analysis

## Architecture

### Technology Stack

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with Drizzle ORM
- **API**: RESTful HTTP endpoints
- **Testing**: Vitest
- **Migrations**: Drizzle Kit

### Data Model

The system is built around these core entities:

1. **Entities** – Legal entities (companies)
2. **Accounts** – Chart of accounts per entity
3. **Journal Entries** – Double-entry transactions
4. **Journal Lines** – Individual debit/credit lines
5. **Invoices** – Accounts receivable (customer invoices)
6. **Bills** – Accounts payable (supplier bills)
7. **Payments** – Cash movements
8. **Contacts** – Customers, suppliers, intercompany entities
9. **Tax Codes** – GST and other tax configurations

### Key Features

#### General Ledger

- Chart of accounts per entity
- Journal entries with enforced balancing
- Reversing entries for corrections
- Account types: Asset, Liability, Equity, Revenue, Expense

#### Subledgers

- **Accounts Receivable**: Customer invoices and payments
- **Accounts Payable**: Supplier bills and payments
- **Intercompany**: Loan transfers between entities

#### Financial Reports

- **Trial Balance**: Verify debits = credits
- **Profit & Loss**: Revenue and expenses over a period
- **Balance Sheet**: Assets, liabilities, and equity at a point in time

## Use Cases

### 1. Recording a Sale

When EzyCrane completes a booking:

1. Create invoice in CraneLedger
2. Post invoice to ledger:
   - DR Accounts Receivable
   - CR Revenue
   - CR GST Liability
3. When payment received:
   - DR Bank Account
   - CR Accounts Receivable

### 2. Paying a Supplier

When CraneFlo pays for cloud hosting:

1. Create bill in CraneLedger
2. Post bill to ledger:
   - DR Expense
   - DR GST on Expenses
   - CR Accounts Payable
3. When payment made:
   - DR Accounts Payable
   - CR Bank Account

### 3. Intercompany Loan

When CraneLogic lends money to EzyCrane:

1. Create intercompany loan transfer
2. In CraneLogic books:
   - DR Loan to Subsidiary
   - CR Bank Account
3. In EzyCrane books:
   - DR Bank Account
   - CR Loan from Parent

### 4. AI-Driven Analysis

An AI-CFO layer can:

- Analyze cash flow patterns
- Suggest cost optimizations
- Predict revenue trends
- Automate reconciliation
- Generate financial insights
- Flag anomalies or errors

## Integration Points

CraneLedger integrates with:

- **EzyCrane App**: Booking transactions, customer invoices
- **Xero**: Sync for external reporting and tax compliance
- **Stripe**: Payment processing and reconciliation
- **AI-CFO**: Automated financial analysis and decision support

## Security & Compliance

- **Environment-based configuration**: Sensitive data in environment variables
- **Structured logging**: JSON logs for monitoring and debugging
- **Error handling**: Custom error classes with appropriate HTTP status codes
- **Input validation**: Zod schemas for request validation
- **Authentication hooks**: Ready for auth middleware integration

## Future Enhancements

Planned features include:

- Multi-currency support with exchange rates
- Budgeting and forecasting
- Cash flow projections
- Automated bank reconciliation
- Advanced reporting and dashboards
- Role-based access control
- Webhook notifications for external systems
- GraphQL API option

## Conclusion

CraneLedger provides a **solid foundation** for the CraneLogic group's financial operations. Its focus on **correctness, extensibility, and AI-readiness** makes it ideal for both current needs and future growth.
