# CraneLedger Accounting Model

This document explains the double-entry accounting rules and how invoices, bills, and payments map to journal entries in CraneLedger.

## Table of Contents

- [Double-Entry Fundamentals](#double-entry-fundamentals)
- [Account Types](#account-types)
- [Journal Entry Rules](#journal-entry-rules)
- [Invoice Workflow](#invoice-workflow)
- [Bill Workflow](#bill-workflow)
- [Payment Processing](#payment-processing)
- [Intercompany Transactions](#intercompany-transactions)
- [Tax Handling](#tax-handling)
- [Common Scenarios](#common-scenarios)

---

## Double-Entry Fundamentals

### The Accounting Equation

```
Assets = Liabilities + Equity
```

This fundamental equation must **always** balance.

### Debits and Credits

Every transaction affects at least two accounts. The total debits must equal total credits:

```
∑ Debits = ∑ Credits
```

**Rules by Account Type:**

| Account Type | Increase | Decrease | Normal Balance |
|--------------|----------|----------|----------------|
| **Asset**    | Debit    | Credit   | Debit          |
| **Liability**| Credit   | Debit    | Credit         |
| **Equity**   | Credit   | Debit    | Credit         |
| **Revenue**  | Credit   | Debit    | Credit         |
| **Expense**  | Debit    | Credit   | Debit          |

### Example: Initial Capital Investment

Owner invests $50,000 cash:

```
DR Bank Account (Asset)        $50,000
  CR Owner's Equity (Equity)           $50,000
```

**Explanation:**
- Bank Account (Asset) increases → Debit
- Owner's Equity (Equity) increases → Credit
- Debits ($50,000) = Credits ($50,000) ✓

---

## Account Types

### 1. Assets (ASSET)

Resources owned by the entity.

**Examples:**
- `100` – Bank Account
- `110` – Accounts Receivable
- `120` – Inventory
- `150` – Equipment
- `160` – GST on Expenses (tax asset)

**Normal Balance:** Debit

### 2. Liabilities (LIABILITY)

Obligations owed to others.

**Examples:**
- `200` – Accounts Payable
- `210` – GST Liability
- `220` – Loan Payable
- `230` – Accrued Expenses

**Normal Balance:** Credit

### 3. Equity (EQUITY)

Owner's stake in the entity.

**Examples:**
- `300` – Owner's Capital
- `310` – Retained Earnings
- `320` – Current Year Earnings

**Normal Balance:** Credit

### 4. Revenue (REVENUE)

Income earned from operations.

**Examples:**
- `400` – Service Revenue
- `410` – Sales Revenue
- `420` – Interest Income

**Normal Balance:** Credit

### 5. Expenses (EXPENSE)

Costs incurred to generate revenue.

**Examples:**
- `600` – Operating Expenses
- `610` – Salaries & Wages
- `620` – Rent Expense
- `630` – Marketing Expense
- `640` – Cloud Hosting

**Normal Balance:** Debit

---

## Journal Entry Rules

### Structure

Every journal entry has:

1. **Header** (journal_entries table):
   - Entity ID
   - Date
   - Description
   - Source system (EZYCRANE_APP, AI_CFO, etc.)
   - Source reference (external ID)
   - Status (DRAFT, POSTED, VOIDED)

2. **Lines** (journal_lines table):
   - Account ID
   - Debit amount (≥ 0)
   - Credit amount (≥ 0)
   - Tax code (optional)
   - Tax amount
   - Memo

### Validation Rules

1. **At least one line** must exist
2. **Each line** must have either debit OR credit (not both, not neither)
3. **Total debits** must equal **total credits**
4. **Amounts** must be non-negative
5. **Status** must be POSTED for the entry to affect reports

### Example Journal Entry

```json
{
  "date": "2024-11-24",
  "description": "Sale to customer ABC",
  "sourceSystem": "EZYCRANE_APP",
  "sourceReference": "BOOKING-12345",
  "lines": [
    {
      "accountId": "account-receivable-id",
      "debit": "1100.00",
      "credit": "0",
      "memo": "Invoice INV-001"
    },
    {
      "accountId": "account-revenue-id",
      "debit": "0",
      "credit": "1000.00",
      "memo": "Service revenue"
    },
    {
      "accountId": "account-gst-liability-id",
      "debit": "0",
      "credit": "100.00",
      "memo": "GST collected"
    }
  ]
}
```

**Validation:**
- Debits: $1,100
- Credits: $1,000 + $100 = $1,100
- Balanced ✓

---

## Invoice Workflow

Invoices represent **Accounts Receivable** (money owed TO the entity by customers).

### Step 1: Create Invoice (DRAFT)

```typescript
POST /entities/:entityId/invoices
{
  "contactId": "customer-id",
  "number": "INV-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "subtotalAmount": "1000.00",
  "taxAmount": "100.00"
}
```

**Status:** `DRAFT`

**No journal entry created yet.**

### Step 2: Post Invoice to Ledger

```typescript
POST /entities/:entityId/invoices/:id/post
{
  "receivableAccountId": "110",
  "revenueAccountId": "400",
  "taxLiabilityAccountId": "210"
}
```

**Journal Entry Created:**

```
DR Accounts Receivable (110)    $1,100.00
  CR Service Revenue (400)                  $1,000.00
  CR GST Liability (210)                       $100.00
```

**Status:** `SENT`

**Explanation:**
- Customer now owes us $1,100 → Increase Asset (DR)
- We earned $1,000 revenue → Increase Revenue (CR)
- We owe $100 GST to government → Increase Liability (CR)

### Step 3: Record Payment

```typescript
POST /entities/:entityId/invoices/:id/payments
{
  "amount": "1100.00",
  "date": "2024-11-25",
  "method": "STRIPE",
  "bankAccountId": "100",
  "receivableAccountId": "110"
}
```

**Journal Entry Created:**

```
DR Bank Account (100)           $1,100.00
  CR Accounts Receivable (110)              $1,100.00
```

**Status:** `PAID`

**Explanation:**
- Cash received → Increase Asset (DR)
- Customer no longer owes us → Decrease Asset (CR)

---

## Bill Workflow

Bills represent **Accounts Payable** (money owed BY the entity to suppliers).

### Step 1: Create Bill (DRAFT)

```typescript
POST /entities/:entityId/bills
{
  "contactId": "supplier-id",
  "number": "BILL-001",
  "issueDate": "2024-11-24",
  "dueDate": "2024-12-24",
  "subtotalAmount": "500.00",
  "taxAmount": "50.00"
}
```

**Status:** `DRAFT`

### Step 2: Post Bill to Ledger

```typescript
POST /entities/:entityId/bills/:id/post
{
  "payableAccountId": "200",
  "expenseAccountId": "640",
  "taxAssetAccountId": "160"
}
```

**Journal Entry Created:**

```
DR Cloud Hosting Expense (640)  $500.00
DR GST on Expenses (160)         $50.00
  CR Accounts Payable (200)                 $550.00
```

**Status:** `SENT`

**Explanation:**
- Expense incurred → Increase Expense (DR)
- GST we can claim back → Increase Asset (DR)
- We owe supplier $550 → Increase Liability (CR)

### Step 3: Record Payment

```typescript
POST /entities/:entityId/bills/:id/payments
{
  "amount": "550.00",
  "date": "2024-11-25",
  "method": "BANK_TRANSFER",
  "bankAccountId": "100",
  "payableAccountId": "200"
}
```

**Journal Entry Created:**

```
DR Accounts Payable (200)       $550.00
  CR Bank Account (100)                     $550.00
```

**Status:** `PAID`

**Explanation:**
- We no longer owe supplier → Decrease Liability (DR)
- Cash paid out → Decrease Asset (CR)

---

## Payment Processing

### Incoming Payments (Customer Payments)

**Direction:** `INCOMING`

**Journal:**
```
DR Bank / Clearing Account
  CR Accounts Receivable
```

### Outgoing Payments (Supplier Payments)

**Direction:** `OUTGOING`

**Journal:**
```
DR Accounts Payable
  CR Bank / Clearing Account
```

### Payment Methods

- `STRIPE` – Stripe payment processor
- `BANK_TRANSFER` – Direct bank transfer
- `PAYPAL` – PayPal
- `CASH` – Cash payment
- `OTHER` – Other methods

### Partial Payments

The `invoice_payments` and `bill_payments` link tables support partial payments:

```typescript
{
  "invoiceId": "invoice-id",
  "paymentId": "payment-id",
  "amountApplied": "500.00"  // Partial amount
}
```

**Invoice Status:**
- `DRAFT` → Not posted
- `SENT` → Posted, awaiting payment
- `PARTIAL` → Partially paid
- `PAID` → Fully paid
- `VOIDED` → Cancelled

---

## Intercompany Transactions

### Loan from Parent to Subsidiary

**Scenario:** CraneLogic lends $25,000 to EzyCrane.

**In CraneLogic books:**

```
DR Loan to EzyCrane (Asset)     $25,000
  CR Bank Account (Asset)                   $25,000
```

**In EzyCrane books:**

```
DR Bank Account (Asset)         $25,000
  CR Loan from CraneLogic (Liability)       $25,000
```

**API Call:**

```typescript
POST /intercompany/loan-transfer
{
  "fromEntityId": "cranelogic-id",
  "toEntityId": "ezycrane-id",
  "amount": "25000.00",
  "date": "2024-11-24",
  "description": "Working capital loan",
  "fromLoanAccountId": "loan-to-ezycrane-account",
  "toLoanAccountId": "loan-from-cranelogic-account",
  "fromBankAccountId": "cranelogic-bank",
  "toBankAccountId": "ezycrane-bank"
}
```

**Result:** Two journal entries created (one in each entity).

### Consolidation

For group-level reporting, intercompany loans should eliminate:

- CraneLogic's "Loan to EzyCrane" (Asset)
- EzyCrane's "Loan from CraneLogic" (Liability)

These cancel out in consolidated statements.

---

## Tax Handling

### GST (Goods and Services Tax)

In Australia, GST is typically 10%.

### Tax on Sales (Output Tax)

**Invoice with GST:**

```
Subtotal:  $1,000.00
GST (10%):   $100.00
Total:     $1,100.00
```

**Journal:**

```
DR Accounts Receivable          $1,100.00
  CR Revenue                                $1,000.00
  CR GST Liability                            $100.00
```

**GST Liability** is owed to the government.

### Tax on Purchases (Input Tax)

**Bill with GST:**

```
Subtotal:  $500.00
GST (10%):  $50.00
Total:     $550.00
```

**Journal:**

```
DR Expense                      $500.00
DR GST on Expenses               $50.00
  CR Accounts Payable                       $550.00
```

**GST on Expenses** is an asset (can be claimed back).

### BAS (Business Activity Statement)

At the end of the period:

**Net GST Payable:**

```
GST Liability (collected) - GST on Expenses (paid) = Net GST
```

**If net is positive (owe government):**

```
DR GST Liability
DR GST on Expenses
  CR Bank Account
```

**If net is negative (government owes refund):**

```
DR Bank Account
  CR GST Liability
  CR GST on Expenses
```

---

## Common Scenarios

### 1. Initial Capital Investment

Owner invests $50,000:

```
DR Bank Account (100)           $50,000
  CR Owner's Capital (300)                  $50,000
```

### 2. Purchase Equipment

Buy equipment for $10,000 cash:

```
DR Equipment (150)              $10,000
  CR Bank Account (100)                     $10,000
```

### 3. Pay Rent

Monthly rent of $2,000:

```
DR Rent Expense (620)            $2,000
  CR Bank Account (100)                      $2,000
```

### 4. Receive Loan

Borrow $20,000 from bank:

```
DR Bank Account (100)           $20,000
  CR Loan Payable (220)                     $20,000
```

### 5. Pay Salaries

Pay $5,000 in salaries:

```
DR Salaries Expense (610)        $5,000
  CR Bank Account (100)                      $5,000
```

### 6. Depreciation

Record $500 depreciation on equipment:

```
DR Depreciation Expense (650)      $500
  CR Accumulated Depreciation (155)           $500
```

### 7. Correct an Error (Reversal)

Original entry (incorrect):

```
DR Rent Expense                  $3,000
  CR Bank Account                            $3,000
```

Reversal:

```
DR Bank Account                  $3,000
  CR Rent Expense                            $3,000
```

Then post correct entry:

```
DR Rent Expense                  $2,000
  CR Bank Account                            $2,000
```

---

## Reporting

### Trial Balance

Lists all accounts with their debit and credit totals.

**Purpose:** Verify that total debits = total credits.

**Example:**

| Account Code | Account Name          | Debit    | Credit   | Balance  |
|--------------|-----------------------|----------|----------|----------|
| 100          | Bank Account          | 50,000   | 10,000   | 40,000   |
| 110          | Accounts Receivable   | 5,000    | 0        | 5,000    |
| 200          | Accounts Payable      | 0        | 3,000    | (3,000)  |
| 300          | Owner's Equity        | 0        | 50,000   | (50,000) |
| 400          | Service Revenue       | 0        | 10,000   | (10,000) |
| 600          | Operating Expenses    | 8,000    | 0        | 8,000    |
| **Total**    |                       | **63,000** | **63,000** | **0**  |

**Balanced:** ✓

### Profit & Loss (Income Statement)

Shows revenue and expenses over a period.

**Formula:**

```
Net Profit = Total Revenue - Total Expenses
```

**Example (Jan 1 - Nov 24, 2024):**

| Category  | Account               | Amount   |
|-----------|-----------------------|----------|
| **Revenue** |                     |          |
|           | Service Revenue       | 100,000  |
|           | **Total Revenue**     | **100,000** |
| **Expenses** |                    |          |
|           | Operating Expenses    | 30,000   |
|           | Salaries              | 40,000   |
|           | Rent                  | 12,000   |
|           | **Total Expenses**    | **82,000** |
| **Net Profit** |                 | **18,000** |

### Balance Sheet

Shows assets, liabilities, and equity at a point in time.

**Formula:**

```
Assets = Liabilities + Equity
```

**Example (As of Nov 24, 2024):**

| **Assets**              | Amount   |
|-------------------------|----------|
| Bank Account            | 40,000   |
| Accounts Receivable     | 5,000    |
| Equipment               | 10,000   |
| **Total Assets**        | **55,000** |

| **Liabilities**         | Amount   |
|-------------------------|----------|
| Accounts Payable        | 3,000    |
| Loan Payable            | 20,000   |
| **Total Liabilities**   | **23,000** |

| **Equity**              | Amount   |
|-------------------------|----------|
| Owner's Capital         | 50,000   |
| Retained Earnings       | (18,000) |
| **Total Equity**        | **32,000** |

**Verification:**
```
Assets (55,000) = Liabilities (23,000) + Equity (32,000) ✓
```

---

## Best Practices

1. **Always balance entries** – Verify debits = credits before posting
2. **Use descriptive memos** – Help future AI and human analysis
3. **Link to source systems** – Use `sourceSystem` and `sourceReference`
4. **Never delete** – Use reversals to correct errors
5. **Reconcile regularly** – Match bank statements to ledger
6. **Separate concerns** – Use different accounts for different purposes
7. **Document assumptions** – Add notes for complex transactions
8. **Review reports** – Check trial balance, P&L, and balance sheet regularly

---

## Conclusion

CraneLedger's accounting model is built on **solid double-entry principles** with strong enforcement of balancing rules. By understanding how invoices, bills, and payments map to journal entries, you can confidently use the system for accurate financial record-keeping.
