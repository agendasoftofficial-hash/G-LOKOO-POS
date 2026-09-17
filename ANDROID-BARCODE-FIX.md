# G-LOKOO POS v2.25.0 — Android Native Barcode Scanner Fix

This build replaces the Android WebView camera barcode scanner with the native Capacitor ML Kit barcode scanner.

## Build

From the project root:

```cmd
npm install
npm run build
npx cap sync android
cd android
gradlew.bat clean
gradlew.bat assembleDebug
```

APK:
`android\app\build\outputs\apk\debug\app-debug.apk`

Install:

```cmd
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" install -r "app\build\outputs\apk\debug\app-debug.apk"
```

The first native scan may ask Google Play Services to install the Google Barcode Scanner module.

Web/Windows barcode scanning remains available through the existing browser/USB/Bluetooth scanner path.
