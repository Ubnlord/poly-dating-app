# Firebase security foundation — rollout notes

## Files added

- `firestore.rules`: default-deny rules for private user metadata, profiles, likes, matches, conversations/messages, blocks, reports, and audit records.
- `storage.rules`: verified-adult access for profile avatar images with a 5 MiB cap and image MIME allowlist.
- `firebase.json`: points Firebase CLI at the two rules files.

## Critical rollout warning

These rules are a **security baseline and are not yet validated by the Firebase Emulator Suite**. They have not been deployed. Do not deploy them to the existing Firebase project until the rules tests below pass and the schema is reconciled with the current app.

The current app is a single-file prototype and may still use localStorage, demo records, different field names, or direct client writes. Rules intentionally reject client writes to matches, conversations, blocks, and report updates because those transitions need trusted backend authorization. Until a trusted backend (for example, callable/HTTPS Cloud Functions or another authenticated server) implements them, those features will not be fully operational against Firebase.

## Canonical data contract

### `profiles/{uid}`
Allowed public fields are explicitly allowlisted in the rules. Do not store email, exact date of birth, selfie data, moderation notes, or identity evidence in this document. The `age` field is a user declaration, not proof of age. A self-entered age cannot establish real-world age eligibility.

### `likes/{actorUid_targetUid}`
A verified adult can create a one-time like/pass/superLike document for another eligible profile. Client updates/deletes are denied to prevent rewriting consent history. A trusted backend must check reciprocal likes and create the match transactionally.

### `matches/{matchId}` and `conversations/{matchId}`
Clients cannot create or mutate these documents. The trusted backend must use a deterministic ID based on the sorted two user IDs, validate both likes, verify both accounts are eligible and unblocked, and atomically create match/conversation records. The two member IDs should be stored in the same deterministic order.

### `blocks/{blockerUid_blockedUid}`
Client block writes are denied until a trusted backend is implemented to create the block, revoke or deactivate matching conversations, and record an audit event atomically. This avoids a UI-only block that still permits message reads.

### `reports/{reportId}`
A verified adult may submit a constrained report. Only accounts with a server-issued `moderator: true` custom claim can read reports. Never let clients set their own custom claims or change report status.

## Required emulator test matrix before deployment

Run these against Firebase Emulator Suite using disposable test accounts and no production data:

1. Unauthenticated reads/writes are denied.
2. Unverified accounts cannot read discovery profiles or write dating data.
3. Missing profile, age below 18, and suspended account cannot use dating collections.
4. Adult owner can create/read/update only allowed profile fields.
5. Another user cannot edit the owner's profile or read private user metadata.
6. Email, selfie, moderator flags, and unknown fields are rejected from public profiles.
7. User cannot create a like for self, a nonexistent/ineligible target, or a blocked user.
8. A client cannot create or alter a match or conversation.
9. Only active match members can read/send messages; nonmembers and blocked members are denied.
10. Message sender must equal authenticated UID; empty or overlong text is rejected.
11. Ordinary users cannot read reports; reporter can submit a valid report but cannot edit/delete it.
12. Only server-authorized moderation paths can create blocks, update report status, or write audit events.
13. Storage rejects unverified/non-adult users, non-owner uploads, non-image files, oversize files, and all unknown paths.
14. Concurrent reciprocal likes create exactly one match and one conversation through the trusted backend.

## Remaining implementation work

- Add Firebase Emulator Suite dependencies and automated rules tests; this repository currently has no root `package.json` or Firebase CLI setup.
- Implement trusted server functions for mutual matching, block/unmatch, report moderation, and message throttling.
- Align the existing UI schema and photo upload paths with these rules; keep local demo mode clearly separated.
- Add adult eligibility review policy. The declared age field is not identity/age verification.
- Test profile save/reload/edit across two accounts.
- Run build and emulator tests on the exact commit, then request explicit approval before any production deployment.

## Deployment policy

No Firebase deployment is performed by these changes. Do not run `firebase deploy` until emulator tests pass, the rules are reviewed, and the app's expected fields and flows are confirmed.