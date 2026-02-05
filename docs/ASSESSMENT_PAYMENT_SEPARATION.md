# Assessment and Payment Module Separation

## Overview

The system separates **Assessment** (calculation and assessment creation) from **Payment** (payment processing and tracking). This ensures clear separation of concerns and proper module boundaries.

---

## Module Responsibilities

### Assessment Module
**Purpose**: Calculate what's due and create assessments

**Responsibilities**:
- ✅ Calculate tuition, discounts, fees
- ✅ Create and manage assessments
- ✅ Store assessment data (what's due)
- ✅ Manage assessment status (draft, finalized, cancelled)
- ✅ Handle reassessments

**Does NOT**:
- ❌ Process payments
- ❌ Track payment status
- ❌ Calculate payment balances
- ❌ Update payment schedules based on payments

**API Endpoints**:
- `GET /api/auth/assessment` - Fetch assessment data (no payment info)
- `POST /api/auth/assessment` - Create/update assessment

---

### Payment Module
**Purpose**: Handle all payment processing and tracking

**Responsibilities**:
- ✅ Record payments
- ✅ Calculate payment balances
- ✅ Update payment schedule status (is_paid)
- ✅ Track payment history
- ✅ Determine if assessment is fully paid
- ✅ Handle payment updates and cancellations

**API Endpoints**:
- `POST /api/auth/payment` - Record a payment
- `GET /api/auth/payment?assessmentId=X` - Get payment summary and history
- `PATCH /api/auth/payment` - Update payment record
- `DELETE /api/auth/payment?paymentId=X` - Void/cancel payment

---

## Data Flow

### Assessment Creation Flow
```
1. User creates assessment
   ↓
2. Assessment Module calculates totals
   ↓
3. Assessment saved with status='draft'
   ↓
4. User finalizes → status='finalized'
   ↓
5. Assessment is ready for payment
```

### Payment Processing Flow
```
1. User processes payment
   ↓
2. Payment Module validates assessment is finalized
   ↓
3. Payment Module creates payment record
   ↓
4. Payment Module updates payment_schedule (if installment)
   ↓
5. Payment Module calculates new balance
   ↓
6. Payment Module returns payment summary
```

---

## Database Schema

### Assessment Table
- Stores: What's due, calculation results
- Status: `draft`, `finalized`, `cancelled` (NOT `paid`)
- Does NOT track: Payment status, balances

### Payment Tables
- `student_payment`: Payment transactions
- `payment_schedule`: Installment schedule (updated by Payment Module)

---

## API Examples

### Get Assessment (No Payment Info)
```typescript
GET /api/auth/assessment?studentNumber=123&academicYear=2024-2025&semester=1

Response:
{
  id: 1,
  student_number: "123",
  total_due_cash: 50000,
  total_due_installment: 52500,
  payment_mode: "cash",
  status: "finalized"
  // NO payment balance info
}
```

### Get Payment Summary (Payment Module)
```typescript
GET /api/auth/payment?assessmentId=1

Response:
{
  success: true,
  data: {
    assessment: { ... },
    payments: [ ... ],
    payment_schedule: [ ... ],
    summary: {
      total_paid: 25000,
      total_due: 50000,
      remaining_balance: 25000,
      is_fully_paid: false
    }
  }
}
```

### Record Payment (Payment Module)
```typescript
POST /api/auth/payment
{
  assessmentId: 1,
  amountPaid: 10000,
  paymentType: "cash",
  referenceNo: "OR-12345",
  scheduleLabel: "Prelim" // Optional, for installment payments
}

Response:
{
  success: true,
  data: {
    payment: { ... },
    total_paid: 10000,
    remaining_balance: 40000,
    payment_schedule: [ ... ], // Updated with is_paid flags
    is_fully_paid: false
  }
}
```

---

## Benefits of Separation

1. **Clear Responsibilities**: Each module has a single, well-defined purpose
2. **Easier Maintenance**: Changes to payment logic don't affect assessment logic
3. **Better Testing**: Can test assessment and payment logic independently
4. **Scalability**: Payment module can be extended without touching assessment
5. **Audit Trail**: Clear separation makes audit trails easier to maintain

---

## Migration Notes

### Removed from Assessment Module:
- ❌ Payment balance calculation in GET endpoint
- ❌ `paid` status (payment status calculated dynamically)
- ❌ Payment processing logic

### Added to Payment Module:
- ✅ Payment balance calculation
- ✅ Payment schedule updates
- ✅ Payment status determination
- ✅ Payment history management

---

## Integration Points

### Assessment → Payment
- Assessment must be `finalized` before payments can be processed
- Payment Module reads assessment data to determine what's due
- Payment Module updates `payment_schedule.is_paid` based on payments

### Payment → Assessment
- Payment Module does NOT modify assessment data
- Payment status is calculated, not stored in assessment
- Reassessments can be created regardless of payment status

---

## Status Lifecycle

### Assessment Status (Assessment Module)
```
draft → finalized → cancelled
```

### Payment Status (Payment Module - Calculated)
```
Unpaid → Partial → Fully Paid
```

These are independent - an assessment can be finalized but unpaid, or fully paid but still finalized (not cancelled).

