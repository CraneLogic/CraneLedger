# EzyCrane Integration Guide

This document explains how to integrate CraneLedger with the EzyCrane crane hire marketplace application.

## Overview

CraneLedger serves as the **financial engine** for EzyCrane, automatically converting all booking lifecycle events into proper double-entry journal entries. This ensures that all financial transactions are recorded correctly and provide a complete audit trail.

## Architecture

```
┌─────────────────────────────────────────┐
│         EzyCrane Application            │
│  (Customer bookings, supplier mgmt)     │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS API Calls
               │
┌──────────────▼──────────────────────────┐
│          CraneLedger API                │
│  (Financial truth system)               │
│                                         │
│  • Bookings                             │
│  • Deposits                             │
│  • Payouts                              │
│  • Margin recognition                   │
│  • Cancellations                        │
│  • Refunds                              │
└─────────────────────────────────────────┘
```

## Booking Lifecycle

### 1. Customer Books Crane

**EzyCrane Action:** Customer selects crane, date, and duration

**CraneLedger API Call:**

```http
POST /bookings
Content-Type: application/json

{
  "externalBookingId": "EZYCRANE-BOOKING-12345",
  "entityId": "uuid-of-ezycrane-entity",
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
  "entityId": "uuid-of-ezycrane-entity",
  "customerId": "customer-contact-uuid",
  "supplierId": "supplier-contact-uuid",
  "status": "PENDING",
  "totalJobAmount": "1100.0000",
  "depositAmount": "330.0000",
  "marginAmount": "300.0000",
  "createdAt": "2024-11-24T12:00:00.000Z"
}
```

**Notes:**
- Creates customer and supplier contacts if they don't exist
- Booking status starts as `PENDING`
- No journal entries created yet

### 2. Customer Pays Deposit

**EzyCrane Action:** Customer pays 30% deposit via direct deposit

**CraneLedger API Call:**

```http
POST /bookings/{booking-id}/deposit
Content-Type: application/json

{
  "amount": 330.00,
  "date": "2024-11-24",
  "accountIds": {
    "bankAccountId": "uuid-of-bank-account",
    "customerDepositsHeldAccountId": "uuid-of-deposits-held-account",
    "gstOnIncomeAccountId": "uuid-of-gst-liability-account"
  },
  "includeGST": true
}
```

**Journal Entry Created:**

```
Date: 2024-11-24
Description: Deposit received for booking EZYCRANE-BOOKING-12345
Source: EZYCRANE_APP

DR  Bank / Clearing                    $330.00
    CR  Customer Deposits Held                 $300.00
    CR  GST on Income                           $30.00
```

**Accounting Logic:**
- Deposit is recorded as a **liability** (Customer Deposits Held)
- GST is calculated: `330 - 330/1.1 = $30`
- Booking status changes to `CONFIRMED`

### 3. Job Completed - Balance Payment

**EzyCrane Action:** Job completed, customer pays remaining balance

**CraneLedger API Call:**

```http
POST /bookings/{booking-id}/balance
Content-Type: application/json

{
  "amount": 770.00,
  "date": "2024-11-25",
  "accountIds": {
    "bankAccountId": "uuid-of-bank-account",
    "accountsReceivableAccountId": "uuid-of-ar-account",
    "gstOnIncomeAccountId": "uuid-of-gst-liability-account"
  },
  "includeGST": true
}
```

**Journal Entry Created:**

```
Date: 2024-11-25
Description: Balance payment for booking EZYCRANE-BOOKING-12345
Source: EZYCRANE_APP

DR  Bank / Clearing                    $770.00
    CR  Accounts Receivable                    $700.00
    CR  GST on Income                           $70.00
```

### 4. Pay Supplier

**EzyCrane Action:** Pay supplier their wholesale rate

**CraneLedger API Call:**

```http
POST /bookings/{booking-id}/payout
Content-Type: application/json

{
  "amount": 800.00,
  "date": "2024-11-26",
  "accountIds": {
    "supplierPayoutsAccountId": "uuid-of-cogs-account",
    "bankAccountId": "uuid-of-bank-account"
  }
}
```

**Journal Entry Created:**

```
Date: 2024-11-26
Description: Supplier payout for booking EZYCRANE-BOOKING-12345
Source: EZYCRANE_APP

DR  Supplier Payouts (COGS)            $800.00
    CR  Bank / Clearing                        $800.00
```

**Accounting Logic:**
- Supplier payout is recorded as **Cost of Goods Sold (COGS)**
- Reduces bank balance

### 5. Recognize Margin Revenue

**EzyCrane Action:** Job complete, recognize EzyCrane's margin

**CraneLedger API Call:**

```http
POST /bookings/{booking-id}/margin
Content-Type: application/json

{
  "marginAmount": 300.00,
  "date": "2024-11-27",
  "accountIds": {
    "customerDepositsHeldAccountId": "uuid-of-deposits-held-account",
    "marginRevenueAccountId": "uuid-of-margin-revenue-account",
    "gstOnIncomeAccountId": "uuid-of-gst-liability-account"
  },
  "includeGST": true
}
```

