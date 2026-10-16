# PolyConnect — Real Dating App Plan & Project Tree

**App:** PolyConnect — Verified Dating for Polytechnic Students  
**Audience:** Adults aged 18+ attending polytechnics in Nigeria  
**Origin:** Expanded from the single-file prototype at https://github.com/Ubnlord/poly-dating-app  
**Status:** Planning document. Production launch is blocked until the security, data, testing, and review gates below pass.

## 1. Goal and implementation principles

Turn the HTML prototype into a maintainable web application with real multi-user identity, profile storage, mutual matching, chat, safety tools, and moderation.

Core principles:

- Firebase Authentication establishes account identity; email verification does not prove age or student status.
- Firestore Security Rules and trusted backend code enforce authorization. The browser is never an authority for identity, matching, or moderation.
- Profile photos and chat attachments use Firebase Storage with restrictive upload rules; avoid storing image data URLs in Firestore or localStorage.
- Demo profiles, simulated matches, and fake replies must never be represented as real users or real conversations.
- Account-scoped local state must not leak between accounts. Sensitive data is loaded by authenticated UID from the backend.
- Do not migrate or delete production data, change production Firebase settings, or deploy until an isolated test run and independent review pass.

## 2. Recommended project tree

```text
polyconnect/
├── apps/
│   ├── web/                         # Vite + React + TypeScript PWA
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── manifest.webmanifest
│   │   │   └── icons/
│   │   ├── src/
│   │   │   ├── app/                 # Router, providers, route guards
│   │   │   ├── components/          # Shared UI, forms, dialogs, loaders
│   │   │   ├── features/
│   │   │   │   ├── auth/            # Signup, login, email verification, reset
│   │   │   │   ├── profile/         # Profile wizard, editing, photo upload
│   │   │   │   ├── discovery/       # Filters, profile cards, likes
│   │   │   │   ├── matches/         # Mutual matches and unmatching
│   │   │   │   ├── chat/            # Threads, messages, attachments
│   │   │   │   ├── safety/          # Block, report, privacy, deletion
│   │   │   │   └── events/          # Event listing and registrations
│   │   │   ├── hooks/               # useAuth, useProfile, useMatches, useChat
│   │   │   ├── services/            # Firebase clients and repository modules
│   │   │   ├── utils/               # Validation, filters, dates, errors
│   │   │   ├── styles/              # Tailwind and global styles
│   │   │   ├── types/               # Frontend domain types
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── admin/                       # Optional restricted moderation console
│       └── src/
│           ├── reports/
│           ├── users/
│           ├── events/
│           └── audit/
├── backend/
│   └── functions/                   # Trusted Firebase Cloud Functions
│       └── src/
│           ├── profile.ts
│           ├── matching.ts
│           ├── messaging.ts
│           ├── moderation.ts
│           ├── account-deletion.ts
│           └── notifications.ts
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   ├── firestore.indexes.json
│   └── emulator-data/               # Synthetic fixtures only, never real user data
├── shared/
│   └── types/                       # Domain contracts shared across apps/functions
├── tests/
│   ├── rules/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── PLAN_TREE.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   ├── DATA_MODEL.md
│   ├── PRIVACY.md
│   └── DEPLOYMENT.md
├── .github/
│   └── workflows/                   # Lint, type-check, unit, emulator, E2E, build
├── .env.example                     # Placeholders only; no credentials
├── package.json                     # Workspace scripts
├── pnpm-workspace.yaml
└── README.md
```

### Recommended stack

- **Frontend:** Vite, React, TypeScript, Tailwind CSS, React Router.
- **Identity and data:** Firebase Authentication, Cloud Firestore, Firebase Storage.
- **Trusted operations:** Firebase Cloud Functions (or a separately reviewed backend).
- **Real-time chat:** Firestore listeners after message and conversation rules are implemented.
- **Hosting:** Firebase Hosting or Vercel, with preview deployments separated from production.
- **Tests:** Vitest/React Testing Library, Firebase Emulator Suite rules/integration tests, and Playwright for browser E2E.
- **Package manager:** pnpm workspaces or npm workspaces; choose one and commit its lockfile.

Do not create the monorepo in one risky rewrite. Start with the current prototype and Phase 1 security fixes, then migrate one feature at a time while preserving a reviewable branch.

## 3. Product roadmap

### Phase 0 — Prototype inventory

