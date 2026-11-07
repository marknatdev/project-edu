# Mobile App Guide (iOS & Android)

Project Edu supports two mobile distribution channels:

---

## 1. Instant PWA (No App Store or Build Required)

The web app is a Progressive Web App (PWA) with full standalone support:

* **iOS (iPhone/iPad)**:
  1. Open [https://project-edu-orcin.vercel.app](https://project-edu-orcin.vercel.app) in **Safari**.
  2. Tap the **Share** button (square with arrow up).
  3. Tap **Add to Home Screen (เพิ่มไปยังหน้าจอโฮม)**.
  4. The app launches full-screen with app icon and no browser navigation bars.

* **Android**:
  1. Open [https://project-edu-orcin.vercel.app](https://project-edu-orcin.vercel.app) in **Chrome**.
  2. Tap **Install app (ติดตั้งแอป)** or the banner prompt.
  3. The app is installed as a native WebAPK.

---

## 2. Native Capacitor App (Android Studio & Xcode)

Native shells are configured via Capacitor (`capacitor.config.ts`) pointing to the production endpoint:

* **Android Project**: `android/`
  * Package: `com.marknatdev.projectedu`
  * Open in Android Studio: `npm run cap:android`
  * Build command: `cd android && ./gradlew assembleDebug`
* **iOS Project**: `ios/`
  * Bundle Identifier: `com.marknatdev.projectedu`
  * Open in Xcode (macOS only): `npm run cap:ios`

---

## 3. Automated Cloud Builds via GitHub Actions

Workflow: `.github/workflows/build-mobile.yml`

* **Android APK**: Builds on `ubuntu-latest` and uploads `project-edu-android-debug-apk` directly to GitHub Actions Artifacts for instant download and sideloading.
* **iOS App**: Compiles on `macos-14` runner with Xcode.