**Journal Entry Created:**

```
Date: 2024-11-27
Description: Margin revenue recognized for booking EZYCRANE-BOOKING-12345
Source: EZYCRANE_APP

DR  Customer Deposits Held             $300.00
    CR  Marketplace Margin Revenue             $272.73
    CR  GST on Income                           $27.27
```

**Accounting Logic:**
- Releases deposit liability
- Recognizes revenue (margin component)
- Booking status changes to `COMPLETED`

## Cancellation Scenarios

### Scenario 1: Customer Cancels - Deposit Kept

**Use Case:** Customer cancels, EzyCrane keeps deposit as cancellation fee

**API Call:**

```http
POST /bookings/{booking-id}/cancel
Content-Type: application/json

{
  "date": "2024-11-28",
  "scenario": "DEPOSIT_KEPT",
  "accountIds": {
    "customerDepositsHeldAccountId": "uuid",
    "marginRevenueAccountId": "uuid",
    "gstOnIncomeAccountId": "uuid"
  }
}
```

**Journal Entry:**

```
DR  Customer Deposits Held             $330.00
    CR  Margin Revenue                         $300.00
    CR  GST on Income                           $30.00
```

### Scenario 2: Customer Cancels - Deposit Refunded

**Use Case:** Customer cancels, EzyCrane refunds deposit

**API Call:**

```http
POST /bookings/{booking-id}/cancel
Content-Type: application/json

{
  "date": "2024-11-28",
  "scenario": "DEPOSIT_REFUNDED",
  "accountIds": {
    "customerDepositsHeldAccountId": "uuid",
    "bankAccountId": "uuid"
  }
}
```

**Journal Entry:**

```
DR  Customer Deposits Held             $330.00
    CR  Bank / Clearing                        $330.00
```

### Scenario 3: Supplier Cancels - Transfer to New Supplier

**Use Case:** Original supplier cancels, deposit transferred to new supplier

**API Call:**

```http
POST /bookings/{booking-id}/cancel
Content-Type: application/json

{
  "date": "2024-11-28",
  "scenario": "TRANSFER_TO_NEW_SUPPLIER",
  "newSupplierId": "uuid-of-new-supplier",
  "accountIds": {
    "customerDepositsHeldAccountId": "uuid"
  }
}
```

**Journal Entry:**

```
DR  Customer Deposits Held (Old)       $330.00
    CR  Customer Deposits Held (New)           $330.00
```

**Notes:**
- No P&L impact
- Deposit remains as liability
- Booking supplier updated to new supplier

## Refunds

**Use Case:** Refund customer (partial or full)

**API Call:**

```http
POST /bookings/{booking-id}/refund
Content-Type: application/json

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

**Journal Entry:**

```
DR  Customer Deposits Held             $330.00
    CR  Bank / Clearing                        $330.00
```

## Required Chart of Accounts

Before using the booking API, ensure these accounts exist:

| Code | Name | Type | Purpose |
|------|------|------|---------|
| 110 | Bank / Clearing | ASSET | Cash movements |
| 112 | Accounts Receivable | ASSET | Balance payments |
| 200 | Crane Hire Sales | REVENUE | Total job revenue |
| 201 | Marketplace Margin Revenue | REVENUE | EzyCrane's margin |
| 300 | Supplier Payouts (COGS) | EXPENSE | Cost of sales |
| 800 | Customer Deposits Held | LIABILITY | Deposits not yet earned |
| 210 | GST on Income | LIABILITY | GST collected |

## Financial Reports

### Booking Summary

Get financial summary for bookings in a date range:

```http
GET /entities/{entity-id}/booking-summary?from=2024-01-01&to=2024-11-24
```

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

### Outstanding Deposits

Get list of bookings with outstanding deposit liabilities:

```http
GET /entities/{entity-id}/outstanding-deposits
```

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

### Upcoming Payouts

Get list of bookings that need supplier payouts:

```http
GET /entities/{entity-id}/upcoming-payouts
```

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

### Margin Report

Get margin earned over a date range:

```http
GET /entities/{entity-id}/margin-report?from=2024-01-01&to=2024-11-24
```

**Response:**

```json
{
  "totalMargin": "45000.0000",
  "bookingCount": 100,
  "averageMargin": "450.0000"
}
```

## Integration Best Practices

### 1. Idempotency

Always use unique `externalBookingId` values. CraneLedger will reject duplicate bookings for the same entity.

### 2. Error Handling

Wrap all API calls in try-catch blocks:

```typescript
try {
  const result = await fetch('https://craneledger-api.com/bookings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify(bookingData)
  });
  
  if (!result.ok) {
    throw new Error(`CraneLedger API error: ${result.statusText}`);
  }
  
  const booking = await result.json();
  return booking;
} catch (error) {
  logger.error('Failed to create booking in CraneLedger', { error });
  // Handle error - maybe queue for retry
}
```

### 3. Webhook Integration (Future)

Consider implementing webhooks to get notified when:
- Booking status changes
- Journal entries are posted
- Errors occur

### 4. Account ID Caching

Cache account IDs in your application to avoid repeated lookups:

```typescript
const ACCOUNT_IDS = {
  bankAccountId: process.env.CRANELEDGER_BANK_ACCOUNT_ID,
  customerDepositsHeldAccountId: process.env.CRANELEDGER_DEPOSITS_HELD_ACCOUNT_ID,
  accountsReceivableAccountId: process.env.CRANELEDGER_AR_ACCOUNT_ID,
  marginRevenueAccountId: process.env.CRANELEDGER_MARGIN_REVENUE_ACCOUNT_ID,
  supplierPayoutsAccountId: process.env.CRANELEDGER_SUPPLIER_PAYOUTS_ACCOUNT_ID,
  gstOnIncomeAccountId: process.env.CRANELEDGER_GST_ON_INCOME_ACCOUNT_ID,
};
```

### 5. Audit Trail

Every booking event is linked to a journal entry. Use this for:
- Financial audits
- Reconciliation
- Customer inquiries
- Dispute resolution

## Example Integration Flow

```typescript
// In your EzyCrane backend

