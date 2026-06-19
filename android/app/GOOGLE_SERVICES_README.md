# google-services.json — PLACEHOLDER

The `google-services.json` in this folder is a **placeholder** so the app builds
and runs. **Push notifications will NOT be delivered** until you replace it with
the real file from Firebase.

## Use the SAME project as the backend
The backend's Firebase Admin SDK (`backend/firebase-service-account.json`) sends
from project **`healwin-4d6f0`**. The app MUST use a `google-services.json` from
that **same** project, or the backend can't deliver to the tokens.

## Get the real file (≈2 min)
1. Open the **Firebase Console** → project **`healwin-4d6f0`**.
2. **Project settings** (gear) → **Your apps** → **Add app** → **Android**.
3. **Android package name:** `com.healwinpatientnew`
4. (App nickname / SHA-1 optional) → **Register app**.
5. **Download `google-services.json`** and overwrite this file
   (`android/app/google-services.json`).
6. Rebuild: `npm run android`.

After that, FCM tokens register with the backend
(`POST /notifications/devices/register`) and push works.

## iOS
Add an iOS app (bundle id) in the same Firebase project, download
`GoogleService-Info.plist` into `ios/`, run `cd ios && pod install`, enable Push
Notifications + Background Modes (Remote notifications) in Xcode, and upload an
APNs key in Firebase.
