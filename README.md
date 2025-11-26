# CraneLedger

**Production-grade, multi-entity, double-entry accounting service for the CraneLogic group of companies.**

CraneLedger is the internal source-of-truth ledger system. External systems (Xero, Stripe, EzyCrane, etc.) are considered integrations or mirrors, not the primary books.

## Features

- ✅ **Strongly typed** TypeScript codebase
- ✅ **Fully double-entry** accounting (debits = credits, always)
- ✅ **Multi-entity** support (multiple companies)
- ✅ **Audit-safe** with immutable history (reversals, not deletes)
- ✅ **API-driven** RESTful interface
- ✅ **AI-ready** with rich metadata for AI-CFO layer

## Supported Entities

- **CraneLogic Pty Ltd** (parent company)
- **EzyCrane Pty Ltd** (marketplace, merchant of record)
- **CraneFlo Pty Ltd** (software / scheduling)

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js (LTS)
- **Framework**: Express
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Testing**: Vitest
- **Linting**: ESLint + Prettier

## Project Structure

```
CraneLedger/
├── src/
│   ├── config/           # Environment configuration
│   ├── db/               # Database schema & connection
│   ├── modules/          # Domain modules
│   │   ├── entities/     # Entity management
│   │   ├── accounts/     # Chart of accounts
│   │   ├── journals/     # Journal entries
│   │   ├── invoices/     # Accounts receivable
│   │   ├── bills/        # Accounts payable
│   │   ├── payments/     # Payment processing
│   │   ├── intercompany/ # Intercompany transactions
│   │   └── reports/      # Financial reports
│   ├── routes/           # API routes
│   ├── utils/            # Utilities (errors, logger, decimal)
│   └── server.ts         # Express server
├── docs/                 # Documentation
├── tests/                # Test files
└── drizzle/              # Database migrations
```

## Getting Started

### Prerequisites

- Node.js 22+ (LTS)
- PostgreSQL 14+
- pnpm (included)

### Installation

1. Clone the repository:
```bash
cd CraneLedger
```

2. Install dependencies:
```bash
pnpm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Set up the database:
```bash
# Create PostgreSQL database
createdb craneledger

# Generate migration files
pnpm db:generate

# Run migrations
pnpm db:push
```

### Running the Server

**Development mode** (with hot reload):
```bash
pnpm dev
```

**Production mode**:
```bash
# Build the TypeScript code
pnpm run build

# Start the production server
pnpm start
# OR
node dist/server.js
```

**Production build verification**:
```bash
# Verify build succeeds (exit code 0)
pnpm run build
```

The server will start on `http://localhost:3000`

> **Note for Railway/Production Deployment:**
> - Build command: `pnpm run build`
> - Start command: `pnpm start` or `node dist/server.js`
> - The build has been tested and passes with zero TypeScript errors

### Running Tests

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui
```

## API Endpoints

### Entities & Accounts

- `POST /entities` – Create an entity
- `GET /entities` – List all entities
- `GET /entities/:entityId` – Get entity by ID
- `POST /entities/:entityId/accounts` – Create account
- `GET /entities/:entityId/accounts` – List accounts

### Journals

- `POST /entities/:entityId/journals` – Post journal entry
- `GET /entities/:entityId/journals/:id` – Get journal entry
- `POST /entities/:entityId/journals/:id/reverse` – Reverse a journal

### Invoices (Accounts Receivable)

- `POST /entities/:entityId/invoices` – Create invoice
- `GET /entities/:entityId/invoices/:id` – Get invoice
- `POST /entities/:entityId/invoices/:id/post` – Post invoice to ledger
- `POST /entities/:entityId/invoices/:id/payments` – Record payment

### Bills (Accounts Payable)

- `POST /entities/:entityId/bills` – Create bill
- `GET /entities/:entityId/bills/:id` – Get bill
- `POST /entities/:entityId/bills/:id/post` – Post bill to ledger
- `POST /entities/:entityId/bills/:id/payments` – Record payment

### Intercompany

- `POST /intercompany/loan-transfer` – Create loan transfer between entities

### Reports

- `GET /entities/:entityId/trial-balance?asOf=YYYY-MM-DD` – Trial balance
- `GET /entities/:entityId/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD` – Profit & Loss
- `GET /entities/:entityId/balance-sheet?asOf=YYYY-MM-DD` – Balance sheet

## Database Migrations

```bash
# Generate migration from schema changes
pnpm db:generate

# Push schema to database
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

## Core Concepts

### Double-Entry Bookkeeping

Every journal entry must balance:
```
SUM(debits) = SUM(credits)
```

This invariant is enforced at the service layer.

### Account Types

- **ASSET**: Resources owned (cash, receivables, equipment)
- **LIABILITY**: Obligations owed (payables, loans)
- **EQUITY**: Owner's stake (capital, retained earnings)
- **REVENUE**: Income earned
- **EXPENSE**: Costs incurred

### Journal Entry Metadata

Every journal captures:
- `sourceSystem`: Origin of the transaction (EZYCRANE_APP, AI_CFO, etc.)
- `sourceReference`: External ID for traceability
- Rich metadata for AI reasoning and reconciliation

### Immutable History

- No deletions allowed
- Use reversals to correct entries
- Full audit trail maintained

## Example Usage

### 1. Create an Entity

```bash
curl -X POST http://localhost:3000/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EzyCrane Pty Ltd",
    "legalIdentifier": "ABN 12345678901",
    "currencyCode": "AUD"
  }'
```

### 2. Create Accounts

```bash
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "100",
    "name": "Bank Account",
    "type": "ASSET",
    "isBankAccount": true
  }'
```

### 3. Post a Journal Entry

```bash
curl -X POST http://localhost:3000/entities/{entityId}/journals \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-11-24",
    "description": "Initial capital investment",
    "sourceSystem": "CRANELEDGER_MANUAL",
    "lines": [
      {
        "accountId": "{bankAccountId}",
        "debit": "10000.00",
        "credit": "0"
      },
      {
        "accountId": "{equityAccountId}",
        "debit": "0",
        "credit": "10000.00"
      }
    ]
  }'
```

### 4. Generate Trial Balance

```bash
curl "http://localhost:3000/entities/{entityId}/trial-balance?asOf=2024-11-24"
```

## Development

### Code Quality

```bash
# Lint code
pnpm lint

# Format code
pnpm format
```

### Testing

Write tests in the `tests/` directory using Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { postJournalEntry } from '../src/modules/journals/service';

describe('Journal Service', () => {
  it('should reject unbalanced entries', async () => {
    // Test implementation
  });
});
```

## Documentation

See the `docs/` directory for detailed documentation:

- [Overview](docs/overview.md) – What CraneLedger is
- [API Documentation](docs/api.md) – Endpoint details & examples
- [Accounting Model](docs/accounting-model.md) – Double-entry rules & mappings

## Production Readiness

- ✅ Environment-based configuration
- ✅ Structured logging (JSON format)
- ✅ Error handling with custom error classes
- ✅ Database migrations
- ✅ TypeScript strict mode
- ✅ Input validation with Zod
- ✅ CORS enabled
- ✅ Health check endpoint

## AI Integration

CraneLedger is designed to support an AI-CFO layer:

- Every transaction includes `sourceSystem` and `sourceReference`
- Rich metadata enables AI reasoning
- Immutable audit trail for compliance
- RESTful API for programmatic access

## License

ISC

## Support

For questions or issues, contact the CraneLogic development team.
