# PolyConnect Web App

Initial React + TypeScript + Vite foundation for the PolyConnect rebuild.

## Run locally

1. Install Node.js 20 or newer.
2. From the repository root, run `npm install`.
3. Copy `.env.example` to `apps/web/.env.local` and fill it with **development Firebase project** web-app configuration.
4. Run `npm run dev:web` from the repository root.

The authentication UI intentionally stays disabled when Firebase environment values are missing. It does not create local demo accounts or store passwords in localStorage.

## Current scope

- Responsive landing/authentication UI.
- Firebase email/password signup, email verification, and verified-user login.
- Client-side 18+ date-of-birth check as a basic guard only; it is not independent age assurance.
- No production profile/discovery/chat data access yet.

Do not use a production Firebase project until security rules, emulator tests, account lifecycle, and independent review are complete. Do not treat school selection or email verification as proof of student identity.
