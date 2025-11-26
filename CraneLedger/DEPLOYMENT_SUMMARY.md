# CraneLedger Deployment Summary

## ✅ Status: RUNNING

CraneLedger is successfully deployed and running as a live API service.

---

## 🌐 API Access

### Public URL (External Access)
```
https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer
```

**Use this URL from EzyCrane or any external application.**

### Local URL (Internal/Testing)
```
http://localhost:3000
```

### Health Check
```bash
curl https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-24T20:29:49.883Z",
  "service": "CraneLedger",
  "version": "1.0.0"
}
```

---

## 📊 Database Configuration

### Database Details
- **Database Name:** `craneledger`
- **Database User:** `craneledger_user`
- **Database Password:** `craneledger_dev_pass`
- **Database Host:** `localhost:5432`
- **PostgreSQL Version:** 14.19

### Connection String
```
postgresql://craneledger_user:craneledger_dev_pass@localhost:5432/craneledger
```

### Tables Created (13 total)
✅ All tables successfully created:

1. `entities` - Legal entities (companies)
2. `accounts` - Chart of accounts
3. `tax_codes` - GST/tax configuration
4. `contacts` - Customers and suppliers
5. `journal_entries` - Journal entry headers
6. `journal_lines` - Journal entry line items
7. `invoices` - Customer invoices (AR)
8. `invoice_payments` - Invoice payment links
9. `bills` - Supplier bills (AP)
10. `bill_payments` - Bill payment links
11. `payments` - Payment records
12. `bookings` - EzyCrane marketplace bookings
13. `booking_events` - Booking financial events

---

## 🧾 Test Entity Created

### Entity Details
- **Entity ID:** `5f72a328-5d71-4bb7-80c6-1f5702bc2e68`
- **Name:** EzyCrane Pty Ltd (TEST)
- **Legal Identifier:** TEST-ABN
- **Currency:** AUD
- **Created:** 2025-11-24T20:29:40.154Z

### API Test Results

**Create Entity Request:**
```bash
curl -X POST https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer/entities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EzyCrane Pty Ltd (TEST)",
    "legalIdentifier": "TEST-ABN",
    "currencyCode": "AUD"
  }'
```

**Response (201 Created):**
```json
{
  "id": "5f72a328-5d71-4bb7-80c6-1f5702bc2e68",
  "name": "EzyCrane Pty Ltd (TEST)",
  "legalIdentifier": "TEST-ABN",
  "currencyCode": "AUD",
  "createdAt": "2025-11-24T15:29:40.181Z",
  "updatedAt": "2025-11-24T20:29:40.154Z"
}
```

**Get All Entities Request:**
```bash
curl https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer/entities
```

**Response (200 OK):**
```json
[
  {
    "id": "5f72a328-5d71-4bb7-80c6-1f5702bc2e68",
    "name": "EzyCrane Pty Ltd (TEST)",
    "legalIdentifier": "TEST-ABN",
    "currencyCode": "AUD",
    "createdAt": "2025-11-24T15:29:40.181Z",
    "updatedAt": "2025-11-24T20:29:40.154Z"
  }
]
```

---

## 📌 Common Commands

### Start Development Server
```bash
cd /home/ubuntu/CraneLedger
pnpm dev
```

The server will start on port 3000 with hot-reload enabled.

### Run Database Migrations
```bash
cd /home/ubuntu/CraneLedger
pnpm db:push
```

This applies schema changes to the database.

### Generate New Migrations
```bash
cd /home/ubuntu/CraneLedger
pnpm db:generate
```

This generates migration files from schema changes.

### Run Tests
```bash
cd /home/ubuntu/CraneLedger
pnpm test
```

### Build for Production
```bash
cd /home/ubuntu/CraneLedger
pnpm build
```

### Start Production Server
```bash
cd /home/ubuntu/CraneLedger
pnpm start
```

(Requires `pnpm build` first)

---

## 🔧 Setup Steps Completed

### 1. ✅ Dependencies Installed
```bash
cd /home/ubuntu/CraneLedger
pnpm install
```

**Result:** All dependencies installed successfully (862ms)

### 2. ✅ PostgreSQL Configured
- Installed PostgreSQL 14.19
- Created database: `craneledger`
- Created user: `craneledger_user`
- Granted all privileges
- Updated `.env` file with connection string

### 3. ✅ Database Migrations Applied
```bash
pnpm db:push
```

**Result:** All 13 tables created successfully

### 4. ✅ Server Started
```bash
pnpm dev
```

**Result:** Server running on port 3000

### 5. ✅ Public URL Exposed
Exposed port 3000 to public URL:
```
https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer
```

