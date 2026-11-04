# PolyConnect

PolyConnect is a mobile-first dating app prototype for adults (18+) at Nigerian polytechnics, starting with Federal Polytechnic Oko, Anambra State.

## Project plan and architecture

The complete product roadmap, proposed repository tree, data model, security/privacy requirements, test matrix, and beta acceptance criteria are documented in [docs/PRODUCT_PLAN_AND_ARCHITECTURE.md](docs/PRODUCT_PLAN_AND_ARCHITECTURE.md).

That document describes the **target architecture**, not files or capabilities already implemented. The current app remains a single-page prototype; verify behavior in code and tests before treating any feature as production-ready. Firebase profile persistence and profile-photo upload are connected. Callable Cloud Functions now provide paginated discovery, rate-limited likes/passes/super-likes, mutual-match and conversation creation, blocking/unblocking, unmatching, safety reports, match listing, account data export, and rate-limited text-message sending. The web UI uses these services for discovery, swipes, reports, blocks, and text conversations; matched conversation messages stream from Firestore in real time. Photo messages, reactions, moderator tooling, cloud account deletion, and production deployment remain incomplete.

## Current prototype capabilities

The existing single-page app includes a mix of browser-local demo features and Firebase web SDK integrations:

- Firebase Email/Password sign up and login with email verification; authentication fails closed if Firebase is unavailable (no local password fallback).
- 18+ declaration during sign up and password reset when Firebase Auth is available.
- Profile onboarding with school, department, interests, relationship goals, and profile photo uploads to Firebase Storage (JPG/PNG/WebP, up to 5 MiB), subject to authenticated-adult Storage rules.
- Optional selfie camera preview only; it is not identity or student verification.
- Discovery filters, paginated member discovery, likes, passes, super likes, and mutual matching use trusted Firebase callable functions; no fictional sample members are shown.
- Private text conversations are available only after mutual matches; messages are sent through rate-limited callable functions and streamed from Firestore. Image attachments, reactions, read receipts, and push notifications are not enabled.
- Safety controls submit backend-backed reports, blocks, unblocks, and unmatches; moderator review and a cross-device safety-records view are not yet implemented.
- Event-interest saving, profile editing, secure Firebase account-data export, and a clearly labeled local-cache clearing control (not cloud account deletion).

**Important:** some secondary UI state remains browser-local. Shared discovery, mutual matching, and text messaging use Firebase, but the app does not provide identity/student verification or a moderator workflow. UI controls alone do not enforce security.

## Firebase configuration

The existing `index.html` configures the Firebase web app `poly-dating-app-5354c` and loads Firebase App, Authentication, Firestore, Storage, Functions, and Analytics SDKs from the CDN. Profile metadata is saved in Firestore; uploaded avatar files are stored under `profilePhotos/{uid}/avatar`. Trusted callable functions live in `functions/index.js` and are configured for the `us-central1` region.

For connected-backend testing, verify that the intended Firebase project has:
1. Email/Password authentication enabled.
2. Cloud Firestore provisioned.
3. Correct Firestore and Storage security rules; likes and reports are callable-only writes.
4. Any required indexes deployed.
5. Analytics enabled only if desired and disclosed in the privacy notice.

Do not put service-account credentials, private keys, or other secrets in browser code or commit them to GitHub. Firebase web configuration is not a substitute for database rules.

## Before a public beta

The prototype must not be considered production-ready until the latest emulator tests pass, reviewed Firestore/Storage rules and Cloud Functions are deployed to the intended project, moderator tooling is in place, cloud account deletion and retention/export policy are reviewed, privacy/terms are published, and mobile/accessibility/security checks are complete. Deploy functions and rules only to the intended Firebase project after reviewing the project ID and release plan. Use Firebase Emulator Suite or an isolated test project first; do not test risky migrations against real member data.

## Deployment visibility check

The login screen's build label is a visual marker only; it does not prove that security rules or backend flows are working. Run the inline-JavaScript check and Firebase Emulator Suite tests, and verify the deployed commit before release.
