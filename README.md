# FitFlow — Fitness & Habit Tracker

A fully functional, offline-friendly, mobile-responsive fitness web app inspired by the pastel monthly habit tracker reference.

## Features

- Daily habit checklist with customizable habits, edit/delete, and a scrollable color-coded monthly tracking matrix
- Daily and monthly completion scores, streaks, top habits, 7-day bars and a progress chart
- Water consumption tracking in 250 ml steps with customizable daily target
- Workout logging with date, type, duration, optional exercises (sets/reps/weight) and notes
- Body-weight and optional waist tracking with trend chart
- Dark mode, JSON backup import/export, full reset
- Automatic saving in your browser (localStorage) and offline PWA support on an HTTPS site
- No sign-up, server, third-party libraries or tracking

## Preview on a PC

Unzip the package, then open `index.html` in your browser. Or for full PWA/service worker testing, run a local web server in this folder:

```bash
python -m http.server 8000
```

Open http://localhost:8000 in your browser.

## Install as an iPhone app

You **must first publish the folder to a site over HTTPS** (for example GitHub Pages or Netlify Drop; upload the unzipped files keeping their folder structure).

Open the published HTTPS URL in Safari on iPhone, tap **Share → Add to Home Screen**, and confirm. After the first online visit, the app can open offline. Simply opening the HTML file from iPhone Files is for preview, not a reliable PWA installation path.

## Data privacy & backups

Data is only in the localStorage of the specific browser and site. It is not synced across devices; deleting website data, using private browsing, or changing the domain can lose your entries. **Export a JSON backup** in Settings periodically and import it if you move devices.

The `index.html`, `styles.css`, and `app.js` files can all be customized. No build tools required.

## Single-file preview

Open `FitFlow_Standalone_Preview.html` on your laptop to try the complete app without a server. It stores data in the browser for that file (browser support varies). This standalone page is **not** the recommended iPhone PWA installation; deploy the folder version over HTTPS for that.
