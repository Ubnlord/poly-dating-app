# PolyConnect Production Readiness Roadmap

## Goal

Turn PolyConnect from a browser-based prototype into a secure, real multi-user dating service while preserving the existing user experience. This roadmap is planning documentation only; it does not change production infrastructure or user data.

## Current baseline

The current app is primarily a single-page HTML/CSS/JavaScript application. It contains Firebase SDK integration, localStorage-backed fallback behavior, local/demo match and message state, simulated chat replies, and local-only safety reports/blocks. A selfie capture UI is not proof of student identity or age. These paths must not be presented as production functionality.

## Architecture decision

- Keep the current frontend initially to reduce rewrite risk.
- Use Firebase Authentication for real identity and sessions.
- Use Cloud Firestore for user profiles, likes, matches, conversations, messages, blocks, reports, and moderation state.
- Use Firebase Storage for profile and chat media with strict upload validation and access rules.
- Use trusted server-side functions for sensitive operations: mutual-match creation, report handling, moderation actions, account deletion, rate limits, and any privileged role checks.
- Do not add service-account credentials or other server secrets to frontend code.
- No silent local/demo fallback in production builds. Demo mode must be explicitly development-only and clearly labeled.

## Phase 0 — Safe baseline and environment

- [ ] Confirm current default branch and deployment target.
- [ ] Identify existing Firebase project configuration and environments without exposing secrets.
- [ ] Separate development/staging/production configuration.
- [ ] Add dependency and secret scanning; rotate any credential found to be exposed.
- [ ] Capture a baseline of current UX and create a rollback plan.
- [ ] Do not deploy schema/rule changes to production until reviewed and tested in a separate Firebase project or emulator.

## Phase 1 — Authentication and account lifecycle

- [ ] Implement Firebase email/password sign-up and sign-in with email verification.
- [ ] Add password reset, sign-out, session-aware routing, and clear authentication errors.
- [ ] Remove localStorage identity fallback from production.
- [ ] Require users to meet the service's minimum age before creating a dating profile; use an appropriate, privacy-conscious age-assurance process where required.
- [ ] Define account deletion to remove or anonymize associated profile, media, likes, matches, messages, and reports according to a documented retention policy.
- [ ] Never trust user-editable profile fields or client-side flags for admin/moderator authorization.

## Phase 2 — Data model and authorization

Suggested collections:
- users/{uid}: public profile fields only; no credentials or private moderation notes.
- likes/{likeId} or user-scoped likes: actor UID, target UID, timestamp; immutable actor identity.
- matches/{matchId}: canonical participant IDs, creation timestamp, active state.
- conversations/{conversationId} and messages/{messageId}: participant-bound access, server timestamp, bounded content.
- blocks/{blockId}: blocker UID and blocked UID; enforced across discovery, matches, and chat.
- reports/{reportId}: reporter, target, reason, evidence references, status, timestamps; accessible only to reporter for limited status and authorized moderators for case details.
- moderation/{uid}: restricted account status and moderation metadata; not client writable.
- appConfig: server-managed public settings only.

Security requirements:
- [ ] Deny access by default and write Firestore Security Rules before enabling production reads/writes.
- [ ] Users can read/update only allowed fields of their own profile.
- [ ] Prevent clients from assigning privileged roles, verification status, moderation state, or another user's UID.
- [ ] Only conversation participants can read messages; block/unmatch state must restrict future contact.
- [ ] Validate field types, lengths, timestamps, allowed enum values, and document relationships in rules and trusted functions.
- [ ] Use server timestamps and trusted server operations for sensitive state transitions.
- [ ] Test rules with Firebase Emulator Suite, including malicious cross-user read/write attempts.

## Phase 3 — Real discovery and matching

- [ ] Replace bundled/demo profiles with approved profiles from the backend.
- [ ] Add pagination and server-enforced filters; avoid exposing private contact details or exact location.
- [ ] Store likes durably and prevent duplicate likes.
- [ ] Create one canonical match only when both users have liked each other, using a trusted, idempotent operation.
- [ ] Exclude blocked, suspended, deleted, and otherwise ineligible accounts.
- [ ] Add automated tests for concurrent likes, duplicate requests, self-likes, blocked users, and deleted accounts.

## Phase 4 — Real-time chat and media

- [ ] Remove simulateReply() from production.
- [ ] Persist messages and deliver them through Firestore listeners or another authenticated real-time service.
- [ ] Authorize every conversation and message read/write against both participants and block/unmatch state.
- [ ] Add message size/type limits, rate limits, abuse throttling, unread state, and pagination.
- [ ] Store uploaded images in protected Firebase Storage paths; validate MIME type and size, and avoid trusting filenames.
- [ ] Add clear, report, block, and unmatch flows that have defined server-side effects.
- [ ] Avoid claiming end-to-end encryption unless it is actually implemented and independently reviewed.

## Phase 5 — Trust, safety, and moderation

- [ ] Create server-backed report submission and a moderator-only review queue.
- [ ] Enforce blocks on discovery, new likes, match visibility, and messaging.
- [ ] Provide user-facing safety guidance and a contact path for urgent concerns.
- [ ] Define moderation response process, appeals, evidence access, retention, and audit logging.
- [ ] Use student verification only if a reliable provider/process is selected; selfie capture alone must not confer a verified badge.
- [ ] Minimize collection of sensitive information and avoid displaying precise location.
- [ ] Publish terms, privacy notice, community standards, and deletion/retention policies before public launch.

## Phase 6 — Admin and operations

- [ ] Build a separate, role-protected moderation/admin interface.
- [ ] Grant moderator/admin roles only through a trusted server-side process.
- [ ] Require least privilege, audit logs, and stronger authentication for privileged accounts.
- [ ] Add monitoring for authentication failures, abuse, function errors, storage failures, and unusual traffic.
- [ ] Establish backup/restore and incident-response procedures.

## Phase 7 — Testing and release gates

- [ ] Unit and integration tests for auth, profiles, likes, matches, chat, blocks, reports, and deletion.
- [ ] Firebase Emulator Suite tests for Firestore and Storage rules.
- [ ] Security tests for cross-account access, privilege escalation, injection/XSS, upload abuse, spam, and rate limits.
- [ ] Mobile layout, accessibility, browser back navigation, and slow/offline network checks.
- [ ] Verify production configuration and deployment from the intended commit.
- [ ] Launch a small controlled beta only after all critical security and safety tests pass.
- [ ] Keep production launch blocked while any critical authorization or data exposure issue remains.

## Recommended implementation order

1. Audit current Firebase initialization, auth flow, and configuration handling.
2. Create a staging Firebase project/emulator setup and baseline tests.
3. Implement authentication and profile data model.
4. Write and test security rules before connecting production UI to real user data.
5. Implement likes/matches, then real messaging, then moderation/admin.
6. Run the full regression suite and review before release.

## Explicit non-goals for the first implementation pass

- Do not migrate or delete existing user data without a reviewed migration plan.
- Do not deploy untested rules or functions to production.
- Do not expose service-account keys, private credentials, or privileged admin capabilities in client code.
- Do not treat demo data, fake replies, local reports, or selfie capture as production functionality.
