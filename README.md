# FitFlow V2 — Fitness App (Local Sign-up & Fitness Profile)

## New features
- Beautiful responsive Sign up / Log in / guest screen.
- Personal profile: name, age, gender, blood group, height (cm), and weight (kg).
- Passwords are **not stored in plain text**: an 180,000-iteration PBKDF2-SHA256 salted verifier is used in browser storage.
- Profile page with editable details. Updating weight also updates today's weigh-in in Progress.
- Accounts keep tracker data separated per email **on the same browser / website origin**.
- Existing FitFlow V1 data is preserved. Existing users open as guest automatically and can choose to copy their data during sign-up.
- All V1 habits, workouts, calendar, hydration, charts, backup/import, dark mode, and offline support are retained.

## IMPORTANT — Privacy and authentication limitations
**This is a local prototype, NOT a real online login system or secure authentication.** The account database and fitness data are kept in localStorage; technically skilled users with access to the device/browser can access or modify them. Passwords are hashed, but **fitness profile details and workouts are not encrypted**. Signing up on a different device does not log into the same account; this app does not sync data across devices and does not reset forgotten passwords. For a real multi-device sign-in use Firebase Authentication + Firestore (or a comparable backend) with security rules and privacy controls. GitHub Pages alone cannot provide this functionality.

Avoid entering real sensitive personal data into the demo if the browser or device is shared. Back up frequently (Settings > Export Backup). Private browsing or deleting website storage may erase accounts and data.

## Upload to GitHub Pages
1. Extract ZIP and open `FitFlow_Fitness_App_V2`.
2. Open https://github.com/mototrip/fitflow-fitness-app
3. Click **Add file > Upload files**. Upload **index.html, styles.css, app.js, manifest.webmanifest, sw.js, README.md and the entire icons folder** to the repository root. Existing files should be **replaced / updated**, and the icons files must be under `icons/`.
4. Click **Commit changes**.
5. Go to Settings > Pages; set Source = Deploy from a branch, Branch = main, Folder = /(root). Save.
6. Open https://mototrip.github.io/fitflow-fitness-app/ and use a fresh reload once. If the previous offline PWA remains cached, close/reopen the app or clear site cache after exporting a backup.

## Testing locally
Run `python -m http.server 8000` from the extracted folder, then open http://localhost:8000. Sign up, edit profile, log out, and log back in using the **same device/browser**. Crypto requires HTTPS or localhost; signup/login may not work from a file:// preview.
