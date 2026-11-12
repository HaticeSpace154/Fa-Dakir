# Fa-Dakir | تلاوة وختم

A native React Quran reader built with Vite and Capacitor. The application renders its reader, navigation, dialogs, and reading tools as React components; it does not embed a legacy HTML reader or iframe.

## Run locally

```bash
npm install
npm run dev
npm run build
```

## App structure

- `src/App.jsx` — application entry and native Android back-button handling.
- `src/pages/Quran.jsx` — app composition, theme, reader state, and dialogs.
- `src/components/reader/PureQuranReader.jsx` — native Surah and Mushaf-page reading views.
- `src/components/reader/AyahView.jsx` — selectable ayah text, bookmarking, and auto-scroll interaction.
- `src/components/react-bits/` — local React Bits-style Aurora, ShinyText, SpotlightCard, and FloatingDock components.
- `src/services/quranData.js` — loads and indexes local Warsh text by Surah and Mushaf page.
- `src/services/storageService.js` — persisted theme, bookmarks, reading position, khatma plans, and custom Wird.
- `backend/README.md` — boundary between public client configuration and future server-only secrets.
- `public/data/warshData.json` — offline Warsh Quran text and page metadata.
- `assets/logo-mark.svg` — editable Fa-Dakir emblem; regenerate Android/PWA raster assets with `npm run generate:brand-assets`.
- `src/components/AppSplash.jsx` — animated web/native WebView splash reveal; Android's system launch screen uses the matching static artwork.

## Reader controls

- The floating reader dock contains theme, zoom, view-mode, and auto-scroll controls.
- Tap the auto-scroll control to increase its speed; double-click the reading page to start or stop scrolling.
- Hold either zoom button to continuously change text size.
- Switch between the continuous text view and page-grouped Mushaf view from the dock.
- In Mushaf view, swipe left or right to turn pages; use the edge arrows as an alternative. At higher zoom, horizontal dragging pans the page.
- Right-click an ayah to save a bookmark.

The text view uses the local Warsh data. The Mushaf view loads page SVGs on demand, with local text as a fallback.

## Accounts and cloud backups

- Firebase email/password authentication uses public web configuration from ignored `.env.local` values documented in `.env.example`.
- In Firebase Console, enable **Authentication → Email/Password** to activate account registration and login.
- The account window can save and restore bookmarks, khatma plans, theme, and reading statistics to Google Drive. Restore replaces local app data and asks for confirmation first.
- The Android Google Services file belongs at `android/app/google-services.json`; it is installed there for the `com.Quran.fadakir` package.
- Google Drive backup/restore needs a Google OAuth Web Client ID in `VITE_GOOGLE_CLIENT_ID` and the Drive API enabled. The Drive copy uses the app-private `appDataFolder`.
- Values prefixed with `VITE_` are included in the browser build. Firebase web API keys and Google OAuth client IDs are public identifiers; do not put service-account keys, OAuth client secrets, or other privileged credentials in frontend env values. Restrict the Firebase API key and configure Firebase Auth authorized domains in the provider consoles.
- The current app has no privileged server operations, so authentication and user-consented Drive operations stay client-side. Add backend endpoints only for future features that require server privileges; follow `backend/README.md`.

## Mushaf SVG pages

Mushaf page mode loads the matching Warsh edition from the [Quran SVG page files](https://raw.githubusercontent.com/quran-ws/quran-svg/main/mushafs/warsh/kfqc/svg/), using zero-padded page numbers (`001.svg`–`604.svg`). The provider's [display-page guide](https://quran.ws/docs/build/display-page/) documents the static SVG paths, ayah hit regions, and supported riwayat. The app keeps its local Warsh text available as a fallback when a page cannot be fetched.
