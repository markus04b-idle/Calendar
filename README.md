# Together Calendar

A phone-friendly, installable calendar prototype for planning together.

## Run locally

```sh
npm install
npm run dev
```

Open the local network URL on your phone while it is on the same Wi-Fi as your computer. To install it on a phone, deploy the built app to an HTTPS host and use the browser's **Add to Home Screen** option.

## Current capabilities

- Month and agenda views, event creation/editing, and private busy-only events.
- Events persist in the current browser using local storage.
- Import and export `.ics` calendar files.
- Installable PWA shell with basic offline app loading.

## Important sync status

This starter is not yet a shared multi-user service: data stays in the browser where it was entered. Google and iCloud connections shown in the app are setup guidance, not live integrations. Two-way sync for two people needs a hosted backend, sign-in and shared-calendar permissions, Google OAuth configuration, and an Apple CalDAV connection using an app-specific password. Do not put provider passwords or tokens in frontend code.