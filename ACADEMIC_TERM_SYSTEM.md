# Automatic Academic Term Detection System

This document explains the automatic semester and school year detection system that uses database server time to prevent tampering.

## Overview

The system automatically determines the current semester and academic year based on the database server's clock, not the client's computer. This prevents users from manipulating their system date to affect transactions.

## Semester Schedule

| Semester        | Start Date | End Date    |
| --------------- | ---------- | ----------- |
| First Semester  | August 1   | December 20 |
| Second Semester | January 12 | July 6      |
| Summer          | July 7     | July 31     |

### Gap Periods

- **Winter Break**: December 21 - January 11 (defaults to upcoming Second Semester)
- There may be a brief gap between semesters for enrollment preparation

## Academic Year Format

The academic year follows the format `YYYY-YYYY` (e.g., "2025-2026"):

- **First Semester** (Aug-Dec): Uses current year as start year
  - Example: August 2025 → "2025-2026"
- **Second Semester & Summer** (Jan-Jul): Uses previous year as start year
  - Example: January 2026 → "2025-2026"

## Files Created

### 1. Utility Functions

**File**: `app/utils/academicTermUtils.ts`

Core functions for calculating academic terms:

- `getAcademicYear(date)` - Returns academic year string
- `getCurrentSemester(date)` - Returns current semester
- `getAcademicTerm(date)` - Returns complete term info
- `getSemesterDates(semester, year)` - Returns semester date range
- `getNextSemester(term)` / `getPreviousSemester(term)` - Navigation

### 2. API Endpoint

**File**: `app/api/auth/academic-term/route.ts`

**GET `/api/auth/academic-term`**

Query parameters:

- `sync=true` - Also updates settings table
- `includeNext=true` - Include next semester info
- `includePrevious=true` - Include previous semester info

Response:
  
```json
{
  "success": true,
  "data": {
    "currentTerm": {
      "semester": "Second",
      "semesterCode": "second",
      "academicYear": "2025-2026",
      "startYear": 2025,
      "endYear": 2026,
      "semesterStartDate": "2026-01-12T00:00:00.000Z",
      "semesterEndDate": "2026-07-06T00:00:00.000Z",
      "serverTime": "2026-01-13T10:30:00.000Z",
      "isWithinSemester": true,
      "formatted": "Second Semester, A.Y. 2025-2026"
    },
    "storedSettings": {
      "semester": "Second",
      "academicYear": "2025-2026"
    }
  }
}
```

**POST `/api/auth/academic-term`**

Force sync the academic term to settings table. Call this on app startup or via cron job.

### 3. React Hook

**File**: `app/hooks/useAcademicTerm.ts`

```tsx
import { useAcademicTerm } from "../hooks/useAcademicTerm";

function MyComponent() {
  const { currentTerm, nextTerm, loading, error, sync, refresh } =
    useAcademicTerm({
      autoSync: true,
      includeNext: true,
      refreshInterval: 300000, // 5 minutes
    });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <p>Current: {currentTerm?.formatted}</p>
      <button onClick={sync}>Sync Now</button>
    </div>
  );
}
```

### 4. Context Provider

**File**: `app/contexts/AcademicTermContext.tsx`

Provides academic term data throughout the app:

```tsx
// In providers.tsx (already configured)
<AcademicTermProvider autoSync={true} refreshInterval={300000}>
  {children}
</AcademicTermProvider>;

// In any component
import { useAcademicTermContext } from "../contexts/AcademicTermContext";

function MyComponent() {
  const { currentTerm } = useAcademicTermContext();
  return <p>{currentTerm?.formatted}</p>;
}
```

### 5. Display Component

**File**: `app/components/common/AcademicTermDisplay.tsx`

Ready-to-use component for displaying the current term:

```tsx
// Full display with sync button
<AcademicTermDisplay showSyncButton />

// Compact display (for navigation)
<AcademicTermDisplay compact className="text-sm" />
```

## How It Works

1. **Server Time**: The API uses `SELECT NOW()` to get the current time from PostgreSQL, not the client's computer.

2. **Calculation**: Based on the server time, the system calculates:

   - Which semester it currently is
   - The academic year (start-end format)
   - Whether we're within a semester or in a gap period

3. **Settings Sync**: The calculated values can be synced to the `settings` table:

   - `current_semester` - "First", "Second", or "Summer"
   - `current_academic_year` - e.g., "2025-2026"
   - `last_term_sync` - Timestamp of last sync

4. **Auto-Refresh**: The provider automatically refreshes every 5 minutes to detect semester changes.

## Using in Transactions

For any transaction that needs the current academic term:

```tsx
// Option 1: Use the context (preferred for components)
const { currentTerm } = useAcademicTermContext();

const transaction = {
  amount: 1000,
  semester: currentTerm?.semester,
  academicYear: currentTerm?.academicYear,
  transactionDate: currentTerm?.serverTime, // Use server time!
};

// Option 2: Direct API call (for server-side or API routes)
const response = await fetch("/api/auth/academic-term");
const { data } = await response.json();

const transaction = {
  semester: data.currentTerm.semester,
  academicYear: data.currentTerm.academicYear,
};
```

## Security Benefits

1. **No Client Tampering**: Uses database server time, not `new Date()` on the client
2. **Consistent Values**: All users see the same semester/year regardless of their timezone
3. **Audit Trail**: `last_term_sync` tracks when settings were last updated
4. **Automatic Updates**: No manual intervention needed for semester transitions

## Dashboard Integration

The Dashboard stats API (`/api/auth/dashboard/stats`) has been updated to:

1. Use database server time for calculating the current term
2. Include `serverTime` and `semesterDates` in the response
3. No longer rely on client-provided dates

## Troubleshooting

### Semester shows wrong value

1. Check if `last_term_sync` is recent in settings
2. Call `POST /api/auth/academic-term` to force sync
3. Verify server timezone is correct

### Settings don't update

1. Ensure the `settings` table exists with the correct schema
2. Check database connection
3. Look for errors in server logs

## Future Enhancements

Consider adding:

- Admin UI to manually override semester dates for special cases
- Notification when approaching semester end
- Historical term lookup for past transactions
