# Section Name Auto-Generation

This module provides utilities for automatically generating section names based on Program-Major combinations and Year Level.

## Format

Section names follow this format:

```
PROGRAM + MAJOR(optional) + YEAR - COUNT
```

### Examples

- `BSIT1 - 1` - BSIT (no major), Year 1, Section 1
- `BSIT1 - 2` - BSIT (no major), Year 1, Section 2
- `BSEDFI1 - 1` - BSED Filipino, Year 1, Section 1
- `BSEDEN1 - 1` - BSED English, Year 1, Section 1
- `BSEDMA1 - 1` - BSED Mathematics, Year 1, Section 1

## Components

### Program-Major Dropdown

The section creation modal uses a combined Program-Major dropdown instead of separate dropdowns.

**Format:** `PROGRAM - MAJOR`

**Examples:**
- `BSIT - no major`
- `BSED - Filipino`
- `BSED - English`
- `BSED - Mathematics`

### Auto-Generation Logic

1. User selects Program-Major from dropdown
2. User selects Year Level
3. System automatically:
   - Extracts Program Code (e.g., `BSED`)
   - Extracts Major Name (e.g., `Filipino`)
   - Takes first 2 letters of major (e.g., `FI`)
   - Creates prefix: `BSEDFI1`
   - Queries database for existing sections with same prefix
   - Auto-increments count
   - Generates section name: `BSEDFI1 - 1`

## Functions

### `generateSectionName(programCode, majorName, yearLevel, existingSections)`

Generates a complete section name with auto-incremented count.

**Parameters:**
- `programCode` (string) - Program abbreviation (e.g., "BSIT", "BSED")
- `majorName` (string | null) - Major name (e.g., "Filipino") or null if no major
- `yearLevel` (number) - Year level (1-4)
- `existingSections` (string[]) - Array of existing section names

**Returns:** Complete section name (e.g., "BSEDFI1 - 1")

**Example:**
```typescript
const sectionName = generateSectionName(
  "BSED",
  "Filipino",
  1,
  ["BSEDFI1 - 1", "BSEDFI1 - 2"]
);
// Returns: "BSEDFI1 - 3"
```

### `generateSectionPrefix(programCode, majorName, yearLevel)`

Generates the section prefix without the count.

**Parameters:**
- `programCode` (string) - Program abbreviation
- `majorName` (string | null) - Major name or null
- `yearLevel` (number) - Year level

**Returns:** Section prefix (e.g., "BSEDFI1")

**Example:**
```typescript
const prefix = generateSectionPrefix("BSED", "Filipino", 1);
// Returns: "BSEDFI1"
```

### `fetchExistingSectionsByPrefix(prefix)`

Fetches existing sections from the database that start with the given prefix.

**Parameters:**
- `prefix` (string) - Section prefix to search for

**Returns:** Promise<string[]> - Array of section names

**Example:**
```typescript
const sections = await fetchExistingSectionsByPrefix("BSEDFI1");
// Returns: ["BSEDFI1 - 1", "BSEDFI1 - 2"]
```

## API Endpoint

### GET `/api/auth/section/by-prefix`

Fetches sections by prefix.

**Query Parameters:**
- `prefix` (required) - Section prefix to search for

**Response:**
```json
{
  "success": true,
  "sections": ["BSEDFI1 - 1", "BSEDFI1 - 2"]
}
```

## Usage in Components

The `CreateSectionModal` component automatically generates section names when:
1. User selects a Program-Major combination
2. User enters a Year Level

The section name field is read-only and displays the auto-generated name.

## Database Schema

The feature uses the existing `sections` table with the `section_name` field to store generated names.

## Integration with Existing System

This feature integrates with:
- `useProgramsWithMajors` hook - Fetches program-major combinations
- `/api/programs-with-majors` - API endpoint for program-major data
- `programUtils.ts` - Utility functions for program-major operations
