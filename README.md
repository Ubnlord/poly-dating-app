# PolyConnect

PolyConnect is a mobile-first dating app prototype for adults (18+) at Nigerian polytechnics, starting with Federal Polytechnic Oko, Anambra State.

## Project plan and architecture

The complete product roadmap, proposed repository tree, data model, security/privacy requirements, test matrix, and beta acceptance criteria are documented in [docs/PRODUCT_PLAN_AND_ARCHITECTURE.md](docs/PRODUCT_PLAN_AND_ARCHITECTURE.md).

That document describes the **target architecture**, not files or capabilities already implemented. The current app remains a single-page prototype; verify behavior in code and tests before treating any feature as production-ready. Firebase profile persistence and profile-photo upload are connected, but discovery, likes/matches, conversations, reports, blocks, and moderation remain incomplete or browser-local.

## Current prototype capabilities

The existing single-page app includes a mix of browser-local demo features and Firebase web SDK integrations:

- Firebase Email/Password sign up and login with email verification; authentication fails closed if Firebase is unavailable (no local password fallback).
- 18+ declaration during sign up and password reset when Firebase Auth is available.
- Profile onboarding with school, department, interests, relationship goals, and profile photo uploads to Firebase Storage (JPG/PNG/WebP, up to 5 MiB), subject to authenticated-adult Storage rules.
- Optional selfie camera preview only; it is not identity or student verification.
- Discovery filters, likes, passes, super likes, and demo matching UI are present, but no fictional sample members are shown to signed-in users while the shared discovery backend is incomplete.
- Demo conversations with emoji, image attachments, reactions, and read-state UI; simulated auto-replies are disabled so fake messages are not mistaken for real people.
- Safety Center UI for reporting, blocking, unmatching, and chat actions.
- Event-interest saving, profile editing, local data export, and local app-data deletion.

**Important:** local demo data is not shared across accounts/devices and does not provide production identity, matching, messaging, or moderation. UI controls alone do not enforce security.

## Firebase configuration

The existing `index.html` configures the Firebase web app `poly-dating-app-5354c` and loads Firebase App, Authentication, Firestore, Storage, and Analytics SDKs from the CDN. Profile metadata is saved in Firestore; uploaded avatar files are stored under `profilePhotos/{uid}/avatar`.

For connected-backend testing, verify that the intended Firebase project has:
1. Email/Password authentication enabled.
2. Cloud Firestore provisioned.
3. Correct Firestore and Storage security rules.
4. Any required indexes deployed.
5. Analytics enabled only if desired and disclosed in the privacy notice.

Do not put service-account credentials, private keys, or other secrets in browser code or commit them to GitHub. Firebase web configuration is not a substitute for database rules.

## Before a public beta

The prototype must not be considered production-ready until real multi-user discovery and chat, reviewed Firestore/Storage rules, backend-backed reporting and moderation, reliable account deletion/export, privacy/terms, and automated functional/security tests are complete. Use Firebase Emulator Suite or an isolated test project first; do not test risky migrations against real member data.

## Deployment visibility check

The login screen's build label is a visual marker only; it does not prove that security rules or backend flows are working. Run the inline-JavaScript check and Firebase Emulator Suite tests, and verify the deployed commit before release.
