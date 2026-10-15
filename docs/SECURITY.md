# PolyConnect Security Notes

- Firebase Authentication establishes account sign-in, not student identity.
- A camera selfie capture is not face matching, liveness detection, or student verification. Never set `verified: true` from the client.
- Profile Settings calls the existing profile save function in normal mode. Firestore rules remain the authorization boundary; client-side validation is not a replacement for security rules.
- Appearance/accessibility preferences are local UI preferences, not security controls.
- Sign-out delegates to Firebase Auth in real-account mode and then clears the local signed-in profile cache.
- No Firebase rules, production configuration, live user data, or server-side permissions are altered by these changes.
- Matching, messaging, reporting, blocking and account deletion should not be advertised as production-live unless backed by an authorized server implementation.
- Before release, review Firestore access rules, test cross-account profile visibility, verify Android camera permission handling, and review any external identity-verification provider.
