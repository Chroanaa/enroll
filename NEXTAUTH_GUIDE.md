# NextAuth Implementation Guide

## Overview

This application now uses NextAuth.js for authentication instead of the custom AuthContext implementation.

## What Changed

### 1. **Authentication Flow**

- **Before**: Custom AuthContext with localStorage
- **After**: NextAuth with JWT sessions

### 2. **Files Added**

- `app/api/auth/[...nextauth]/route.ts` - NextAuth API route handler
- `app/providers.tsx` - SessionProvider wrapper
- `types/next-auth.d.ts` - TypeScript type definitions for NextAuth
- `.env.local` - Environment variables (not committed to git)
- `.env.example` - Example environment variables

### 3. **Files Modified**

- `app/layout.tsx` - Added SessionProvider
- `app/page.tsx` - Now shows login and redirects to dashboard when authenticated
- `app/dashboard/page.tsx` - New dashboard route (protected)
- `app/components/Login.tsx` - Uses NextAuth `signIn()`
- `app/components/ProtectedRoute.tsx` - Uses NextAuth `useSession()`
- `app/components/Navigation.tsx` - Uses NextAuth `useSession()` and `signOut()`

### 4. **Files Deprecated** (can be deleted)

- `app/contexts/AuthContext.tsx` - Replaced by NextAuth
- `app/api/auth/login/route.ts` - Replaced by NextAuth handler
- `app/api/auth/register/route.ts` - Can be reimplemented if needed

## Setup Instructions

### 1. Install Dependencies

```bash
npm install next-auth
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and update the values:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL="postgresql://user:password@localhost:5432/enrollment_db"
```

To generate a secure `NEXTAUTH_SECRET`, run:

```bash
openssl rand -base64 32
```

Or in PowerShell:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3. Update Database Connection

Make sure your `DATABASE_URL` in `.env.local` matches your PostgreSQL database.

### 4. Run the Application

```bash
npm run dev
```

## How It Works

### Login Flow

1. User enters credentials on the Login page
2. `signIn("credentials", { username, password })` is called
3. NextAuth validates credentials against the database
4. If valid, JWT token is created and stored in a secure HTTP-only cookie
5. User is redirected to `/dashboard`

### Protected Routes

The `ProtectedRoute` component uses `useSession()` to check authentication:

- `status === "loading"` - Shows loading spinner
- `status === "unauthenticated"` - Shows Login component
- `status === "authenticated"` - Shows protected content

### Logout Flow

1. User clicks "Sign Out" button
2. `signOut({ callbackUrl: "/" })` is called
3. Session is destroyed
4. User is redirected to login page

## API Routes

### POST `/api/auth/signin`

Handles user login with credentials.

### POST `/api/auth/signout`

Handles user logout.

### GET `/api/auth/session`

Returns the current session data.

## Security Features

✅ **Secure Session Storage** - Uses HTTP-only cookies (not accessible by JavaScript)
✅ **JWT Tokens** - Encrypted session data
✅ **CSRF Protection** - Built-in CSRF token validation
✅ **Session Expiration** - 30-day session timeout (configurable)

## Important Notes

### Password Security

⚠️ **WARNING**: The current implementation stores passwords in plain text. In production, you should:

1. Hash passwords using bcrypt or argon2
2. Update the authorize function to compare hashed passwords
3. Never store plain text passwords in the database

Example with bcrypt:

```typescript
import bcrypt from "bcrypt";

// In authorize function:
const isValidPassword = await bcrypt.compare(
  credentials.password,
  user.password
);
```

### Production Checklist

- [ ] Use hashed passwords
- [ ] Set a strong `NEXTAUTH_SECRET`
- [ ] Enable HTTPS in production
- [ ] Configure proper CORS settings
- [ ] Set up rate limiting for auth endpoints
- [ ] Add email verification (optional)
- [ ] Add password reset functionality (optional)

## Troubleshooting

### "Invalid credentials" error

- Check database connection
- Verify username and password in database
- Check console for detailed error logs

### Session not persisting

- Verify `NEXTAUTH_SECRET` is set
- Check that cookies are enabled in browser
- Ensure `NEXTAUTH_URL` matches your domain

### TypeScript errors

- Make sure `types/next-auth.d.ts` is in your tsconfig include path
- Restart TypeScript server in VS Code

## Next Steps

Consider adding:

- Password hashing (bcrypt/argon2)
- Email verification
- Password reset functionality
- Two-factor authentication (2FA)
- OAuth providers (Google, GitHub, etc.)
- Role-based access control (RBAC)
- Session management dashboard

## Documentation

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [NextAuth.js Examples](https://next-auth.js.org/getting-started/example)
- [Credentials Provider](https://next-auth.js.org/providers/credentials)
