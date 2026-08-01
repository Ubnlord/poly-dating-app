# poly-dating-app

PolyConnect is a single-page prototype for a polytechnic student dating app.

## Firebase setup

PolyConnect is configured for the `poly-dating-app-5354c` Firebase web app in `index.html`. The page loads Firebase App, Authentication, Cloud Firestore, and Analytics from the Firebase JavaScript SDK CDN.

To use the connected backend, make sure the Firebase project has:

1. **Authentication** enabled with the Email/Password provider.
2. A **Cloud Firestore** database for saved profiles and matches.
3. Analytics enabled for the configured measurement ID.

If the Firebase SDK cannot load, the app continues to use the local demo storage.
