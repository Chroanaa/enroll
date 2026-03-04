# Program Utils

Reusable utility functions for working with programs and majors throughout the application.

## Features

- Fetch programs with their majors in a formatted way
- Display format: "BSIT - no major" or "BEED - Filipino"
- Can be used in both client and server components
- Includes React hook for easy integration

## Usage Examples

### 1. Using the React Hook (Client Components)

```typescript
import { useProgramsWithMajors } from "@/app/hooks/useProgramsWithMajors";

function MyComponent() {
  const { programs, loading, error } = useProgramsWithMajors();

  if (loading) return <div>Loading programs...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <select>
      <option value="">Select Program</option>
      {programs.map((program) => (
        <option key={program.value} value={program.value}>
          {program.label}
        </option>
      ))}
    </select>
  );
}
```

### 2. Using the Fetch Function (Client Components)

```typescript
import { fetchProgramsWithMajors } from "@/app/utils/programUtils";

async function loadPrograms() {
  try {
    const programs = await fetchProgramsWithMajors();
    console.log(programs);
    // [
    //   { value: "1", label: "BSIT - no major", programId: 1, ... },
    //   { value: "2-5", label: "BEED - Filipino", programId: 2, majorId: 5, ... }
    // ]
  } catch (error) {
    console.error("Failed to load programs:", error);
  }
}
```

### 3. Using in API Routes (Server Side)

```typescript
import { prisma } from "@/app/lib/prisma";
import { getProgramsWithMajorsFromDB } from "@/app/utils/programUtils";

export async function GET() {
  const programs = await getProgramsWithMajorsFromDB(prisma);
  return Response.json({ programs });
}
```

### 4. Parsing Filter Values

```typescript
import { parseProgramFilter } from "@/app/utils/programUtils";

// Parse "1" (program only)
const { programId, majorId } = parseProgramFilter("1");
// Result: { programId: 1, majorId: null }

// Parse "2-5" (program with major)
const { programId, majorId } = parseProgramFilter("2-5");
// Result: { programId: 2, majorId: 5 }
```

### 5. Formatting Display Strings

```typescript
import { formatProgramDisplay } from "@/app/utils/programUtils";

// Program without major
const display1 = formatProgramDisplay("BSIT", null);
// Result: "BSIT - no major"

// Program with major
const display2 = formatProgramDisplay("BEED", "Filipino");
// Result: "BEED - Filipino"
```

## Data Structure

```typescript
interface ProgramWithMajor {
  value: string;           // "1" or "1-5" (for use in select values)
  label: string;           // "BSIT - no major" or "BEED - Filipino"
  programId: number;       // Program ID
  programCode: string;     // Program code (e.g., "BSIT")
  majorId: number | null;  // Major ID or null
  majorName: string | null; // Major name or null
}
```

## API Endpoint

The utility uses the `/api/programs-with-majors` endpoint which returns:

```json
{
  "success": true,
  "data": [
    {
      "value": "1",
      "label": "BSIT - no major",
      "programId": 1,
      "programCode": "BSIT",
      "majorId": null,
      "majorName": null
    },
    {
      "value": "2-5",
      "label": "BEED - Filipino",
      "programId": 2,
      "programCode": "BEED",
      "majorId": 5,
      "majorName": "Filipino"
    }
  ]
}
```

## Files

- `app/utils/programUtils.ts` - Core utility functions
- `app/hooks/useProgramsWithMajors.ts` - React hook
- `app/api/programs-with-majors/route.ts` - API endpoint
