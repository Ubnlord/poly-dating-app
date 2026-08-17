# poly-dating-app

PolyConnect is a single-page prototype for a polytechnic student dating app.

## Current free features

The app intentionally uses only browser features and Firebase web SDK integrations that can be used on a free-tier project or in local demo mode. It does **not** require a paid API, paid verification vendor, paid chat service, or paid media host.

Implemented prototype features include:

- Email/password sign up and login with a localStorage fallback.
- Required 18+ safety consent during sign up, plus a Firebase password-reset link when Firebase Auth is available.
- Profile onboarding with age, school, department, interests, relationship goals, photo upload, and optional selfie-based local verification.
- Smart discovery with search, major, relationship goal, verification, gender, state, and age filters, compatibility notes, likes, passes, super likes, and undo.
- Deterministic demo mutual matching rather than paid matching infrastructure.
- Local demo conversations with emoji, image attachments, reactions, read-state UI, and simulated replies.
- Safety Center with community rules, directly accessible profile-card reports, locally saved reports, blocked users, unblock controls, and chat actions for report, block, unmatch, and clear chat.
- Event interest saving in local storage.
- Prefilled profile editing, local data export, and local account/app-data deletion.

## Firebase setup

PolyConnect is configured for the `poly-dating-app-5354c` Firebase web app in `index.html`. The page loads Firebase App, Authentication, Cloud Firestore, and Analytics from the Firebase JavaScript SDK CDN.

To use the connected backend, make sure the Firebase project has:

1. **Authentication** enabled with the Email/Password provider.
2. A **Cloud Firestore** database for saved profiles and matches.
3. Analytics enabled for the configured measurement ID.

If the Firebase SDK cannot load, the app continues to use the local demo storage.

## Still needed before production

This remains a prototype. Before a real public launch, add Firestore security rules, real multi-user discovery and messaging, hosted image storage, human/admin moderation, formal privacy/terms pages, account deletion against the backend, and proper automated tests.

## Deployment visibility check

After deploying the latest version, the login screen and discovery screen should show a visible `free-upgrades-v3` build label and a "Latest free upgrades live" panel. If you do not see that label, the host is serving an older commit or a cached file. Signup should also continue in local demo mode if Firebase signup is unavailable.
