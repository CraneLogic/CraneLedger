# CraneLedger API Documentation

Base URL: `http://localhost:3000`

All requests and responses use `application/json` content type.

## Table of Contents

- [Health Check](#health-check)
- [Entities](#entities)
- [Accounts](#accounts)
- [Journal Entries](#journal-entries)
- [Invoices](#invoices)
- [Bills](#bills)
- [Intercompany](#intercompany)
- [Bookings](#bookings)
- [Reports](#reports)
- [Error Responses](#error-responses)

---

## Health Check

### GET /health

Check if the service is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-11-24T12:00:00.000Z",
  "service": "CraneLedger",
  "version": "1.0.0"
}
```

---

## Entities

### POST /entities

Create a new legal entity.

**Request Body:**
```json
{
  "name": "EzyCrane Pty Ltd",
  "legalIdentifier": "ABN 12345678901",
  "currencyCode": "AUD"
}
```

**Response:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "EzyCrane Pty Ltd",
  "legalIdentifier": "ABN 12345678901",
  "currencyCode": "AUD",
  "createdAt": "2024-11-24T12:00:00.000Z",
  "updatedAt": "2024-11-24T12:00:00.000Z"
}
```

### GET /entities

List all entities.

**Response:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "EzyCrane Pty Ltd",
    "legalIdentifier": "ABN 12345678901",
    "currencyCode": "AUD",
    "createdAt": "2024-11-24T12:00:00.000Z",
    "updatedAt": "2024-11-24T12:00:00.000Z"
  }
]
```

### GET /entities/:entityId

Get a specific entity by ID.

**Response:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "EzyCrane Pty Ltd",
  "legalIdentifier": "ABN 12345678901",
  "currencyCode": "AUD",
  "createdAt": "2024-11-24T12:00:00.000Z",
  "updatedAt": "2024-11-24T12:00:00.000Z"
}
```

---

## Accounts

### POST /entities/:entityId/accounts

Create a new account in the chart of accounts.

**Request Body:**
```json
{
  "code": "100",
  "name": "Bank Account - Operating",
  "type": "ASSET",
  "isBankAccount": true,
  "isActive": true
}
```

**Account Types:**
- `ASSET`
- `LIABILITY`
- `EQUITY`
- `REVENUE`
- `EXPENSE`

**Response:** `201 Created`
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "100",
  "name": "Bank Account - Operating",
  "type": "ASSET",
  "isBankAccount": true,
  "isActive": true,
  "createdAt": "2024-11-24T12:00:00.000Z",
  "updatedAt": "2024-11-24T12:00:00.000Z"
}
```

### GET /entities/:entityId/accounts

List all accounts for an entity.

**Response:** `200 OK`
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "entityId": "550e8400-e29b-41d4-a716-446655440000",
    "code": "100",
    "name": "Bank Account - Operating",
    "type": "ASSET",
    "isBankAccount": true,
    "isActive": true,
    "createdAt": "2024-11-24T12:00:00.000Z",
    "updatedAt": "2024-11-24T12:00:00.000Z"
  }
]
```

---

## Journal Entries

### POST /entities/:entityId/journals

Post a new journal entry. **Must be balanced** (debits = credits).

**Request Body:**
```json
{
  "date": "2024-11-24",
  "description": "Initial capital investment",
  "sourceSystem": "CRANELEDGER_MANUAL",
  "sourceReference": "CAPITAL-001",
  "lines": [
    {
      "accountId": "660e8400-e29b-41d4-a716-446655440001",
      "debit": "50000.00",
      "credit": "0",
      "memo": "Cash deposit"
    },
    {
      "accountId": "660e8400-e29b-41d4-a716-446655440002",
      "debit": "0",
      "credit": "50000.00",
      "memo": "Owner's capital"
    }
  ],
  "createdByUserId": "user123"
}
```

**Source Systems:**
- `EZYCRANE_APP`
- `CRANELEDGER_MANUAL`
- `AI_CFO`
- `XERO_SYNC`
- `SYSTEM`

**Response:** `201 Created`
```json
{
  "entry": {
    "id": "770e8400-e29b-41d4-a716-446655440003",
    "entityId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-11-24",
    "description": "Initial capital investment",
    "sourceSystem": "CRANELEDGER_MANUAL",
    "sourceReference": "CAPITAL-001",
    "status": "POSTED",
    "createdByUserId": "user123",
    "createdAt": "2024-11-24T12:00:00.000Z",
    "updatedAt": "2024-11-24T12:00:00.000Z"
  },
  "lines": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440004",
      "journalEntryId": "770e8400-e29b-41d4-a716-446655440003",
      "accountId": "660e8400-e29b-41d4-a716-446655440001",
      "debit": "50000.0000",
      "credit": "0.0000",
      "taxCodeId": null,
      "taxAmount": "0.0000",
      "memo": "Cash deposit",
      "createdAt": "2024-11-24T12:00:00.000Z",
      "updatedAt": "2024-11-24T12:00:00.000Z"
    }
  ]
}
```

### GET /entities/:entityId/journals/:id

Get a specific journal entry with its lines.

**Response:** `200 OK`
```json
{
  "entry": { /* journal entry object */ },
  "lines": [ /* array of journal lines */ ]
}
```

### POST /entities/:entityId/journals/:id/reverse

Reverse a journal entry (creates a new entry with swapped debits/credits).

**Request Body:**
```json
{
  "date": "2024-11-25",
  "reason": "Correction of error",
  "createdByUserId": "user123"
}
```

**Response:** `201 Created`
```json
{
  "entry": { /* new reversal journal entry */ },
  "lines": [ /* reversed journal lines */ ]
}
```

---

## Invoices

### POST /entities/:entityId/invoices

Create a new customer invoice (DRAFT status).

**Request Body:**
```json
{
  "contactId": "990e8400-e29b-41d4-a716-446655440005",
  "number": "INV-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "currencyCode": "AUD",
  "subtotalAmount": "1000.00",
  "taxAmount": "100.00",
  "externalRef": "BOOKING-12345",
  "receivableAccountId": "account-id-1",
  "revenueAccountId": "account-id-2",
  "taxLiabilityAccountId": "account-id-3"
}
```

**Response:** `201 Created`
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440006",
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "contactId": "990e8400-e29b-41d4-a716-446655440005",
  "number": "INV-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "status": "DRAFT",
  "currencyCode": "AUD",
  "subtotalAmount": "1000.0000",
  "taxAmount": "100.0000",
  "totalAmount": "1100.0000",
  "externalRef": "BOOKING-12345",
  "createdAt": "2024-11-24T12:00:00.000Z",
  "updatedAt": "2024-11-24T12:00:00.000Z"
}
```

### GET /entities/:entityId/invoices/:id

Get a specific invoice.

**Response:** `200 OK`
```json
{
  "id": "aa0e8400-e29b-41d4-a716-446655440006",
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "contactId": "990e8400-e29b-41d4-a716-446655440005",
  "number": "INV-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "status": "SENT",
  "currencyCode": "AUD",
  "subtotalAmount": "1000.0000",
  "taxAmount": "100.0000",
  "totalAmount": "1100.0000",
  "externalRef": "BOOKING-12345",
  "createdAt": "2024-11-24T12:00:00.000Z",
  "updatedAt": "2024-11-24T12:00:00.000Z"
}
```

### POST /entities/:entityId/invoices/:id/post

Post invoice to the general ledger (creates journal entry).

**Request Body:**
```json
{
  "receivableAccountId": "account-id-1",
  "revenueAccountId": "account-id-2",
  "taxLiabilityAccountId": "account-id-3"
}
```

**Response:** `200 OK`
```json
{
  "invoice": { /* updated invoice with SENT status */ },
  "journal": { /* created journal entry */ }
}
```

### POST /entities/:entityId/invoices/:id/payments

Record a payment against an invoice.

**Request Body:**
```json
{
  "amount": "1100.00",
  "date": "2024-11-25",
  "method": "STRIPE",
  "externalRef": "pi_1234567890",
  "bankAccountId": "account-id-bank",
  "receivableAccountId": "account-id-receivable"
}
```

**Payment Methods:**
- `STRIPE`
- `BANK_TRANSFER`
- `PAYPAL`
- `CASH`
- `OTHER`

**Response:** `201 Created`
```json
{
  "payment": { /* payment record */ },
  "journal": { /* journal entry for payment */ }
}
```

---

## Bills

### POST /entities/:entityId/bills

Create a new supplier bill (DRAFT status).

**Request Body:**
```json
{
  "contactId": "bb0e8400-e29b-41d4-a716-446655440007",
  "number": "BILL-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "currencyCode": "AUD",
  "subtotalAmount": "500.00",
  "taxAmount": "50.00",
  "externalRef": "SUPPLIER-INV-789"
}
```

**Response:** `201 Created`
```json
{
  "id": "cc0e8400-e29b-41d4-a716-446655440008",
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "contactId": "bb0e8400-e29b-41d4-a716-446655440007",
  "number": "BILL-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "status": "DRAFT",
  "currencyCode": "AUD",
  "subtotalAmount": "500.0000",
  "taxAmount": "50.0000",
  "totalAmount": "550.0000",
  "externalRef": "SUPPLIER-INV-789",
  "createdAt": "2024-11-24T12:00:00.000Z",
  "updatedAt": "2024-11-24T12:00:00.000Z"
}
```

### GET /entities/:entityId/bills/:id

Get a specific bill.

### POST /entities/:entityId/bills/:id/post

Post bill to the general ledger.

**Request Body:**
```json
{
  "payableAccountId": "account-id-payable",
  "expenseAccountId": "account-id-expense",
  "taxAssetAccountId": "account-id-tax-asset"
}
```

### POST /entities/:entityId/bills/:id/payments

Record a payment for a bill.

**Request Body:**
```json
{
  "amount": "550.00",
  "date": "2024-11-25",
  "method": "BANK_TRANSFER",
  "externalRef": "TXN-9876",
  "bankAccountId": "account-id-bank",
  "payableAccountId": "account-id-payable"
}
```

---

## Intercompany

### POST /intercompany/loan-transfer

Create an intercompany loan transfer (creates journal entries in both entities).

**Request Body:**
```json
{
  "fromEntityId": "entity-parent-id",
  "toEntityId": "entity-subsidiary-id",
  "amount": "25000.00",
  "date": "2024-11-24",
  "description": "Working capital loan",
  "fromLoanAccountId": "account-loan-to-sub",
  "toLoanAccountId": "account-loan-from-parent",
  "fromBankAccountId": "account-bank-parent",
  "toBankAccountId": "account-bank-sub",
  "createdByUserId": "user123"
}
```

**Response:** `201 Created`
```json
{
  "fromJournal": { /* journal in parent entity */ },
  "toJournal": { /* journal in subsidiary entity */ }
}
```

---

## Reports

### GET /entities/:entityId/trial-balance?asOf=YYYY-MM-DD

Generate a trial balance report.

**Query Parameters:**
- `asOf` (required): Date in format `YYYY-MM-DD`

**Example:** `/entities/550e8400.../trial-balance?asOf=2024-11-24`

**Response:** `200 OK`
```json
{
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "asOf": "2024-11-24",
  "accounts": [
    {
      "accountId": "660e8400-e29b-41d4-a716-446655440001",
      "accountCode": "100",
      "accountName": "Bank Account",
      "accountType": "ASSET",
      "debit": "50000.0000",
      "credit": "0.0000",
      "balance": "50000.0000"
    },
    {
      "accountId": "660e8400-e29b-41d4-a716-446655440002",
      "accountCode": "300",
      "accountName": "Owner's Equity",
      "accountType": "EQUITY",
      "debit": "0.0000",
      "credit": "50000.0000",
      "balance": "-50000.0000"
    }
  ],
  "totalDebits": "50000.0000",
  "totalCredits": "50000.0000",
  "isBalanced": true
}
```

### GET /entities/:entityId/pnl?from=YYYY-MM-DD&to=YYYY-MM-DD

Generate a Profit & Loss (Income Statement) report.

**Query Parameters:**
- `from` (required): Start date `YYYY-MM-DD`
- `to` (required): End date `YYYY-MM-DD`

**Example:** `/entities/550e8400.../pnl?from=2024-01-01&to=2024-11-24`

**Response:** `200 OK`
```json
{
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "from": "2024-01-01",
  "to": "2024-11-24",
  "revenue": [
    {
      "accountId": "account-id",
      "accountCode": "400",
      "accountName": "Service Revenue",
      "accountType": "REVENUE",
      "amount": "100000.0000"
    }
  ],
  "expenses": [
    {
      "accountId": "account-id",
      "accountCode": "600",
      "accountName": "Operating Expenses",
      "accountType": "EXPENSE",
      "amount": "30000.0000"
    }
  ],
  "totalRevenue": "100000.0000",
  "totalExpenses": "30000.0000",
  "netProfit": "70000.0000"
}
```

### GET /entities/:entityId/balance-sheet

Get balance sheet as of a specific date.

**Query Parameters:**
- `asOf` (required): Date in YYYY-MM-DD format

### GET /entities/:entityId/booking-summary

Get booking financial summary for a date range.

**Query Parameters:**
- `from` (required): Start date in YYYY-MM-DD format
- `to` (required): End date in YYYY-MM-DD format

**Response:**
```json
{
  "totalBookings": 150,
  "confirmedBookings": 120,
  "completedBookings": 100,
  "cancelledBookings": 10,
  "totalRevenue": "165000.0000",
  "totalMargin": "45000.0000",
  "totalSupplierPayouts": "120000.0000",
  "outstandingDeposits": "6600.0000"
}
```

### GET /entities/:entityId/outstanding-deposits

Get list of bookings with outstanding deposit liabilities.

**Response:**
```json
[
  {
    "bookingId": "uuid",
    "externalBookingId": "EZYCRANE-BOOKING-12345",
    "customerName": "ABC Construction",
    "depositAmount": "330.0000",
    "status": "CONFIRMED",
    "createdAt": "2024-11-24T12:00:00.000Z"
  }
]
```

### GET /entities/:entityId/upcoming-payouts

Get list of bookings that need supplier payouts.

**Response:**
```json
[
  {
    "bookingId": "uuid",
    "externalBookingId": "EZYCRANE-BOOKING-12345",
    "supplierName": "Crane Hire Co",
    "payoutAmount": "800.0000",
    "status": "CONFIRMED"
  }
]
```

### GET /entities/:entityId/margin-report

Get margin earned over a date range.

**Query Parameters:**
- `from` (required): Start date in YYYY-MM-DD format
- `to` (required): End date in YYYY-MM-DD format

**Response:**
```json
{
  "totalMargin": "45000.0000",
  "bookingCount": 100,
  "averageMargin": "450.0000"
}
```

### GET /entities/:entityId/balance-sheet (original)?asOf=YYYY-MM-DD

Generate a Balance Sheet report.

**Query Parameters:**
- `asOf` (required): Date in format `YYYY-MM-DD`

**Example:** `/entities/550e8400.../balance-sheet?asOf=2024-11-24`

**Response:** `200 OK`
```json
{
  "entityId": "550e8400-e29b-41d4-a716-446655440000",
  "asOf": "2024-11-24",
  "assets": [
    {
      "accountId": "account-id",
      "accountCode": "100",
      "accountName": "Bank Account",
      "accountType": "ASSET",
      "balance": "50000.0000"
    }
  ],
  "liabilities": [
    {
      "accountId": "account-id",
      "accountCode": "200",
      "accountName": "Accounts Payable",
      "accountType": "LIABILITY",
      "balance": "10000.0000"
    }
  ],
  "equity": [
    {
      "accountId": "account-id",
      "accountCode": "300",
      "accountName": "Owner's Equity",
      "accountType": "EQUITY",
      "balance": "40000.0000"
    }
  ],
  "totalAssets": "50000.0000",
  "totalLiabilities": "10000.0000",
  "totalEquity": "40000.0000",
  "isBalanced": true
}
```

---

## Bookings

Booking endpoints for EzyCrane marketplace integration.

### POST /bookings

Create or register a booking.

**Request Body:**
```json
{
  "externalBookingId": "EZYCRANE-BOOKING-12345",
  "entityId": "entity-uuid",
  "customerName": "ABC Construction",
  "customerEmail": "accounts@abc.com.au",
  "supplierName": "Crane Hire Co",
  "supplierEmail": "accounts@cranehire.com.au",
  "totalJobAmount": 1100.00,
  "depositAmount": 330.00,
  "marginAmount": 300.00
}
```

**Response:**
```json
{
  "id": "booking-uuid",
  "externalBookingId": "EZYCRANE-BOOKING-12345",
  "entityId": "entity-uuid",
  "customerId": "customer-contact-uuid",
  "supplierId": "supplier-contact-uuid",
  "status": "PENDING",
  "totalJobAmount": "1100.0000",
  "depositAmount": "330.0000",
  "marginAmount": "300.0000",
  "createdAt": "2024-11-24T12:00:00.000Z"
}
```

### POST /bookings/:id/deposit

Record deposit received from customer.

**Request Body:**
```json
{
  "amount": 330.00,
  "date": "2024-11-24",
  "accountIds": {
    "bankAccountId": "uuid",
    "customerDepositsHeldAccountId": "uuid",
    "gstOnIncomeAccountId": "uuid"
  },
  "includeGST": true
}
```

**Response:**
```json
{
  "booking": { /* booking object */ },
  "journal": { /* journal entry object */ }
}
```

### POST /bookings/:id/balance

Record balance payment from customer.

**Request Body:**
```json
{
  "amount": 770.00,
  "date": "2024-11-25",
  "accountIds": {
    "bankAccountId": "uuid",
    "accountsReceivableAccountId": "uuid",
    "gstOnIncomeAccountId": "uuid"
  },
  "includeGST": true
}
```

### POST /bookings/:id/payout

Record supplier payout.

**Request Body:**
```json
{
  "amount": 800.00,
  "date": "2024-11-26",
  "accountIds": {
    "supplierPayoutsAccountId": "uuid",
    "bankAccountId": "uuid"
  }
}
```

### POST /bookings/:id/margin

Recognize marketplace margin revenue.

**Request Body:**
```json
{
  "marginAmount": 300.00,
  "date": "2024-11-27",
  "accountIds": {
    "customerDepositsHeldAccountId": "uuid",
    "marginRevenueAccountId": "uuid",
    "gstOnIncomeAccountId": "uuid"
  },
  "includeGST": true
}
```

### POST /bookings/:id/cancel

Cancel a booking with different scenarios.

**Request Body:**
```json
{
  "date": "2024-11-28",
  "accountIds": { /* required account IDs */ },
  "scenario": "DEPOSIT_KEPT",
  "newSupplierId": "uuid (optional, for TRANSFER_TO_NEW_SUPPLIER)"
}
```

**Scenarios:**
- `DEPOSIT_KEPT` - Deposit kept as cancellation fee
- `DEPOSIT_REFUNDED` - Deposit refunded to customer
- `TRANSFER_TO_NEW_SUPPLIER` - Deposit transferred to new supplier

### POST /bookings/:id/refund

Record refund to customer.

**Request Body:**
```json
{
  "amount": 330.00,
  "date": "2024-11-29",
  "accountIds": {
    "customerDepositsHeldAccountId": "uuid",
    "bankAccountId": "uuid"
  },
  "refundFromDeposit": true
}
```

### GET /bookings/:id

Get booking by ID with events.

**Response:**
```json
{
  "booking": {
    "id": "booking-uuid",
    "externalBookingId": "EZYCRANE-BOOKING-12345",
    "status": "COMPLETED",
    /* ... other fields */
  },
  "events": [
    {
      "id": "event-uuid",
      "type": "DEPOSIT",
      "amount": "330.0000",
      "journalEntryId": "journal-uuid",
      "createdAt": "2024-11-24T12:00:00.000Z"
    }
  ]
}
```

### GET /bookings/external/:entityId/:externalBookingId

Get booking by external booking ID.

**Response:** Same as GET /bookings/:id

---

## Error Responses

All errors follow this format:

**400 Bad Request** (Validation Error)
```json
{
  "error": "Journal entry is unbalanced: debits (1000.0000) != credits (900.0000)",
  "statusCode": 400
}
```

**404 Not Found**
```json
{
  "error": "Entity not found",
  "statusCode": 404
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Authentication

**Note:** Authentication middleware hooks are stubbed in the current version. In production, add JWT or session-based authentication to protect endpoints.

Example middleware integration:
```typescript
app.use('/entities', authMiddleware, entitiesRouter);
```

---

## Rate Limiting

**Note:** Rate limiting is not currently implemented. Consider adding rate limiting middleware for production use.

---

## Versioning

API version: `v1.0.0`

Future versions may use URL versioning: `/v2/entities`
