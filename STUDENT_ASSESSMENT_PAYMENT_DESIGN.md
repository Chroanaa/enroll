# Student Assessment Payment Module - Design Document

## Table of Contents
1. [System Architecture](#system-architecture)
2. [UI Structure & Layout](#ui-structure--layout)
3. [Calculation Flow](#calculation-flow)
4. [Edge Case Handling](#edge-case-handling)
5. [Database Design & Save Flow](#database-design--save-flow)
6. [Status Lifecycle](#status-lifecycle)
7. [Validation Rules](#validation-rules)
8. [State Management](#state-management)

---

## System Architecture

### Overview
The Student Assessment Payment module is a financial computation and management system that calculates tuition, applies discounts, adds fees, and manages payment schedules for student enrollments.

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                  Assessment Management                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Subject    │  │   Payment    │  │   Schedule   │    │
│  │  Management  │→ │  Calculation │→ │  Management  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│         │                 │                   │            │
│         └─────────────────┴───────────────────┘            │
│                            │                                │
│                  ┌─────────▼─────────┐                      │
│                  │  Assessment Save  │                      │
│                  │   & Validation    │                      │
│                  └─────────┬─────────┘                      │
│                            │                                │
│                  ┌─────────▼─────────┐                      │
│                  │   Database Layer  │                      │
│                  │  (Transactions)   │                      │
│                  └───────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Student Selection
   ↓
2. Subject Enrollment (Units Calculation)
   ↓
3. Tuition Calculation (Units × Per Unit)
   ↓
4. Discount Application (Percentage-based)
   ↓
5. Net Tuition Calculation
   ↓
6. Dynamic Fees Addition
   ↓
7. Payment Mode Selection (Cash/Installment)
   ↓
8. Final Amount Calculation
   ↓
9. Payment Schedule Generation (if Installment)
   ↓
10. Validation & Save
```

---

## UI Structure & Layout

### Recommended Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Assessment Management                              │
│  [Student Info Card - Always Visible]                       │
│  Student Number | Name | Program                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TAB NAVIGATION                                              │
│  [Subjects] [Payment Calculation] [Payment Schedule]        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TAB 1: ENROLLED SUBJECTS                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Subject List (Editable for Resident/Returnee)     │   │
│  │ - Course Code | Title | Units | Fixed Amount        │   │
│  │ - Add/Remove Subjects                               │   │
│  └─────────────────────────────────────────────────────┘   │
│  Summary: Total Units | Fixed Amount Total                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TAB 2: PAYMENT CALCULATION                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SECTION A: Tuition Calculation                      │   │
│  │ - Tuition Per Unit: [input]                         │   │
│  │ - Total Units: [display]                           │   │
│  │ - Gross Tuition: [calculated]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SECTION B: Discount Application                    │   │
│  │ - Discount: [Select] [Percentage] [Amount]        │   │
│  │ - Net Tuition: [calculated]                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SECTION C: Dynamic Fees                              │   │
│  │ - Fee 1: [name] [amount] [editable]                 │   │
│  │ - Fee 2: [name] [amount] [editable]                 │   │
│  │ - Total Fees: [calculated]                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SECTION D: Payment Mode Selection                    │   │
│  │ ○ Cash Basis                                         │   │
│  │ ○ Installment Basis                                  │   │
│  │                                                       │   │
│  │ Cash Basis Total: [display]                         │   │
│  │                                                       │   │
│  │ Installment Basis:                                   │   │
│  │ - Down Payment: [input]                             │   │
│  │ - Remaining Balance: [calculated]                   │   │
│  │ - Insurance (5%): [calculated]                      │   │
│  │ - Total Installment: [calculated]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SUMMARY CARD (Always Visible)                       │   │
│  │ Gross Tuition: ₱X,XXX.XX                           │   │
│  │ Discount: -₱X,XXX.XX                                │   │
│  │ Net Tuition: ₱X,XXX.XX                              │   │
│  │ Dynamic Fees: ₱X,XXX.XX                             │   │
│  │ Fixed Amount Subjects: ₱X,XXX.XX                   │   │
│  │ ─────────────────────────────────                   │   │
│  │ TOTAL DUE (Cash): ₱X,XXX.XX                          │   │
│  │ TOTAL DUE (Installment): ₱X,XXX.XX                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  TAB 3: PAYMENT SCHEDULE (Only for Installment Mode)        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Installment 1: Prelim                              │   │
│  │ - Due Date: [date picker]                          │   │
│  │ - Amount: [auto-calculated] [editable]             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Installment 2: Midterm                             │   │
│  │ - Due Date: [date picker]                          │   │
│  │ - Amount: [auto-calculated] [editable]             │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Installment 3: Finals                               │   │
│  │ - Due Date: [date picker]                          │   │
│  │ - Amount: [auto-calculated] [editable]             │   │
│  └─────────────────────────────────────────────────────┘   │
│  Validation: Sum must equal Total Installment              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  ACTION BUTTONS (Fixed Bottom)                             │
│  [Save as Draft] [Finalize Assessment] [Cancel]            │
└─────────────────────────────────────────────────────────────┘
```

### UI Component Hierarchy

```
AssessmentManagement
├── StudentInfoSection (Always Visible)
├── TabNavigation
│   ├── EnrolledSubjectsTab
│   │   ├── SubjectList
│   │   ├── AddSubjectModal
│   │   └── SubjectSummary
│   ├── PaymentCalculationTab
│   │   ├── TuitionSection
│   │   ├── DiscountSection
│   │   ├── DynamicFeesSection
│   │   ├── PaymentModeSelector
│   │   └── SummaryCard
│   └── PaymentScheduleTab
│       ├── InstallmentForm (Prelim)
│       ├── InstallmentForm (Midterm)
│       └── InstallmentForm (Finals)
└── ActionButtons
    ├── SaveDraftButton
    ├── FinalizeButton
    └── CancelButton
```

---

## Calculation Flow

### Step-by-Step Financial Logic

#### Phase 1: Base Calculations (Always Computed)

```typescript
// Step 1: Calculate Regular Units Total
regularUnits = enrolledSubjects
  .filter(subject => !subject.fixedAmount || subject.fixedAmount === 0)
  .reduce((sum, subject) => sum + subject.units_total, 0);

// Step 2: Calculate Fixed Amount Total
fixedAmountTotal = enrolledSubjects
  .filter(subject => subject.fixedAmount && subject.fixedAmount > 0)
  .reduce((sum, subject) => sum + subject.fixedAmount, 0);

// Step 3: Calculate Gross Tuition
grossTuition = regularUnits × tuitionPerUnit;
```

#### Phase 2: Discount Application (Before Payment Mode)

```typescript
// Step 4: Apply Discount (Percentage-based)
discountAmount = grossTuition × (discountPercentage / 100);

// Step 5: Calculate Net Tuition
netTuition = grossTuition - discountAmount;
```

#### Phase 3: Fees Addition

```typescript
// Step 6: Sum Dynamic Fees
dynamicFeesTotal = Object.values(dynamicFees).reduce((sum, amount) => sum + amount, 0);

// Step 7: Calculate Base Total (Before Payment Mode)
baseTotal = netTuition + dynamicFeesTotal + fixedAmountTotal;
```

#### Phase 4: Payment Mode Calculation

```typescript
// CASH BASIS
if (paymentMode === 'cash') {
  totalDue = baseTotal;
}

// INSTALLMENT BASIS
if (paymentMode === 'installment') {
  // Step 8: Calculate Remaining Balance
  remainingBalance = baseTotal - downPayment;
  
  // Step 9: Calculate Insurance (5% on remaining balance)
  insuranceAmount = remainingBalance × 0.05;
  
  // Step 10: Calculate Total Installment
  totalInstallment = remainingBalance + insuranceAmount;
  
  // Step 11: Distribute Installments
  // Default: Equal distribution across 3 installments
  installmentAmount = totalInstallment / 3;
  
  // User can adjust individual installment amounts
  // Validation: prelimAmount + midtermAmount + finalsAmount === totalInstallment
}
```

### Calculation Order Diagram

```
┌─────────────────┐
│  Regular Units  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Tuition Per Unit│────▶│  Gross Tuition   │
└─────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │   Discount     │
                          │  (Percentage)  │
                          └────────┬────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  Net Tuition    │
                          └────────┬────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Dynamic Fees    │     │  Fixed Amount    │     │                  │
│  (Database)    │     │    Subjects      │     │                  │
└────────┬────────┘     └────────┬────────┘     └────────┬─────────┘
         │                        │                        │
         └────────────────────────┴────────────────────────┘
                                  │
                                  ▼
                          ┌─────────────────┐
                          │  Base Total     │
                          └────────┬────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
          ┌─────────────────┐         ┌──────────────────────┐
          │   CASH BASIS    │         │  INSTALLMENT BASIS   │
          │                 │         │                      │
          │  Total Due =   │         │  Down Payment        │
          │  Base Total    │         │  Remaining Balance    │
          └─────────────────┘         │  Insurance (5%)     │
                                     │  Total Installment   │
                                     └──────────────────────┘
```

### Critical Rulesw






1. **Discount is ALWAYS applied to Gross Tuition only**
2. **Fixed Amount Subjects are NOT subject to discount**
3. **Fixed Amount Subjects are NOT subject to unit-based tuition**
4. **Insurance is calculated on Remaining Balance (after down payment)**
5. **All calculations must be rounded to 2 decimal places**

---

## Edge Case Handling

### 1. Payment Mode Switch

**Scenario**: User switches from Cash to Installment (or vice versa)

**Handling**:
```typescript
// When switching payment modes
function handlePaymentModeChange(newMode: 'cash' | 'installment') {
  if (newMode === 'installment' && paymentMode === 'cash') {
    // Initialize installment schedule with default values
    initializeInstallmentSchedule();
  } else if (newMode === 'cash' && paymentMode === 'installment') {
    // Clear installment schedule
    clearInstallmentSchedule();
    // Reset down payment
    setDownPayment(0);
  }
  
  setPaymentMode(newMode);
  // Recalculate totals (automatic via useEffect)
}
```

**Validation**: 
- If switching to Installment, ensure down payment is set
- If switching to Cash, clear all installment data

### 2. Subject Change After Assessment Created

**Scenario**: User adds/removes subjects after assessment is saved

**Handling**:
```typescript
function handleSubjectChange() {
  // Recalculate all values
  recalculateTuition();
  recalculateDiscount(); // Re-apply discount to new gross tuition
  recalculateFees();
  recalculatePaymentMode();
  
  // If assessment is finalized, require confirmation
  if (assessmentStatus === 'finalized') {
    showConfirmationModal({
      message: 'Changing subjects will require reassessment. Continue?',
      onConfirm: () => {
        // Reset assessment status to 'draft'
        setAssessmentStatus('draft');
        // Update subjects
        updateSubjects();
      }
    });
  }
}
```

**Database**: Update assessment with new totals, maintain audit trail

### 3. Discount Change After Installment Schedule Created

**Scenario**: User changes discount after setting installment amounts

**Handling**:
```typescript
function handleDiscountChange(newDiscount: Discount) {
  // Recalculate net tuition
  const newNetTuition = grossTuition - (grossTuition * newDiscount.percentage / 100);
  
  // Recalculate base total
  const newBaseTotal = newNetTuition + dynamicFeesTotal + fixedAmountTotal;
  
  // If installment mode, recalculate installments
  if (paymentMode === 'installment') {
    const newRemainingBalance = newBaseTotal - downPayment;
    const newInsurance = newRemainingBalance * 0.05;
    const newTotalInstallment = newRemainingBalance + newInsurance;
    
    // Redistribute installments proportionally
    redistributeInstallments(newTotalInstallment);
  }
}
```

### 4. Reassessment (Subject Change After Finalization)

**Scenario**: Need to modify finalized assessment

**Handling**:
```typescript
function handleReassessment() {
  // Create new assessment version
  const newAssessment = {
    ...currentAssessment,
    status: 'draft',
    previous_assessment_id: currentAssessment.id,
    version: currentAssessment.version + 1
  };
  
  // Archive old assessment
  await archiveAssessment(currentAssessment.id);
  
  // Create new assessment
  await createAssessment(newAssessment);
}
```

### 5. Down Payment Exceeds Base Total

**Scenario**: User enters down payment greater than base total

**Handling**:
```typescript
function validateDownPayment(downPayment: number, baseTotal: number) {
  if (downPayment > baseTotal) {
    return {
      valid: false,
      error: 'Down payment cannot exceed total amount'
    };
  }
  
  if (downPayment < 0) {
    return {
      valid: false,
      error: 'Down payment cannot be negative'
    };
  }
  
  return { valid: true };
}
```

### 6. Installment Amount Mismatch

**Scenario**: Sum of installment amounts doesn't equal total installment

**Handling**:
```typescript
function validateInstallmentSchedule() {
  const sum = prelimAmount + midtermAmount + finalsAmount;
  const difference = Math.abs(sum - totalInstallment);
  
  if (difference > 0.01) { // Allow 1 cent tolerance for rounding
    return {
      valid: false,
      error: `Installment amounts must sum to ${formatCurrency(totalInstallment)}. Current sum: ${formatCurrency(sum)}`
    };
  }
  
  return { valid: true };
}
```

### 7. Zero Units Enrollment

**Scenario**: Student enrolled in only fixed-amount subjects (0 regular units)

**Handling**:
```typescript
if (regularUnits === 0 && fixedAmountTotal > 0) {
  grossTuition = 0;
  // Discount still applies (0% of 0 = 0)
  netTuition = 0;
  baseTotal = fixedAmountTotal + dynamicFeesTotal;
  // Payment mode calculations proceed normally
}
```

### 8. Negative Net Tuition (Discount > Gross)

**Scenario**: Discount percentage results in negative net tuition

**Handling**:
```typescript
function applyDiscount(grossTuition: number, discountPercent: number) {
  const discountAmount = grossTuition * (discountPercent / 100);
  const netTuition = Math.max(0, grossTuition - discountAmount);
  
  // Cap discount at gross tuition
  const actualDiscount = Math.min(discountAmount, grossTuition);
  
  return {
    netTuition,
    discountAmount: actualDiscount
  };
}
```

---

## Database Design & Save Flow

### Database Schema

```sql
-- Assessment Table (already exists, enhanced)
student_assessment
├── id (PK)
├── student_number
├── academic_year
├── semester
├── gross_tuition
├── discount_id (FK)
├── discount_percent
├── discount_amount
├── net_tuition
├── total_fees (dynamic fees total)
├── fixed_amount_total (fixed amount subjects)
├── base_total (net_tuition + total_fees + fixed_amount_total)
├── payment_mode ('cash' | 'installment')
├── down_payment (nullable, for installment)
├── insurance_amount (nullable, for installment)
├── total_due_cash (base_total for cash)
├── total_due_installment (nullable, for installment)
├── status ('draft' | 'finalized' | 'paid' | 'cancelled')
├── previous_assessment_id (nullable, for reassessments)
├── version (default 1, increments on reassessment)
├── created_at
├── updated_at
└── finalized_at (nullable)

-- Assessment Fees (snapshot)
assessment_fee
├── id (PK)
├── assessment_id (FK)
├── fee_id (FK, nullable)
├── fee_name
├── fee_category
└── amount

-- Payment Schedule (for installment mode)
payment_schedule
├── id (PK)
├── assessment_id (FK)
├── label ('Prelim' | 'Midterm' | 'Finals')
├── due_date
├── amount
└── is_paid (default false)

-- Assessment Audit Trail
assessment_audit
├── id (PK)
├── assessment_id (FK)
├── action ('created' | 'updated' | 'finalized' | 'reassessed' | 'cancelled')
├── changed_fields (JSON)
├── previous_values (JSON)
├── new_values (JSON)
├── user_id (FK)
└── created_at
```

### Save Flow with Transactions

```typescript
async function saveAssessment(assessmentData: AssessmentData, mode: 'draft' | 'finalize') {
  return await prisma.$transaction(async (tx) => {
    // 1. Check if assessment exists
    const existing = await tx.student_assessment.findUnique({
      where: {
        student_number_academic_year_semester: {
          student_number: assessmentData.studentNumber,
          academic_year: assessmentData.academicYear,
          semester: assessmentData.semester,
        },
      },
    });

    let assessment;
    let isUpdate = false;

    // 2. Create or Update Assessment
    if (existing) {
      isUpdate = true;
      
      // If updating finalized assessment, create new version
      if (existing.status === 'finalized' && mode === 'draft') {
        // Archive old assessment
        await tx.student_assessment.update({
          where: { id: existing.id },
          data: { status: 'cancelled' },
        });

        // Create new assessment version
        assessment = await tx.student_assessment.create({
          data: {
            ...assessmentData,
            previous_assessment_id: existing.id,
            version: existing.version + 1,
            status: 'draft',
          },
        });
      } else {
        // Update existing assessment
        assessment = await tx.student_assessment.update({
          where: { id: existing.id },
          data: {
            ...assessmentData,
            status: mode === 'finalize' ? 'finalized' : 'draft',
            finalized_at: mode === 'finalize' ? new Date() : null,
          },
        });
      }
    } else {
      // Create new assessment
      assessment = await tx.student_assessment.create({
        data: {
          ...assessmentData,
          status: mode === 'finalize' ? 'finalized' : 'draft',
          finalized_at: mode === 'finalize' ? new Date() : null,
          version: 1,
        },
      });
    }

    // 3. Delete existing fee snapshots
    await tx.assessment_fee.deleteMany({
      where: { assessment_id: assessment.id },
    });

    // 4. Create fee snapshots
    if (assessmentData.fees && assessmentData.fees.length > 0) {
      await tx.assessment_fee.createMany({
        data: assessmentData.fees.map((fee) => ({
          assessment_id: assessment.id,
          fee_id: fee.fee_id,
          fee_name: fee.fee_name,
          fee_category: fee.fee_category,
          amount: fee.amount,
        })),
      });
    }

    // 5. Handle Payment Schedule (only for installment mode)
    if (assessmentData.payment_mode === 'installment') {
      // Delete existing payment schedule
      await tx.payment_schedule.deleteMany({
        where: { assessment_id: assessment.id },
      });

      // Create payment schedule
      if (assessmentData.payment_schedule && assessmentData.payment_schedule.length > 0) {
        await tx.payment_schedule.createMany({
          data: assessmentData.payment_schedule.map((schedule) => ({
            assessment_id: assessment.id,
            label: schedule.label,
            due_date: schedule.due_date,
            amount: schedule.amount,
            is_paid: false,
          })),
        });
      }
    } else {
      // Delete payment schedule if switching from installment to cash
      await tx.payment_schedule.deleteMany({
        where: { assessment_id: assessment.id },
      });
    }

    // 6. Create audit trail entry
    await tx.assessment_audit.create({
      data: {
        assessment_id: assessment.id,
        action: isUpdate ? 'updated' : 'created',
        changed_fields: JSON.stringify(Object.keys(assessmentData)),
        previous_values: existing ? JSON.stringify(existing) : null,
        new_values: JSON.stringify(assessmentData),
        user_id: assessmentData.user_id,
      },
    });

    return assessment;
  });
}
```

### Validation Before Save

```typescript
function validateAssessment(assessmentData: AssessmentData): ValidationResult {
  const errors: string[] = [];

  // 1. Required fields
  if (!assessmentData.studentNumber) errors.push('Student number is required');
  if (!assessmentData.academicYear) errors.push('Academic year is required');
  if (!assessmentData.semester) errors.push('Semester is required');
  if (!assessmentData.payment_mode) errors.push('Payment mode is required');

  // 2. Financial validation
  if (assessmentData.gross_tuition < 0) errors.push('Gross tuition cannot be negative');
  if (assessmentData.net_tuition < 0) errors.push('Net tuition cannot be negative');
  if (assessmentData.discount_amount < 0) errors.push('Discount amount cannot be negative');
  if (assessmentData.discount_amount > assessmentData.gross_tuition) {
    errors.push('Discount cannot exceed gross tuition');
  }

  // 3. Payment mode validation
  if (assessmentData.payment_mode === 'installment') {
    if (!assessmentData.down_payment && assessmentData.down_payment !== 0) {
      errors.push('Down payment is required for installment mode');
    }
    if (assessmentData.down_payment < 0) {
      errors.push('Down payment cannot be negative');
    }
    if (assessmentData.down_payment > assessmentData.base_total) {
      errors.push('Down payment cannot exceed total amount');
    }
    if (!assessmentData.payment_schedule || assessmentData.payment_schedule.length !== 3) {
      errors.push('Payment schedule must have 3 installments');
    } else {
      const scheduleSum = assessmentData.payment_schedule.reduce(
        (sum, s) => sum + Number(s.amount),
        0
      );
      const expectedTotal = assessmentData.total_due_installment || 0;
      if (Math.abs(scheduleSum - expectedTotal) > 0.01) {
        errors.push('Installment amounts must sum to total installment amount');
      }
    }
  }

  // 4. Totals validation
  const calculatedBaseTotal =
    assessmentData.net_tuition +
    (assessmentData.total_fees || 0) +
    (assessmentData.fixed_amount_total || 0);

  if (Math.abs(calculatedBaseTotal - assessmentData.base_total) > 0.01) {
    errors.push('Base total calculation mismatch');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## Status Lifecycle

### Status Flow Diagram

```
┌─────────┐
│  DRAFT  │ ◄─── Reassessment
└───┬─────┘
    │ Finalize
    ▼
┌──────────────┐
│  FINALIZED   │ ────► Payment Module handles payments
└──────────────┘      (Payment status tracked separately)
    │
    │ (if reassessment needed)
    ▼
┌──────────────┐
│  CANCELLED   │
└──────────────┘
```

### Status Definitions

| Status | Description | Editable | Can Finalize | Payment Status |
|--------|-------------|----------|--------------|----------------|
| **draft** | Assessment is being created/modified | Yes | Yes | N/A (not finalized) |
| **finalized** | Assessment is locked and ready for payment | No | No | Tracked by Payment Module |
| **cancelled** | Assessment was replaced by reassessment | No | No | N/A (cancelled) |

**Note**: Payment status (paid/unpaid/partial) is NOT stored in assessment. The Payment Module calculates this dynamically from payment records.

### Status Transitions

```typescript
const STATUS_TRANSITIONS = {
  draft: {
    canTransitionTo: ['finalized', 'cancelled'],
    actions: ['finalize', 'cancel'],
  },
  finalized: {
    canTransitionTo: ['cancelled'], // Can only be cancelled for reassessment
    actions: ['reassess'],
    // Payment actions handled by Payment Module
  },
  cancelled: {
    canTransitionTo: [], // Terminal state
    actions: [],
  },
};

function canTransition(currentStatus: Status, newStatus: Status): boolean {
  return STATUS_TRANSITIONS[currentStatus]?.canTransitionTo.includes(newStatus) || false;
}
```

### Payment Status (Handled by Payment Module)

Payment status is calculated dynamically by the Payment Module:
- **Unpaid**: No payments recorded
- **Partial**: Some payments made, balance remaining
- **Fully Paid**: Total paid >= total due (within tolerance)

### Status-Based UI Behavior

```typescript
function getUIState(assessmentStatus: Status, paymentStatus?: PaymentStatus) {
  switch (assessmentStatus) {
    case 'draft':
      return {
        canEditSubjects: true,
        canEditPayment: true,
        canEditSchedule: true,
        canFinalize: true,
        canSave: true,
        canProcessPayment: false, // Must be finalized first
        showWarning: false,
      };
    case 'finalized':
      return {
        canEditSubjects: false,
        canEditPayment: false,
        canEditSchedule: false,
        canFinalize: false,
        canSave: false,
        canProcessPayment: true, // Payment module handles this
        showWarning: paymentStatus?.isFullyPaid 
          ? 'Assessment is fully paid. Create reassessment to make changes.'
          : 'Assessment is finalized. Payment module handles payments.',
      };
    case 'cancelled':
      return {
        canEditSubjects: false,
        canEditPayment: false,
        canEditSchedule: false,
        canFinalize: false,
        canSave: false,
        canProcessPayment: false,
        showWarning: 'This assessment has been cancelled.',
      };
  }
}
```

---

## Validation Rules

### Financial Validation

```typescript
const VALIDATION_RULES = {
  // Tuition
  tuitionPerUnit: {
    min: 0,
    max: 999999.99,
    required: true,
  },
  
  // Discount
  discountPercentage: {
    min: 0,
    max: 100,
    message: 'Discount percentage must be between 0 and 100',
  },
  discountAmount: {
    max: (grossTuition: number) => grossTuition,
    message: 'Discount cannot exceed gross tuition',
  },
  
  // Down Payment
  downPayment: {
    min: 0,
    max: (baseTotal: number) => baseTotal,
    required: (paymentMode: string) => paymentMode === 'installment',
    message: 'Down payment must be between 0 and total amount',
  },
  
  // Installment Amounts
  installmentAmount: {
    min: 0,
    sumMustEqual: (totalInstallment: number) => totalInstallment,
    tolerance: 0.01, // Allow 1 cent rounding difference
  },
  
  // Dates
  dueDate: {
    min: new Date(), // Cannot be in the past
    required: true,
  },
};
```

### Business Rules Validation

```typescript
function validateBusinessRules(assessment: AssessmentData): ValidationResult {
  const errors: string[] = [];
  
  // Rule 1: Must have at least one subject
  if (!assessment.subjects || assessment.subjects.length === 0) {
    errors.push('At least one subject must be enrolled');
  }
  
  // Rule 2: Total due must be positive
  if (assessment.payment_mode === 'cash' && assessment.total_due_cash <= 0) {
    errors.push('Total due must be greater than zero');
  }
  if (assessment.payment_mode === 'installment' && assessment.total_due_installment <= 0) {
    errors.push('Total installment must be greater than zero');
  }
  
  // Rule 3: Installment dates must be in order
  if (assessment.payment_mode === 'installment' && assessment.payment_schedule) {
    const dates = assessment.payment_schedule.map(s => new Date(s.due_date)).sort();
    if (dates[0] >= dates[1] || dates[1] >= dates[2]) {
      errors.push('Installment due dates must be in chronological order');
    }
  }
  
  // Rule 4: Cannot finalize with zero total
  const totalDue = assessment.payment_mode === 'cash' 
    ? assessment.total_due_cash 
    : assessment.total_due_installment;
  if (totalDue <= 0) {
    errors.push('Cannot finalize assessment with zero total');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## State Management

### State Structure

```typescript
interface AssessmentState {
  // Student Info
  studentNumber: string;
  studentName: string;
  program: string;
  programId: number | null;
  
  // Subjects
  enrolledSubjects: EnrolledSubject[];
  totalUnits: number;
  fixedAmountTotal: number;
  
  // Tuition Calculation
  tuitionPerUnit: string;
  grossTuition: number;
  
  // Discount
  selectedDiscount: Discount | null;
  discountAmount: number;
  netTuition: number;
  
  // Fees
  dynamicFees: Record<number, number>; // feeId -> amount
  totalFees: number;
  
  // Payment Mode
  paymentMode: 'cash' | 'installment';
  baseTotal: number;
  
  // Cash Basis
  totalDueCash: number;
  
  // Installment Basis
  downPayment: number;
  remainingBalance: number;
  insuranceAmount: number;
  totalInstallment: number;
  paymentSchedule: PaymentScheduleItem[];
  
  // Assessment Status
  assessmentStatus: 'draft' | 'finalized' | 'paid' | 'cancelled';
  assessmentId: number | null;
  
  // UI State
  activeTab: 'subjects' | 'payment' | 'schedule';
  isLoading: boolean;
  errors: Record<string, string>;
}
```

### State Update Flow

```typescript
// 1. Subject Change → Recalculate Tuition
useEffect(() => {
  const { regularUnits, fixedAmountSum } = calculateUnitsAndFixedAmounts(enrolledSubjects);
  setTotalUnits(regularUnits);
  setFixedAmountTotal(fixedAmountSum);
}, [enrolledSubjects]);

// 2. Units/Tuition Per Unit Change → Recalculate Gross Tuition
useEffect(() => {
  const gross = totalUnits * parseFloat(tuitionPerUnit);
  setGrossTuition(gross);
}, [totalUnits, tuitionPerUnit]);

// 3. Gross Tuition/Discount Change → Recalculate Net Tuition
useEffect(() => {
  const discount = selectedDiscount 
    ? grossTuition * (selectedDiscount.percentage / 100)
    : 0;
  setDiscountAmount(discount);
  setNetTuition(grossTuition - discount);
}, [grossTuition, selectedDiscount]);

// 4. Net Tuition/Fees Change → Recalculate Base Total
useEffect(() => {
  const dynamicFeesTotal = Object.values(dynamicFees).reduce((sum, amount) => sum + amount, 0);
  const base = netTuition + dynamicFeesTotal + fixedAmountTotal;
  setBaseTotal(base);
  setTotalDueCash(base);
}, [netTuition, dynamicFees, fixedAmountTotal]);

// 5. Payment Mode/Down Payment Change → Recalculate Installment
useEffect(() => {
  if (paymentMode === 'installment') {
    const remaining = baseTotal - downPayment;
    setRemainingBalance(remaining);
    const insurance = remaining * 0.05;
    setInsuranceAmount(insurance);
    const total = remaining + insurance;
    setTotalInstallment(total);
    
    // Auto-redistribute installments
    redistributeInstallments(total);
  }
}, [paymentMode, baseTotal, downPayment]);
```

### State Reset on Student Change

```typescript
function resetAssessmentState() {
  setEnrolledSubjects([]);
  setTotalUnits(0);
  setFixedAmountTotal(0);
  setGrossTuition(0);
  setSelectedDiscount(null);
  setDiscountAmount(0);
  setNetTuition(0);
  setDynamicFees({});
  setTotalFees(0);
  setPaymentMode('cash');
  setBaseTotal(0);
  setTotalDueCash(0);
  setDownPayment(0);
  setRemainingBalance(0);
  setInsuranceAmount(0);
  setTotalInstallment(0);
  setPaymentSchedule([]);
  setAssessmentStatus('draft');
  setAssessmentId(null);
}
```

---

## Implementation Checklist

### Phase 1: Core Calculation Engine
- [ ] Implement unit calculation logic
- [ ] Implement gross tuition calculation
- [ ] Implement discount application
- [ ] Implement net tuition calculation
- [ ] Implement dynamic fees summation
- [ ] Implement fixed amount summation
- [ ] Implement base total calculation
- [ ] Implement cash basis calculation
- [ ] Implement installment basis calculation
- [ ] Implement insurance calculation

### Phase 2: UI Components
- [ ] Create TuitionSection component
- [ ] Create DiscountSection component
- [ ] Create DynamicFeesSection component
- [ ] Create PaymentModeSelector component
- [ ] Create SummaryCard component
- [ ] Create PaymentScheduleTab component
- [ ] Create InstallmentForm component

### Phase 3: State Management
- [ ] Set up state structure
- [ ] Implement useEffect hooks for calculations
- [ ] Implement state reset on student change
- [ ] Implement payment mode switching logic

### Phase 4: Validation
- [ ] Implement financial validation
- [ ] Implement business rules validation
- [ ] Implement installment schedule validation
- [ ] Implement date validation

### Phase 5: Database Integration
- [ ] Update Prisma schema
- [ ] Implement save transaction
- [ ] Implement update transaction
- [ ] Implement reassessment logic
- [ ] Implement audit trail

### Phase 6: Edge Cases
- [ ] Handle payment mode switch
- [ ] Handle subject change after finalization
- [ ] Handle discount change
- [ ] Handle reassessment
- [ ] Handle zero units
- [ ] Handle negative calculations

### Phase 7: Testing
- [ ] Unit tests for calculations
- [ ] Integration tests for save flow
- [ ] E2E tests for user flows
- [ ] Edge case testing

---

## Summary

This design provides:

1. **Clear Architecture**: Separation of concerns with distinct components
2. **Correct Financial Logic**: Discount applied before payment mode, consistent totals
3. **Robust Validation**: Multiple layers of validation for data integrity
4. **Audit Trail**: Complete history of assessment changes
5. **Status Management**: Clear lifecycle with proper transitions
6. **Edge Case Handling**: Comprehensive coverage of edge cases
7. **Scalable Design**: Easy to extend with new features

The system ensures financial accuracy, audit compliance, and user-friendly operation while maintaining data integrity throughout the assessment lifecycle.

