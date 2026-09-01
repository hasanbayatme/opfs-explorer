# Publishing Guide for OPFS Explorer

This guide covers how to publish OPFS Explorer to all major browser extension stores.

## 📦 Build Artifacts

Run `npm run package` to generate the following files in the `releases/` directory:

1.  `opfs-explorer-vX.X.X-chromium.zip` - For Chrome, Edge, Opera, Brave, Vivaldi.
2.  `opfs-explorer-vX.X.X-firefox.zip` - For Firefox.
3.  `opfs-explorer-vX.X.X-source.zip` - Source code (often required for Mozilla review).

## 🌐 Browser Stores

### 1. Chrome Web Store (Google Chrome, Brave, Vivaldi, Arc)

- **Live Store URL:** https://chromewebstore.google.com/detail/opfs-explorer/hhegfidnlemidclkkldeekjamkfcamic
- **Dashboard:** [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/dev/dashboard)
- **File to Upload:** `opfs-explorer-vX.X.X-chromium.zip`
- **Fee:** $5 one-time registration fee.
- **Notes:**
  - Ensure "Host Permissions" justification is clear (we use none).
  - Privacy policy URL is required.

### 2. Microsoft Edge Add-ons (Microsoft Edge)

- **Live Store URL:** https://microsoftedge.microsoft.com/addons/detail/odbpcdmkgeikdcmcdlfmdkbjiaeknnbd
- **Dashboard:** [Partner Center](https://partner.microsoft.com/en-us/dashboard/microsoftedge/overview)
- **File to Upload:** `opfs-explorer-vX.X.X-chromium.zip`
- **Fee:** Free.
- **Notes:**
  - Usually approves faster than Chrome.
  - Can import listing details from Chrome Web Store.

### 3. Mozilla Add-ons (Firefox)

- **Live Store URL:** https://addons.mozilla.org/en-US/firefox/addon/opfs-explorer/
- **Dashboard:** [AMO Developer Hub](https://addons.mozilla.org/en-US/developers/)
- **File to Upload:** `opfs-explorer-vX.X.X-firefox.zip`
- **Source Code:** You **MUST** upload `opfs-explorer-vX.X.X-source.zip` during the submission process because the extension uses minified code (Vite/Rollup).
- **Fee:** Free.
- **Notes:**
  - Select "This is a version of a web extension".
  - Review times can vary.
  - **Compatibility:** We have polyfilled the `move()` API for Firefox support.

### 4. Opera Add-ons (Opera)

- **Dashboard:** [Opera Add-ons Developer](https://addons.opera.com/developer/)
- **File to Upload:** `opfs-explorer-vX.X.X-chromium.zip`
- **Fee:** Free.
- **Notes:**
  - Opera reviews are manual and can take a long time.

### 5. Safari (macOS / iOS)

- **Dashboard:** [App Store Connect](https://appstoreconnect.apple.com/)
- **Process:**
  1.  Run `./scripts/package-safari.sh`
  2.  Run the `xcrun` command displayed by the script.
  3.  Open the generated Xcode project.
  4.  Sign in with your Apple Developer account.
  5.  Archive and "Distribute App" to App Store Connect.
- **Fee:** $99/year (Apple Developer Program).
- **Notes:**
  - Requires a Mac and Xcode.
  - Distributed as a macOS App containing the extension.

## 📝 Store Listing Details

Refer to `STORE_LISTING.md` for descriptions, screenshots, and promotional text to use across all stores.
Screenshots and promo tiles in `screenshots/` and `public/icons/` are generated automatically,
see [RELEASE.md § Automated Screenshots](RELEASE.md#-automated-screenshots).

## ✅ Pre-Release Checklist

Running `npm run release` (see [RELEASE.md](RELEASE.md)) handles everything
below except the two steps marked **(manual)**:

- [ ] **(manual)** Write your changes under `## [Unreleased]` in `CHANGELOG.md` as you go.
- [ ] Bump version in `package.json` and `public/manifest.json`.
- [ ] Promote `CHANGELOG.md`'s `[Unreleased]` section to a dated version heading.
- [ ] Lint, type-check, test, and build pass locally.
- [ ] Regenerate promo tiles/icons/screenshots (`npm run assets`).
- [ ] Run `npm run package` to produce the store-upload zips.
- [ ] Test the build in at least Chrome and Firefox (load unpacked).
- [ ] Verify `move` and `rename` functionality in Firefox (uses polyfill).
- [ ] **(manual)** Upload the generated zips to each store dashboard.