import axios from 'axios';

const CRANELEDGER_API = process.env.CRANELEDGER_API_URL;
const EZYCRANE_ENTITY_ID = process.env.EZYCRANE_ENTITY_ID;
const ACCOUNT_IDS = { /* ... */ };

export async function handleBookingCreated(booking: Booking) {
  // 1. Create booking in CraneLedger
  const ledgerBooking = await axios.post(
    `${CRANELEDGER_API}/bookings`,
    {
      externalBookingId: booking.id,
      entityId: EZYCRANE_ENTITY_ID,
      customerName: booking.customer.name,
      customerEmail: booking.customer.email,
      supplierName: booking.supplier.name,
      supplierEmail: booking.supplier.email,
      totalJobAmount: booking.totalAmount,
      depositAmount: booking.depositAmount,
      marginAmount: booking.marginAmount,
    }
  );
  
  // Store CraneLedger booking ID in your database
  await db.bookings.update(booking.id, {
    ledgerBookingId: ledgerBooking.data.id
  });
}

export async function handleDepositReceived(booking: Booking, payment: Payment) {
  // 2. Record deposit in CraneLedger
  await axios.post(
    `${CRANELEDGER_API}/bookings/${booking.ledgerBookingId}/deposit`,
    {
      amount: payment.amount,
      date: payment.date,
      accountIds: ACCOUNT_IDS,
      includeGST: true,
    }
  );
}

export async function handleJobCompleted(booking: Booking) {
  // 3. Record balance payment
  await axios.post(
    `${CRANELEDGER_API}/bookings/${booking.ledgerBookingId}/balance`,
    {
      amount: booking.balanceAmount,
      date: new Date().toISOString().split('T')[0],
      accountIds: ACCOUNT_IDS,
      includeGST: true,
    }
  );
  
  // 4. Record supplier payout
  await axios.post(
    `${CRANELEDGER_API}/bookings/${booking.ledgerBookingId}/payout`,
    {
      amount: booking.supplierPayoutAmount,
      date: new Date().toISOString().split('T')[0],
      accountIds: ACCOUNT_IDS,
    }
  );
  
  // 5. Recognize margin
  await axios.post(
    `${CRANELEDGER_API}/bookings/${booking.ledgerBookingId}/margin`,
    {
      marginAmount: booking.marginAmount,
      date: new Date().toISOString().split('T')[0],
      accountIds: ACCOUNT_IDS,
      includeGST: true,
    }
  );
}
```

## Troubleshooting

### Error: "Booking already exists"

**Cause:** Duplicate `externalBookingId` for the same entity

**Solution:** Ensure unique booking IDs, or retrieve existing booking:

```http
GET /bookings/external/{entity-id}/{external-booking-id}
```

### Error: "Booking does not have a supplier assigned"

**Cause:** Attempting to record payout for booking without supplier

**Solution:** Ensure supplier is assigned when creating booking, or update booking before payout

### Error: "Unbalanced journal entry"

**Cause:** Internal calculation error (should not happen)

**Solution:** Contact support with booking details

### Error: "Account not found"

**Cause:** Invalid account ID in `accountIds` parameter

**Solution:** Verify account IDs exist and belong to the correct entity

## Support

For integration support:
- Check the [API Documentation](api.md)
- Review the [Accounting Model](accounting-model.md)
- Contact: support@cranelogic.com.au

## Summary

CraneLedger provides a **complete financial engine** for EzyCrane, handling:

✅ Deposit liabilities  
✅ Revenue recognition  
✅ Cost of goods sold  
✅ GST tracking  
✅ Cancellations and refunds  
✅ Complete audit trail  
✅ Financial reporting  

All with proper double-entry accounting and immutable history.