- [x] Single-file HTML prototype exists.
- [x] Prototype includes a profile wizard, swipe-style discovery, mock matching/chat, safety UI, events, and dark mode.
- [x] Phase 0 product/architecture documentation was drafted in the repository.
- [ ] Inventory every localStorage key, mock data path, Firebase operation, and UI route before migrating.
- [ ] Label demo profiles and simulated conversations clearly; disable them in production mode.

### Phase 1 — Production foundation and authentication

- [x] Date-of-birth field with client-side 18+ validation.
- [x] Firebase email-verification flow and removal of the silent local-account fallback from signup/login.
- [x] Initial Firestore rules and direct-access tests included in the Phase 1 branch.
- [x] Regression tests added for signed-out access and account-A/account-B profile isolation.
- [ ] Confirm the latest Auth + Firestore Emulator workflow passes on the newest commit; repair every failing assertion.
- [ ] Complete browser-level tests for signup, unverified login, resend verification, password reset, verified login, refresh/session restore, account switching, and sign-out.
- [ ] Clear or namespace all account-scoped browser state on sign-out and user change; test matches, chats, likes, reports, blocked users, and profile caches.
- [ ] Remove production use of hardcoded synthetic profiles and local-only fake interactions.
- [ ] Add loading, empty, error, retry, and offline states.
- [ ] Add a strict TypeScript/Vite baseline and CI checks before migrating more features.
- [ ] Keep PR #16 draft until automated checks and fresh independent review pass.

**Security limitation:** DOB self-declaration is not reliable age assurance; email verification does not prove age, student status, or identity. Any age/student-verification claim must be backed by a separately assessed process and must not be represented as verified based only on email verification.

### Phase 2 — Real profiles and media

- [ ] Define the Firestore data model and field ownership in `docs/DATA_MODEL.md`.
- [ ] Use UID-owned private profile documents and a separate minimal discovery projection if public profile discovery is required.
- [ ] Validate allowed fields, lengths, age bounds, ownership, and immutable fields in Firestore rules and trusted server code.
- [ ] Add Storage rules for authenticated uploads, size/type limits, ownership, and access boundaries.
- [ ] Upload real profile images to Storage; save download references/paths rather than base64 image content.
- [ ] Validate profile wizard form values server-side; never trust browser-provided `verified` flags.
- [ ] Add profile edit, photo replacement/removal, and recoverable upload failures.
- [ ] Add privacy settings and explicit profile visibility behavior.
- [ ] Test owner access, cross-user denial, invalid payloads, unverified access, Storage abuse, and malformed uploads in emulators.

### Phase 3 — Real discovery and matching

- [ ] Replace the synthetic local profile list with authorized backend queries against active profiles.
- [ ] Support limited, indexed filters such as school, age range, interests, and relationship goal.
- [ ] Store likes using authenticated UID-based records and prevent duplicate likes.
- [ ] Compute mutual matches in trusted code, not by client-side assumptions.
- [ ] Ensure a user cannot create a match, impersonate a participant, or read another user's private match data.
- [ ] Implement unmatch and block behavior consistently across discovery, matches, and chat.
- [ ] Add idempotency and concurrency tests for simultaneous likes and duplicate event delivery.
- [ ] Verify pagination, query constraints, index requirements, and data minimization.

### Phase 4 — Messaging and safety

- [ ] Create conversation documents only via a trusted operation or strict validated transaction.
- [ ] Require conversation membership for reads/writes and enforce sender UID from auth, not request payload.
- [ ] Implement real-time messages with length/rate limits and safe rendering of user content.
- [ ] Add image attachment validation and Storage authorization.
- [ ] Add report/block/unmatch flows backed by the server, not local-only browser arrays.
- [ ] Create a restricted moderation queue with least-privilege access and auditable actions.
- [ ] Add basic spam, abuse, rate-limit, and suspicious-account controls.
- [ ] Define evidence retention and access policy for reports; avoid unnecessarily collecting sensitive data.
- [ ] Ensure blocked users cannot initiate new contact or view data that policy says should be hidden.

### Phase 5 — Account lifecycle, privacy, and legal readiness

- [ ] Implement coordinated account deletion using trusted code: disable/delete Auth identity and remove or anonymize profile, media, matches, and messages according to documented retention policy.
- [ ] Ensure deletion is idempotent, retryable, observable, and tested against partial failures.
- [ ] Add data export and privacy controls where required.
- [ ] Publish Terms, Privacy Policy, Community Guidelines, safety guidance, and contact/reporting channels before public launch.
- [ ] Document what data is collected, why it is needed, retention periods, subprocessors, and deletion behavior.
- [ ] Review Nigerian privacy obligations and any relevant requirements for users who may access the service from other jurisdictions with qualified counsel.
- [ ] Do not claim institutional student verification or age verification until the process is implemented and independently assessed.

