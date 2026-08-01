# poly-dating-app

PolyConnect is a single-page prototype for a polytechnic student dating app.

## Firebase setup

The app can run without Firebase while you are developing locally. It uses `localStorage` until you replace the placeholder Firebase settings in `index.html`.

1. Create a Firebase project in the Firebase console.
2. Add a Web app to the project.
3. Enable **Authentication** with the Email/Password provider.
4. Create a **Cloud Firestore** database.
5. Copy your Firebase web app config into the `firebaseConfig` object in `index.html`.

When configured, PolyConnect uses Firebase Authentication for sign up/login and stores completed profiles plus matches in Firestore. If Firebase is not configured or the SDK cannot load, the app continues to use the local demo storage.
