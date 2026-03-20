# Enrollment Verification Inputs

Use this endpoint:

`PATCH /api/auth/enroll/{id}/verify`

## Required input

```json
{
  "verification_status": "approved"
}
```

Allowed values for `verification_status`:

- `pending`
- `approved`
- `rejected`
- `needs_revision`

## Optional input

```json
{
  "verification_status": "needs_revision",
  "verification_notes": "Missing birth certificate attachment."
}
```

## Minimal examples

Approve:

```json
{
  "verification_status": "approved"
}
```

Reject:

```json
{
  "verification_status": "rejected",
  "verification_notes": "Information mismatch in birthdate."
}
```

