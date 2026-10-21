# PolyConnect

PolyConnect is a mobile-first dating app prototype for adults (18+) at Nigerian polytechnics, starting with Federal Polytechnic Oko, Anambra State.

## Project plan and architecture

The complete product roadmap, proposed repository tree, data model, security/privacy requirements, test matrix, and beta acceptance criteria are documented in [docs/PRODUCT_PLAN_AND_ARCHITECTURE.md](docs/PRODUCT_PLAN_AND_ARCHITECTURE.md).

That document describes the **target architecture**, not files or capabilities already implemented. The current app remains a single-page prototype; verify behavior in code and tests before treating any feature as production-ready.

## Current prototype capabilities

The existing single-page app includes a mix of browser-local demo features and Firebase web SDK integrations:

- Email/password sign up and login, with a local demo fallback.
- 18+ declaration during sign up and password reset when Firebase Auth is available.
- Profile onboarding with school, department, interests, relationship goals, photo upload, and optional local selfie check.
- Discovery filters, likes, passes, super likes, and demo matching.
- Demo conversations with emoji, image attachments, reactions, read-state UI, and simulated replies.
- Safety Center UI for reporting, blocking, unmatching, and chat actions.
- Event-interest saving, profile editing, local data export, and local app-data deletion.

**Important:** local demo data is not shared across accounts/devices and does not provide production identity, matching, messaging, or moderation. UI controls alone do not enforce security.

## Firebase configuration

The existing `index.html` configures the Firebase web app `poly-dating-app-5354c` and loads Firebase App, Authentication, Firestore, and Analytics SDKs from the CDN.

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

The existing login screen includes the `free-upgrades-v3` build label and a “Latest free upgrades live” panel. If those are missing after deployment, the host may be serving an older commit or cached page. This visual marker does not prove that security rules or backend flows are working.
