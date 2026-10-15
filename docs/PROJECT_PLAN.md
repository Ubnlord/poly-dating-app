# PolyConnect Project Plan

## Stage 0 — Inventory and modular foundation
- [x] Inspect current repository, key routes and inline UI functions.
- [x] Document current-to-target module mapping.
- [x] Add reusable preference storage and live Settings/Profile Settings modules.
- [x] Update Capacitor packaging so local modules/assets ship with the Android build.
- [ ] Confirm CI passes for the exact latest commit and install that artifact on Android.

## Stage 1 — Settings and Profile Settings
- [x] App Settings: theme, reduce-motion and larger-text controls.
- [x] Account status display, data export shortcut and sign-out action.
- [x] Profile Settings form for core campus profile fields.
- [x] Preserve server-side profile save in real mode; use local persistence only in explicit demo mode.
- [ ] Test settings persistence after app restart on Android.
- [ ] Test profile updates against Firebase rules with a dedicated test account.
- [ ] Add interaction tests for save failures and sign-out.

## Stage 2 — Services and UI primitives
- [ ] Move Firebase initialization and profile operations into `src/services/firebase/`.
- [ ] Move camera acquisition into `src/services/camera/`; test native permissions and lifecycle.
- [ ] Extract common Button, Modal, Toast, AppHeader and BottomNavigation components.
- [ ] Replace the legacy navigation implementation only after route parity tests exist.

## Stage 3 — Feature migration
- [ ] Move auth and email verification into `src/features/auth/`.
- [ ] Move discovery cards and preferences into `src/features/discovery/`.
- [ ] Move matching and messaging into their own features when server-backed implementations are available.
- [ ] Move Safety Center/report/block workflows only with server-authorized backend support.
- [ ] Build public profile card and verification indicator that never trust a client-provided verified flag.

## Release gates
- Latest commit's syntax/module checks, Android build and Firestore emulator tests pass.
- Test signup, email verification, login, profile save/edit, settings persistence and sign-out on a physical Android device.
- Review Firestore rules and use a dedicated test project for any backend integration testing.
- Do not deploy production rules or publish a release solely because a debug APK builds successfully.