### Phase 6 — Events, notifications, and admin

- [ ] Store real events in an authorized collection and validate event registration.
- [ ] Add notifications through trusted backend functions; do not expose server credentials in the browser.
- [ ] Restrict admin routes and backend operations to explicit admin claims/permissions.
- [ ] Add audit records for moderation and sensitive administrative actions.
- [ ] Test admin privilege escalation, unauthorized moderation, and user-data access.

### Phase 7 — Release and operations

- [ ] Maintain separate development, test, staging, and production Firebase projects.
- [ ] Verify rules and functions deploy from reviewed source and capture the deployed commit.
- [ ] Use least-privilege service accounts and managed secrets; commit only placeholders to `.env.example`.
- [ ] Add error monitoring, privacy-aware logging, abuse monitoring, backups, and an incident response procedure.
- [ ] Test mobile viewport behavior, accessibility, performance, poor networks, and major browser flows.
- [ ] Run migration/replay and rollback exercises before any production data migration.
- [ ] Obtain independent security review and product/privacy approval.
- [ ] Deploy to staging first; production release requires an explicit go/no-go decision.
- [ ] Verify deployed rules, hosting commit, auth flows, and rollback readiness after deployment.

## 4. Initial domain model

The exact paths should be finalized in `docs/DATA_MODEL.md`. A starting point is:

- `profiles/{uid}`: owner profile and private account settings.
- `publicProfiles/{uid}`: minimal, validated fields used for discovery only.
- `likes/{likeId}` or `users/{uid}/likes/{targetUid}`: idempotent like records, written through trusted logic where needed.
- `matches/{matchId}`: participant UIDs and server-generated timestamps.
- `conversations/{conversationId}`: participant UIDs and metadata.
- `conversations/{conversationId}/messages/{messageId}`: sender UID, bounded text/media reference, timestamp, moderation state.
- `users/{uid}/blocks/{targetUid}`: block relationships.
- `reports/{reportId}`: restricted report data with minimal retention and moderator-only access.
- `events/{eventId}` and `events/{eventId}/registrations/{uid}`: event details and authorized registration.
- `adminAudit/{eventId}`: restricted records for sensitive moderator actions.

Rules and trusted functions must enforce the correct participant/owner permissions. A proposed collection layout is not permission by itself. Avoid broad collection reads and do not expose private fields in discovery documents.

## 5. Required CI gates

Every pull request that changes auth, data, rules, media, matching, chat, or account deletion should run the relevant gates:

1. **Static quality:** format/lint, TypeScript type-check, dependency checks, and frontend build.
2. **Unit tests:** validators, age-calculation edge cases, state transitions, filtering, and error mapping.
3. **Rules tests:** unauthenticated/unverified denial, ownership, cross-user isolation, invalid field rejection, and deny-by-default behavior.
4. **Emulator integration:** Auth verification, profile create/read/edit, account switching, sign-out, matching, messages, blocks, reports, and account deletion.
5. **Browser E2E:** critical journey from signup through verification/login/profile setup and sign-out, using only synthetic test accounts.
6. **Security review:** no client-side trust for privileged decisions, no committed secrets, no local plaintext passwords, no direct client admin privileges.
7. **Release gate:** all required checks pass on the same final commit SHA and independent reviewers inspect the final diff.

## 6. Immediate next steps

1. Fix and verify the current Phase 1 Auth + Firestore emulator failure on the exact latest commit.
2. Add browser/session state isolation tests and inspect all localStorage keys for cross-account leakage.
3. Finish independent review of the updated Phase 1 commit and keep the PR draft until its test evidence is clean.
4. Create `docs/ARCHITECTURE.md` and `docs/DATA_MODEL.md` with approved collection paths, authorization rules, and trusted operations.
5. Establish the Vite/React workspace on a dedicated migration branch only after the foundation gates pass.
6. Migrate one feature at a time and keep all production settings, live data, and deployments unchanged until explicit release approval.

## 7. Definition of done

PolyConnect is not production-ready merely because the UI renders or email verification works. The real app is ready for a controlled launch only when private data is enforced by backend rules, users cannot cross-read one another's accounts, all essential flows pass in isolated emulators and browser tests, moderation and account deletion work reliably, privacy/legal documents are available, and independent reviewers approve the exact release commit.
