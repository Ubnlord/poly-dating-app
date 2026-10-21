# PolyConnect — Complete Dating App Plan and Project Tree

**Status:** planning document for the existing single-page prototype  
**Target market:** Nigerian polytechnic students, starting with Federal Polytechnic Oko, Anambra State  
**Audience:** adults aged 18 and older only  
**Initial operating constraint:** solo founder; prioritize Firebase free-tier services and avoid paid dependencies until validated  
**Release rule:** this plan does not authorize production data migrations, Firebase project setting changes, or public launch.

## 1. Product vision

PolyConnect helps adults at Nigerian polytechnics discover compatible people, express mutual interest, and communicate safely. The first release should prioritize reliable account access, authentic profiles, mutual-consent matching, private messaging, abuse reporting, and account control—not vanity features or unverified claims.

### Product principles
- Adults only: require an explicit 18+ declaration; never intentionally onboard minors.
- Consent first: a conversation can begin only after a mutual match, unless a future, separately reviewed feature explicitly changes this.
- Privacy by default: collect the minimum data needed, avoid exposing email addresses, exact location, verification documents, or private moderation notes.
- Safety is a core feature: block, report, unmatch, rate limits, moderator review, and a documented escalation path.
- Honest verification: distinguish email verification, campus affiliation review, and photo/selfie checks; do not call a client-side check identity proof.
- Reliable accounting of data: local demo data is not a shared account or production backend.
- Accessible and mobile-first: optimize for Android browsers and low-bandwidth connections.

## 2. Scope by release

### Phase 0 — Baseline and risk inventory
- Record the current main branch, existing single-file UI, Firebase integration points, and current test/deployment setup.
- Separate confirmed features from demo-only or localStorage-only behavior.
- Document Firebase collections, Storage paths, auth flows, and security rules before changing data models.
- Define a safe test project/emulator workflow and a rollback plan.
- Deliverables: baseline checklist, threat model, schema proposal, test matrix.

### Phase 1 — Foundation and account lifecycle
- Email/password sign-up, sign-in, sign-out, password reset, email verification, session restoration, and clear auth errors.
- Require 18+ declaration and terms/privacy acknowledgement at onboarding; store acknowledgement timestamp and policy version.
- Profile completion flow with validation, progress, drafts, and edit/review.
- Ensure protected screens require an authenticated, eligible account.
- Add account export and deletion that remove or anonymize backend data according to the retention policy.
- Do not treat localStorage fallback as a production identity provider.

### Phase 2 — Profiles and photo storage
- Profile fields: display name, date/age policy, campus, department/course, level (optional), bio, interests, relationship intent, gender/pronouns (optional), and visibility preferences.
- Keep email, internal user IDs, reports, moderation notes, and exact birth date private.
- Store photos in Firebase Storage with strict path and content-type/size rules; store object paths in Firestore, not long-lived download tokens as public profile data.
- Validate file size/type, handle failed uploads, allow photo removal, and revoke browser object URLs.
- Provide a clear photo moderation and abuse-reporting policy.

### Phase 3 — Discovery and compatibility
- Discover only eligible profiles that opted into discovery and are not blocked in either direction.
- Filters: age range, campus, department, interests, relationship intent, and optional distance only if safely supported.
- Use server-side pagination and bounded queries; avoid downloading the whole member database.
- Explain compatibility signals simply; do not claim scientific accuracy.
- Include empty states, loading/error states, refresh, and accessible card controls.
- Rate-limit likes and passes; prevent self-likes and duplicate actions.

### Phase 4 — Mutual matches
- Create a match only when both members have expressed interest.
- Use deterministic match IDs or a transaction to prevent duplicate matches under concurrent requests.
- Handle unlike/unmatch, blocked users, deleted accounts, and stale discovery cards consistently.
- Make match creation idempotent and add tests for simultaneous likes.
- Never allow the client to write arbitrary match records or match another user without consent.

### Phase 5 — Private messaging
- Only matched, unblocked members may read/write a conversation.
- Enforce membership and authorization in Firestore rules; do not rely on hidden buttons.
- Support text first; then emoji, delivery/read state, pagination, and carefully constrained image attachments.
- Add message length limits, spam throttles, abuse reporting, and safe rendering of user content.
- Do not simulate replies in production; label demo chat clearly when using local fixtures.
- Notifications are optional and should not reveal sensitive message content on lock screens by default.

### Phase 6 — Trust, safety, and moderation
- Report profile/message with reason, optional context, and a confirmation state.
- Block, unblock, unmatch, hide, and mute controls with predictable effects.
- Backend-backed reports with restricted moderator-only access and an audit trail.
- Moderator queue, case status, escalation notes, appeals/contact route, and documented response targets.
- Account suspension and reinstatement must be server-authorized and auditable.
- Add rate limits and abuse detection for sign-ups, likes, messages, reports, and photo uploads.
- Provide safety guidance for meeting in person and emergency/help resources appropriate to the region.

