# PolyConnect

PolyConnect is being developed into a real dating service for adults (18+) at polytechnics across Nigeria, with a mobile-friendly website and a planned Android app.

## Current status

This repository began as a single-page HTML/CSS/JavaScript prototype. The first production-foundation branch makes these changes:

- Real sign-up/login no longer silently falls back to browser-local accounts.
- Real account sign-in requires Firebase email verification.
- Profiles are read from Firestore for authenticated discovery instead of using bundled demo profiles.
- Public profile writes omit selfie data and cannot self-assign a verified badge.
- Profile image URLs must be HTTPS; local data-URL photos are replaced with a generated avatar for cloud persistence until secure media storage is implemented.
- Demo behavior is available only when the URL explicitly includes `?demo=1`.
- Simulated likes/matches, fake chat replies, and local-only account deletion are blocked in normal mode rather than being presented as real production actions.
- Firestore rules default-deny every collection except the limited public-profile flow described below.
- A Firebase Emulator Suite test harness and GitHub Actions workflow cover the initial profile authorization rules.

**This is still an early foundation, not a launch-ready dating app.** Real likes/mutual matching, real-time messaging, server-backed blocks/reports, account deletion, moderation, secure media uploads, and Android packaging remain to be implemented and tested.

## Firebase configuration

The existing HTML contains the Firebase web configuration for project `poly-dating-app-5354c`. Firebase web config is client-side configuration, not a service-account secret; never commit service-account JSON, private keys, or privileged credentials.

Before using the real account flow, verify in the Firebase Console that:

1. Email/Password Authentication is enabled.
2. Email verification delivery is configured and working.
3. Cloud Firestore exists in the intended project.
4. The deployed website's domain is in Firebase Authentication's authorized domains.
5. The current deployed Firestore rules have been reviewed against the checked-in rules.

Do not deploy the checked-in rules to the live project until the existing production rules and database usage have been inspected. A rules deployment replaces the active ruleset and could interrupt existing app behavior.

## Local rules tests

Requirements: Node.js 20+, Java 21+, and npm.

```bash
npm install
npm run test:rules
```

This starts the Firestore Emulator with the checked-in `firestore.rules` and runs the tests against a demo project ID. The tests must not use production credentials or write to the production Firebase project.

The initial rule set intentionally permits authenticated reads of public profile documents and owners to create/update their own valid profile. Profile documents must not contain email addresses, selfie data, or client-asserted verification. Direct client deletion is denied until a coordinated server-side account-deletion flow exists. All other collections remain denied until their data model and authorization tests are implemented.

## Explicit local demo mode

Append `?demo=1` to the page URL to use the old local-only prototype features for demonstration. Do not use demo mode for real accounts, private conversations, or production acceptance testing. Demo accounts and demo profiles are stored in the browser and are not real users.

## Roadmap

1. Complete and review auth/profile foundation and emulator tests.
2. Implement trusted likes and idempotent mutual-match creation.
3. Implement participant-authorized real-time messaging.
4. Add server-enforced blocks, reports, moderation, and coordinated account deletion.
5. Add protected image storage, privacy/terms pages, abuse controls, and security review.
6. Package the shared web experience for Android and verify mobile behavior.
7. Run full regression/security tests in staging before any production release.

No production deployment or live Firebase rules change is performed by this branch.
