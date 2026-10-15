# Phase 1 — Age Gate and Verified Email Activation

**Status:** implementation work in progress; not production-ready.

## Scope of this PR
- Require a date of birth at signup and reject dates that do not establish age 18 or older.
- Require Firebase email verification before the app opens authenticated features.
- Provide a resend-verification path and a clear sign-out path for unverified accounts.
- Keep local demo mode visibly separate and never treat demo accounts as verified or production accounts.
- Do not change Firebase Console settings, production data, deployment settings, or secrets.

## Important security boundary
A date-of-birth field in browser code is a self-declaration, not reliable age assurance. Client-side checks can be bypassed. Email verification confirms access to an email inbox, not a person's age or student affiliation. Before a public beta, enforce access through trusted backend authorization and Firestore Security Rules; test direct SDK/API access as well as the UI. Do not display a verified identity badge based on email verification.

## Acceptance criteria
- [ ] Signup requires date of birth and explicit 18+ confirmation.
- [ ] Under-18 and invalid/future dates are rejected before account creation.
- [ ] Firebase signup sends a verification email and keeps account access restricted until verification is confirmed.
- [ ] Login re-checks Firebase's refreshed emailVerified state before enabling the app.
- [ ] Unverified users can request another verification email and sign out.
- [ ] Firebase errors do not silently create a local account that appears production-backed.
- [ ] Existing demo data is not migrated or deleted automatically.
- [ ] Automated checks cover underage, invalid date, unverified login, verified login, resend verification, and Firebase unavailable.
- [ ] Firestore rules and trusted backend enforcement are reviewed before any public launch.

## Testing and release gates
This PR must remain unmerged until the implementation is reviewed and tests pass. No production deployment or Firebase Console changes are part of this work. Test against a dedicated Firebase test project or Emulator Suite; do not use real user data.
