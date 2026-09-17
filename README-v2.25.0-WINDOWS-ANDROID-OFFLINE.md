# G-LOKOO POS v2.25.0 — Windows + Android + Offline Foundation

## Included
- Working web POS remains the source of truth.
- Offline-first shell via service worker.
- IndexedDB cache for products, phones and customers.
- Offline sales are queued locally and synchronized to Supabase when connectivity returns.
- Online/offline indicator and pending sync count.
- Electron Windows desktop wrapper with tray support.
- Capacitor Android project configuration and build scripts.
- Existing barcode scanner and G-LOKOO favicon retained.
- Footer: © AgendaSoft 2026 · G-LOKOO POS.

## Windows
```bash
npm install
npm run build
npm run desktop:build
```
Installer output is under `dist-electron/` or the configured electron-builder output directory.

## Android
```bash
npm install
npm run android:add
npm run android:sync
npm run android:open
```
Build the APK from Android Studio. `npm run android:build` can build a debug APK when the Android SDK/Gradle environment is installed.

## Notes
- Supabase remains required for login/cloud synchronization.
- Previously authenticated users can use cached POS data offline; a completely offline first-time login requires a future device-enrollment/authentication layer.
- Customer WhatsApp/SMS delivery still requires internet and is not attempted while offline.