### Phase 7 — Events and campus community (optional)
- Campus events and interest RSVP only after core dating flows are reliable.
- Define who can create/edit events, moderation requirements, attendee visibility, and cancellation handling.
- Do not expose attendee lists or precise location by default.
- Keep events separate from match and message authorization.

### Phase 8 — Admin and operations
- Separate admin/moderator access from ordinary users; require least privilege.
- Moderator actions must be server-side, permission-checked, and audit-logged.
- Never embed service-account credentials or admin secrets in browser code.
- Operational views: pending reports, account status, abuse trends, service health, and deletion requests.
- Use a separate admin interface or protected routes with custom claims/server authorization; client role flags alone are not security.

### Phase 9 — Launch readiness
- Complete rules and Storage-rule reviews, abuse cases, privacy/terms, accessibility, mobile browser checks, backup/recovery, and incident procedures.
- Test against Firebase Emulator Suite or an isolated test project before touching production.
- Verify all required CI checks on the exact commit intended for release.
- Run a small opt-in campus beta; collect only necessary feedback and publish known limitations.
- Launch only after security, privacy, and operational gates are signed off.

## 3. Proposed repository tree

This tree is a **target architecture**, not a claim that these files already exist. Refactor incrementally; preserve the working app between steps.

```text
poly-dating-app/
├── index.html                         # Existing prototype entry point (current)
├── README.md                          # Setup, status, and links to project docs
├── docs/
│   ├── PRODUCT_PLAN_AND_ARCHITECTURE.md
│   ├── PRODUCT_BRIEF.md
│   ├── DATA_MODEL.md
│   ├── SECURITY_AND_PRIVACY.md
│   ├── THREAT_MODEL.md
│   ├── MODERATION_PLAYBOOK.md
│   ├── TEST_PLAN.md
│   ├── DEPLOYMENT_AND_ROLLBACK.md
│   └── decisions/
│       ├── 0001-firebase-first.md
│       └── 0002-local-demo-is-not-production.md
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.webmanifest
├── src/                               # Introduce after baseline inventory
│   ├── app/
│   │   ├── bootstrap.js
│   │   ├── routes.js
│   │   └── guards/
│   │       ├── auth-guard.js
│   │       └── adult-eligibility-guard.js
│   ├── components/
│   │   ├── Button.js
│   │   ├── FormField.js
│   │   ├── LoadingState.js
│   │   ├── EmptyState.js
│   │   ├── ProfileCard.js
│   │   └── ConfirmDialog.js
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth-service.js
│   │   │   ├── login-view.js
│   │   │   ├── signup-view.js
│   │   │   ├── password-reset.js
│   │   │   └── email-verification.js
│   │   ├── onboarding/
│   │   │   ├── onboarding-view.js
│   │   │   └── eligibility.js
│   │   ├── profiles/
│   │   │   ├── profile-service.js
│   │   │   ├── profile-editor.js
│   │   │   └── photo-service.js
│   │   ├── discovery/
│   │   │   ├── discovery-service.js
│   │   │   ├── filters.js
│   │   │   └── compatibility.js
│   │   ├── likes/
│   │   │   └── likes-service.js
│   │   ├── matches/
│   │   │   └── matches-service.js
│   │   ├── chat/
│   │   │   ├── conversation-service.js
│   │   │   ├── message-list.js
│   │   │   └── composer.js
│   │   ├── safety/
│   │   │   ├── block-service.js
│   │   │   ├── report-service.js
│   │   │   └── safety-center.js
│   │   ├── events/
│   │   │   ├── event-service.js
│   │   │   └── events-view.js
│   │   └── settings/
│   │       ├── privacy-settings.js
│   │       ├── export-data.js
│   │       └── delete-account.js
│   ├── services/
│   │   ├── firebase.js
│   │   ├── analytics.js
│   │   └── error-reporting.js
│   ├── shared/
│   │   ├── validation.js
│   │   ├── dates.js
│   │   ├── sanitize.js
│   │   └── constants.js
│   └── styles/
│       ├── tokens.css
│       ├── base.css
│       └── components.css
├── firebase/
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── security/
│   │   ├── firestore.rules.test.js
│   │   └── storage.rules.test.js
│   └── e2e/
├── scripts/
│   ├── validate-config.js
│   └── seed-demo-data.js             # Test-only; never production member data
├── .github/
│   └── workflows/
│       ├── checks.yml
│       └── security.yml
├── .env.example                       # Names/placeholders only; no real secrets
├── .gitignore
└── package.json                       # Add only when build/test tooling is introduced
```

## 4. Initial data model proposal

Use Firebase Authentication for identity. Every document must have explicit read/write authorization in rules; document IDs are not access controls.