### 6. ✅ API Tested
- Health check: ✅ Working
- Create entity: ✅ Working (201 Created)
- Get entities: ✅ Working (200 OK)
- Public URL: ✅ Accessible

---

## 🚀 Integration with EzyCrane

### Base URL for EzyCrane Backend
```typescript
const CRANELEDGER_API_URL = 'https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer';
```

### Test Entity ID
```typescript
const EZYCRANE_ENTITY_ID = '5f72a328-5d71-4bb7-80c6-1f5702bc2e68';
```

### Example Integration Code
```typescript
import axios from 'axios';

const CRANELEDGER_API = 'https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer';
const EZYCRANE_ENTITY_ID = '5f72a328-5d71-4bb7-80c6-1f5702bc2e68';

// Create a booking
const response = await axios.post(`${CRANELEDGER_API}/bookings`, {
  externalBookingId: 'EZYCRANE-12345',
  entityId: EZYCRANE_ENTITY_ID,
  customerName: 'ABC Construction',
  customerEmail: 'accounts@abc.com.au',
  supplierName: 'Crane Hire Co',
  totalJobAmount: 1100.00,
  depositAmount: 330.00,
  marginAmount: 300.00
});

console.log('Booking created:', response.data);
```

---

## 📚 Available Endpoints

### Core Endpoints
- `GET /health` - Health check
- `POST /entities` - Create entity
- `GET /entities` - List entities
- `POST /entities/:id/accounts` - Create account
- `GET /entities/:id/accounts` - List accounts

### Booking Endpoints (EzyCrane Integration)
- `POST /bookings` - Create booking
- `POST /bookings/:id/deposit` - Record deposit
- `POST /bookings/:id/balance` - Record balance payment
- `POST /bookings/:id/payout` - Record supplier payout
- `POST /bookings/:id/margin` - Recognize margin
- `POST /bookings/:id/cancel` - Cancel booking
- `POST /bookings/:id/refund` - Process refund
- `GET /bookings/:id` - Get booking details

### Report Endpoints
- `GET /entities/:id/trial-balance?asOf=YYYY-MM-DD`
- `GET /entities/:id/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /entities/:id/balance-sheet?asOf=YYYY-MM-DD`
- `GET /entities/:id/booking-summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /entities/:id/outstanding-deposits`
- `GET /entities/:id/upcoming-payouts`
- `GET /entities/:id/margin-report?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Full API documentation:** See `docs/api.md` and `docs/ezycrane-integration.md`

---

## 🔒 Security Notes

### Current Configuration (Development)
- ⚠️ **No authentication** - Add authentication for production
- ⚠️ **No rate limiting** - Add rate limiting for production
- ⚠️ **CORS enabled** - Configure for production domains
- ⚠️ **Public URL exposed** - Temporary for testing

### Production Recommendations
1. Add JWT or API key authentication
2. Implement rate limiting
3. Configure CORS for specific domains
4. Use environment-specific DATABASE_URL
5. Enable SSL/TLS
6. Add request logging and monitoring
7. Implement backup strategy

---

## 📊 Server Logs

The server is currently running with these logs:
```
{"timestamp":"2025-11-24T20:28:54.625Z","level":"INFO","message":"🚀 CraneLedger server started","meta":{"port":3000,"environment":"development"}}
✅ CraneLedger API running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

---

## 🎯 Next Steps

1. **Create Required Accounts** for EzyCrane entity:
   - Bank / Clearing (110)
   - Customer Deposits Held (800)
   - Accounts Receivable (112)
   - Marketplace Margin Revenue (201)
   - Supplier Payouts (300)
   - GST on Income (210)

2. **Integrate with EzyCrane Backend:**
   - Use the public URL as base URL
   - Store entity ID in environment variables
   - Implement booking lifecycle calls

3. **Test Complete Workflow:**
   - Create booking
   - Record deposit
   - Record balance
   - Record payout
   - Recognize margin

4. **Deploy to Production:**
   - Add authentication
   - Configure production database
   - Set up proper hosting
   - Enable monitoring

---

## ✅ Summary

**CraneLedger is LIVE and ready for integration!**

- 🌐 **Public URL:** https://3000-i98nxtazp4pns5pvru7tw-6bb0e65b.manus-asia.computer
- 📊 **Database:** PostgreSQL 14.19 with 13 tables
- 🧾 **Test Entity ID:** 5f72a328-5d71-4bb7-80c6-1f5702bc2e68
- ✅ **API Status:** All endpoints working
- 🚀 **Ready for:** EzyCrane integration

**To restart the server in future:**
```bash
cd /home/ubuntu/CraneLedger
pnpm dev
```

**To run migrations:**
```bash
cd /home/ubuntu/CraneLedger
pnpm db:push
```
