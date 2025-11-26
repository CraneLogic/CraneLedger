# CraneLedger Quick Start Guide

Get CraneLedger up and running in minutes!

## Prerequisites

- **Node.js** 22+ (LTS)
- **PostgreSQL** 14+
- **pnpm** (included in project)

## Step 1: Database Setup

### Option A: Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Create database
createdb craneledger

# Or using psql
psql -U postgres
CREATE DATABASE craneledger;
\q
```

### Option B: Docker PostgreSQL

```bash
docker run --name craneledger-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=craneledger \
  -p 5432:5432 \
  -d postgres:16
```

## Step 2: Configure Environment

The `.env` file is already configured for local development:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/craneledger
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
```

If your PostgreSQL credentials are different, update the `DATABASE_URL`.

## Step 3: Run Migrations

Push the schema to your database:

```bash
pnpm db:push
```

You should see:
```
✓ Applying migrations...
✓ Done!
```

## Step 4: Start the Server

```bash
pnpm dev
```

You should see:
```
✅ CraneLedger API running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

## Step 5: Test the API

### Health Check

```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-24T...",
  "service": "CraneLedger",
  "version": "1.0.0"
}
```

### Create Your First Entity

```bash
curl -X POST http://localhost:3000/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EzyCrane Pty Ltd",
    "legalIdentifier": "ABN 12345678901",
    "currencyCode": "AUD"
  }'
```

Save the returned `id` for the next steps.

### Create Chart of Accounts

Replace `{entityId}` with the ID from the previous step:

```bash
# Bank Account
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "100",
    "name": "Bank Account - Operating",
    "type": "ASSET",
    "isBankAccount": true
  }'

# Accounts Receivable
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "110",
    "name": "Accounts Receivable",
    "type": "ASSET"
  }'

# Accounts Payable
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "200",
    "name": "Accounts Payable",
    "type": "LIABILITY"
  }'

# GST Liability
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "210",
    "name": "GST Liability",
    "type": "LIABILITY"
  }'

# Owner'\''s Equity
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "300",
    "name": "Owner'\''s Equity",
    "type": "EQUITY"
  }'

# Service Revenue
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "400",
    "name": "Service Revenue",
    "type": "REVENUE"
  }'

# Operating Expenses
curl -X POST http://localhost:3000/entities/{entityId}/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "code": "600",
    "name": "Operating Expenses",
    "type": "EXPENSE"
  }'
```

### Post Your First Journal Entry

Replace `{entityId}`, `{bankAccountId}`, and `{equityAccountId}` with actual IDs:

```bash
curl -X POST http://localhost:3000/entities/{entityId}/journals \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-11-24",
    "description": "Initial capital investment",
    "sourceSystem": "CRANELEDGER_MANUAL",
    "sourceReference": "CAPITAL-001",
    "lines": [
      {
        "accountId": "{bankAccountId}",
        "debit": "50000.00",
        "credit": "0",
        "memo": "Cash deposit"
      },
      {
        "accountId": "{equityAccountId}",
        "debit": "0",
        "credit": "50000.00",
        "memo": "Owner'\''s capital"
      }
    ]
  }'
```

### Generate Trial Balance

```bash
curl "http://localhost:3000/entities/{entityId}/trial-balance?asOf=2024-11-24"
```

You should see the balanced trial balance with your journal entry!

## Next Steps

1. **Read the documentation:**
   - [Overview](docs/overview.md)
   - [API Documentation](docs/api.md)
   - [Accounting Model](docs/accounting-model.md)

2. **Set up all three entities:**
   - CraneLogic Pty Ltd
   - EzyCrane Pty Ltd
   - CraneFlo Pty Ltd

3. **Create invoices and bills:**
   - See API documentation for examples

4. **Generate financial reports:**
   - Trial Balance
   - Profit & Loss
   - Balance Sheet

5. **Integrate with external systems:**
   - Use the API to sync with Xero, Stripe, EzyCrane

## Useful Commands

```bash
# Development
pnpm dev                 # Start dev server with hot reload

# Production
pnpm run build           # Build TypeScript (verified: exits with code 0)
pnpm start              # Start production server
node dist/server.js     # Alternative start command

# Database
pnpm db:generate        # Generate migrations from schema
pnpm db:push            # Push schema to database
pnpm db:studio          # Open Drizzle Studio (database GUI)

# Testing
pnpm test               # Run tests
pnpm test:ui            # Run tests with UI

# Code Quality
pnpm lint               # Lint code
pnpm format             # Format code
```

## Troubleshooting

### Database Connection Error

If you see `connection refused`:

1. Check PostgreSQL is running: `pg_isready`
2. Verify credentials in `.env`
3. Check port 5432 is not blocked

### Port Already in Use

If port 3000 is taken:

1. Change `PORT` in `.env`
2. Restart the server

### Migration Issues

If migrations fail:

```bash
# Drop and recreate database
dropdb craneledger
createdb craneledger

# Re-run migrations
pnpm db:push
```

## Getting Help

- Check the [README.md](README.md)
- Review [docs/](docs/)
- Check logs in the console (JSON format)

## Production Deployment

For production:

1. Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
2. Set `NODE_ENV=production` in environment
3. Use proper authentication middleware
4. Set up monitoring and logging
5. Use a process manager (PM2, systemd)
6. Set up SSL/TLS
7. Configure rate limiting
8. Set up backups

Happy accounting! 📊


## Production Deployment (Railway)

CraneLedger is ready for production deployment on Railway or similar platforms.

### Build Configuration

**Build Command:**
```bash
pnpm run build
```

**Start Command:**
```bash
pnpm start
```
OR
```bash
node dist/server.js
```

### Environment Variables

Set these in your Railway/production environment:

```
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
NODE_ENV=production
LOG_LEVEL=info
```

### Verification

The TypeScript build has been tested and verified to:
- ✅ Complete with **zero TypeScript errors**
- ✅ Exit with code **0** (success)
- ✅ Generate production-ready JavaScript in `dist/` directory
- ✅ Work correctly with Node.js 22+

### Deployment Steps

1. Push code to GitHub
2. Connect repository to Railway
3. Railway will automatically detect Node.js
4. Set environment variables
5. Deploy!

Railway will run:
```bash
pnpm install
pnpm run build  # ✅ Succeeds with 0 errors
pnpm start      # Starts production server
```

---

**Happy accounting! 📊**
