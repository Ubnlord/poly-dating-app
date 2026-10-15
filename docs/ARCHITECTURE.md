# PolyConnect Architecture

## Current baseline (verified 2026-10-15)

- `index.html` remains the legacy single-page entry. It contains Firebase compat initialization, auth/profile calls, discovery filters, route visibility, safety UI and much of the old UI logic.
- `src/features/settings/settings.js` provides the App Settings dialog.
- `src/features/profile/profile-settings.js` provides the Profile Settings dialog and uses a small bridge to the existing profile persistence service.
- `src/services/storage/preferences-store.js` persists appearance/accessibility preferences locally.
- `scripts/prepare-capacitor.mjs` copies index.html plus `src/` and `public/` into Capacitor's `www/` folder.
- Firestore access remains subject to `firestore.rules`; no rules are deployed by this migration.

## Target project tree

```text
poly-dating-app/
├── public/
│   ├── images/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── App.js
│   │   ├── router.js
│   │   └── navigation.js
│   ├── components/
│   │   ├── public/ (PublicProfile, ProfileCard, VerificationBadge)
│   │   ├── common/ (Button, Modal, Toast)
│   │   └── layout/ (AppHeader, BottomNavigation)
│   ├── features/
│   │   ├── auth/
│   │   ├── profile/ (Profile Settings module is active)
│   │   ├── settings/ (App Settings module is active)
│   │   ├── discovery/
│   │   ├── matches/
│   │   ├── messaging/
│   │   ├── verification/
│   │   └── safety/
│   ├── services/
│   │   ├── firebase/
│   │   ├── camera/
│   │   └── storage/ (preferences store is active)
│   ├── hooks/
│   ├── utils/
│   └── styles/
├── android/
├── tests/
├── docs/
└── package.json
```

## Mapping from the current implementation

| Current implementation | New owner / target |
|---|---|
| Header theme control and app settings | `src/features/settings/settings.js` |
| Profile edit/settings controls | `src/features/profile/profile-settings.js` |
| UI preference localStorage reads/writes | `src/services/storage/preferences-store.js` |
| Firebase Auth and Firestore profile RPC-like calls | Target: `src/services/firebase/`; currently bridged from `index.html` |
| Camera `startCamera/captureSelfie/retakeSelfie` | Target: `src/services/camera/`; currently in `index.html` |
| Bottom tab `switchTab` and screen visibility | Target: `src/app/navigation.js`; currently in `index.html` |
| Discovery and cards `renderCards/getFilteredProfiles` | Target: `src/features/discovery/`; currently in `index.html` |
| Chat and matching guards | Target: `src/features/messaging/` and `src/features/matches/`; currently in `index.html` |
| Community rules, reports and blocked list UI | Target: `src/features/safety/`; currently in `index.html` |

The target tree is not a claim that every target module is already implemented. Settings and Profile Settings are the first live extractions. Keep the legacy entry until each migrated route has equivalent regression coverage.