- `users/{uid}`: private account status, created/updated timestamps, policy acknowledgement version, moderation status. Restrict sensitive fields.
- `profiles/{uid}`: approved public discovery fields only; no email, private reports, exact date of birth, or internal moderation notes.
- `profiles/{uid}/photos/{photoId}` or a validated Storage path: owner-controlled metadata; enforce size/type/path in Storage rules.
- `likes/{likeId}`: server-validated actor/target, action, timestamp, and idempotency strategy.
- `matches/{matchId}`: two member IDs, status, createdAt, updatedAt; reads only by members, writes through validated transitions.
- `conversations/{conversationId}`: member IDs and timestamps; immutable membership after creation unless a controlled server process changes it.
- `conversations/{conversationId}/messages/{messageId}`: sender ID, bounded body or attachment metadata, createdAt, moderation/deletion state; members only.
- `blocks/{blockId}`: blocker and blocked user; prevent discovery and messaging in both directions.
- `reports/{reportId}`: reporter, target, reason, relevant object reference, status, timestamps; reporter and authorized moderators only as policy permits.
- `events/{eventId}` and `eventRsvps/{rsvpId}`: optional later phase with restricted attendee visibility.
- `adminAudit/{auditId}`: server-written, append-only moderation/security actions; no client writes.

Exact schemas, indexes, retention rules, and migrations must be defined and reviewed before implementation.

## 5. Authorization and privacy requirements

1. Deny by default; write Firestore and Storage rules before connecting a new feature.
2. Users may edit only allowed fields on their own profile; they cannot self-assign verification or moderator privileges.
3. Public profile queries return only approved profile fields and only for discovery-eligible users.
4. Match and conversation membership is checked on every read and write.
5. Blocked/unmatched/suspended/deleted accounts lose access according to documented policy.
6. Enforce authorization in rules or trusted server functions, never only in UI code.
7. Validate and constrain uploads; never trust filename, MIME type, client-supplied timestamps, or a claimed user ID.
8. Keep API keys/configuration separate from secrets. Firebase web config is not an authorization boundary; rules are.
9. Provide privacy notice, terms, retention/deletion policy, consent, and a contact/reporting route before beta.
10. Keep demo fixtures isolated from real user data; do not migrate or delete production records without a reviewed plan and backup.

## 6. Quality gates and test matrix

| Area | Minimum acceptance criteria |
|---|---|
| Auth | Signup/login/logout/reset work; verified-state and session refresh behave consistently |
| Adult eligibility | Under-18 or missing eligibility cannot access discovery, matches, or chat |
| Profile | Owner can edit allowed fields; another user cannot overwrite them |
| Discovery | Filters and pagination work; hidden, blocked, suspended, and opted-out profiles are excluded |
| Likes/matches | No self-like, duplicate side effects, unauthorized match creation, or race-created duplicate matches |
| Chat | Non-members cannot read/write; blocked or unmatched participants cannot continue messaging |
| Photos | Unauthorized uploads/reads fail; invalid type/oversize files fail; removal cleans metadata safely |
| Reports/blocks | Users can report/block; only authorized moderators can read restricted cases or perform moderation actions |
| Privacy | Export works; account deletion handles Auth and associated data per retention policy |
| Resilience | Offline, permission-denied, expired-session, slow-network, and empty-state UX are clear |
| Accessibility | Keyboard and screen-reader labels, contrast, reduced motion, and mobile layouts are checked |
| Release | Lint/build/tests/security rules pass on the exact release commit; rollback steps are documented |

## 7. Recommended implementation order

1. Inspect current main and document actual behavior; add emulator-based rules tests.
2. Define the canonical user/profile schema and separate demo data from Firebase data.
3. Lock down Firestore and Storage rules; test negative/unauthorized cases first.
4. Stabilize signup, email verification, session refresh, and protected-route checks.
5. Complete profile/photo lifecycle with private metadata and validated storage paths.
6. Implement server/rules-enforced discovery, likes, and idempotent mutual matching.
7. Implement private real-time messaging for matched members only.
8. Implement backend-backed block/report/moderation and account deletion.
9. Add optional events, notifications, and admin operations only after core safety gates.
10. Run beta acceptance checks, review privacy/terms, verify backups/rollback, then make a deliberate launch decision.

## 8. Definition of “ready for beta”

PolyConnect is not ready merely because the page opens. Beta requires:
- A tested isolated backend and reviewed Firestore/Storage rules.
- Real multi-user flows that work across separate accounts and devices.
- No demo-only simulated matches/replies presented as real.
- Verified 18+ eligibility gates and private account data.
- Tested block/report/unmatch behavior and a real moderation process.
- Account export/deletion with documented backend effects.
- Privacy notice and terms appropriate to the intended jurisdiction.
- Green build, functional, and security tests on the exact release commit.
- A documented rollback and incident contact.

**Current truth:** the repository README describes a single-page prototype with local demo fallback. Treat this plan as a target and verify each feature against code and tests before describing it as implemented.
