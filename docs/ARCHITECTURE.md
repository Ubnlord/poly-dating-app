# PolyConnect Architecture

**Status:** Phase 0 recommendation — proposed, not fully implemented  
**Market:** Nigeria first; pilot at Federal Polytechnic Oko, Anambra State  
**Budget:** ₦0/month initially; Firebase Spark/free tiers unless founder approves paid service.

## Principles
- Mobile-first UI; migrate incrementally without breaking the current prototype.
- Never commit secrets, service-account files or private credentials.
- Treat browser code as untrusted; enforce authorization and sensitive decisions in trusted backend logic.
- Demo mode must be explicit and visibly labelled, never masquerade as real account data.
- Minimize sensitive data, especially selfies, reports and chat content.
- Do not label features production-ready until backend behavior, security rules, failure states and tests are present.

## Recommended stack
| Layer | Recommendation | Notes |
|---|---|---|
| UI | Vanilla JavaScript ES modules initially | Lowest migration cost from the single HTML prototype; reassess framework after modularization. |
| Android | Existing Capacitor wrapper, subject to repository/build verification | Test native permissions, WebView behavior and release signing. |
| Authentication | Firebase Auth email/password + verification | Personal email allowed; require verified email before access. |
| Database | Cloud Firestore | Deny by default, validate schema and ownership; queries must satisfy rules. |
| Trusted server logic | Only adopt Cloud Functions or another backend after checking current Spark-plan restrictions and quotas | Rate limits, moderation and privileged operations cannot safely depend on browser code. Disable unsupported sensitive features until an approved trusted path exists. |
| Media | Defer broad photo upload until storage, quotas and access controls are validated | Enforce MIME/type and size limits; keep verification evidence private. |
| Camera | Dedicated browser/Capacitor camera service | Permission prompt at point of use; handle denial, retry and lifecycle. Camera capture is not liveness verification. |
| Tests/CI | JavaScript unit tests, Firebase Emulator rules tests, integration tests and Android device smoke tests; GitHub Actions on every PR | Emulator success does not prove live Firebase Console configuration. |
| Monitoring | Privacy-conscious logs and error reporting within approved free quotas | Never log passwords, tokens, full messages or raw verification images. |

## Suggested source tree
```text
public/{images,icons,manifest.json}
src/app/{App.js,router.js,navigation.js}
src/components/{public,common,layout}/
src/features/{auth,profile,settings,discovery,matches,messaging,verification,safety}/
src/services/{firebase,camera,storage}/
src/{hooks,utils,styles}/
android/
tests/{unit,integration,rules,e2e}/
docs/{PRODUCT_BRIEF.md,ARCHITECTURE.md,PROJECT_PLAN.md,SECURITY.md}
.env.example
package.json
README.md
```
This is a target tree, not a claim that all files exist. Migrate one feature at a time and keep the app runnable.

## Core data model
Use Firebase Auth UID as stable account ID; never store passwords in Firestore or localStorage.
- `users/{uid}`: minimal account state, email-verification state where needed, account status and accepted policy version. Client cannot write privileged fields.
- `profiles/{uid}`: display name, minimal age-gate result, self-declared school/department/year, interests, relationship intent, profile photos, visibility preferences and timestamps.
- `likes/{id}`: actor UID, target UID, timestamp and idempotency key; prevent duplicate operations.
- `matches/{matchId}`: participant UIDs, creation time and status; created only by trusted logic after mutual consent.
- `conversations/{id}/messages/{messageId}`: participant membership, content/media metadata, timestamps and moderation state; validate membership, length and rate.
- `blocks/{uid}/items/{targetUid}`: owner-controlled block list; exclude blocked relationships in both directions.
- `reports/{reportId}`: reporter, reported user, category, minimal evidence reference, timestamp and moderation status; private to authorized moderators.
- `moderationActions/{id}`: restricted audit trail with retention limits.
- `events/{eventId}` and user-specific event-interest records.
- `deletionJobs/{uid}`: retryable trusted deletion workflow state.

Do not expose report contents, moderation notes, email addresses or private verification evidence in public queries. Use schema versions, stable IDs, timestamps and idempotency for sensitive mutations.

## Authorization and abuse controls
- Firestore rules deny by default and validate field allowlists, types, lengths, ownership and state transitions.
- Clients cannot set verification badges, admin roles, moderation state, suspensions or authoritative match state.
- Check email verification through trusted authorization where appropriate, not just hidden UI.
- Signup rate limits may use IP/device signals and suspicious patterns but must account for shared devices, false positives and appeals; avoid invasive fingerprinting.
- Disposable email detection is a risk signal, not a replacement for email confirmation or moderation.
- Reports, blocks, matching and account deletion need trusted operations and tests.
- Define the liveness threat model and evidence-retention policy before displaying a verified badge.
- Never put admin credentials or service-account keys in frontend code, Git history or `.env.example`.

## Monthly cost estimate (USD)
Planning ranges only, not vendor quotes or guaranteed costs. Current Firebase quotas, Spark restrictions, regional pricing and service availability must be checked before launch. Assumptions: lean pilot, low media volume, no paid verification vendor and no paid marketing.

| Monthly active users | Lean prototype estimate | Caveat |
|---:|---:|---|
| 1,000 | $0 if usage remains within free quotas | Low usage and free-tier-compatible features only; excludes moderation labor and founder time. |
| 10,000 | $0–$50+ | Quotas for reads/writes, media, trusted server logic or egress may be exceeded; do not assume $0. |
| 100,000 | $50–$500+ | Very uncertain; chat, image storage/egress, anti-abuse and operations can exceed this range. Not a validated forecast. |

At ₦0/month, constrain scope: no paid vendor or unapproved upgrade, and no high-volume chat/media until quotas and safe operating limits are checked. Estimates exclude taxes, naira conversion, app-store fees, legal advice, moderation labor, devices and founder time.

## Privacy and deletion
Collect only necessary data. Separate public photos from private verification images. Define retention/deletion for accounts, reports, chats and backups. Account deletion must be trusted, retryable and cover Auth plus related database/storage records, while clearly disclosing legally justified retained records. Restrict moderator access and audit privileged actions. Obtain professional review of Nigerian data-protection and cross-border processing obligations.

## Rollout gates
1. Audit and document the prototype.
2. Implement trust and safety before growth features.
3. Test Firestore rules in the emulator and critical flows on real Android devices.
4. Run an invitation-only Federal Polytechnic Oko pilot with an operational moderation process.
5. Measure safety, reliability and cost before expanding.
6. Obtain legal/privacy and app-store policy reviews before public release.

## Founder actions outside GitHub
Verify Firebase Console settings, quotas/billing, Android signing credentials, store accounts, legal compliance and moderator availability directly. No production Firebase settings are changed in this phase.
