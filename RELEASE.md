# Release Workflow

This project uses an automated release workflow via GitHub Actions, plus a
local wizard that handles nearly everything else, quality checks, the
version bump, the changelog, store screenshots/promo art, and the
store-upload zips, in one run.

## 🚀 The Easy Way (Interactive Script)

Before releasing, write your changes under the **`## [Unreleased]`** heading
in `CHANGELOG.md` as you go (this is the only thing you truly have to
remember to do manually, everything else below is automated or prompted).

Then run:

```bash
npm run release   # or: ./scripts/release.sh
```

**What this script does:**
1.  Checks for uncommitted changes and aborts if `CHANGELOG.md`'s
    `[Unreleased]` section is empty.
2.  Asks you for the type of release (Patch, Minor, Major).
3.  Runs lint, type-check, tests, and a production build locally.
4.  Bumps the version in `package.json` AND `public/manifest.json`.
5.  Promotes `[Unreleased]` to a dated `[X.Y.Z] - YYYY-MM-DD` section and adds
    a fresh, empty `[Unreleased]` section above it.
6.  Prompts to regenerate promo tiles, icons, and store screenshots
    (`npm run assets`), screenshots are generated against a real, seeded
    OPFS tree so they reflect the actual current UI (see
    [Automated Screenshots](#-automated-screenshots) below).
7.  Builds the store-upload zips (`npm run package`) into `releases/`.
8.  Folds all of the above into the version-bump commit and tag.
9.  Prompts before pushing the commit + tag to GitHub.
10. Prints the exact zip paths and the remaining manual steps.

**After the script finishes:**
1.  Go to the [GitHub Actions](https://github.com/hasanbayatme/opfs-explorer/actions) tab.
2.  Watch the **Release** workflow run (builds/signs/publishes the GitHub release).
3.  Upload the printed `releases/opfs-explorer-vX.X.X-*.zip` files to each
    store dashboard, see [PUBLISHING.md](PUBLISHING.md) for the exact links
    and per-store notes. This is the only step that can't be automated
    (store dashboards require interactive/manual upload).

## 🖼 Automated Screenshots

`npm run screenshots` (and `npm run assets`, which also rebuilds and
regenerates promo tiles/icons first) drives a real headless Chromium instance
against the built `dist/panel.html`, seeds a realistic fixture file tree
directly into that page's own OPFS, and walks through the app, opening
files, formatting JSON, calculating a folder's size, opening Settings, and
more, capturing a PNG at each step into `screenshots/`.

This works standalone (no browser extension host required) because `api.ts`
falls back to running OPFS operations directly against the current page when
no DevTools host is detected, the same fallback that makes `npm run dev`
usable outside of an actual extension install. If you add a new feature and
want it reflected in the store screenshots, add a step to
`scripts/screenshots.cjs` and re-run `npm run assets`.

## 🛠 Manual Release Process

If you prefer to do it manually (or the wizard's prompts don't fit your
situation):

1.  **Update `CHANGELOG.md`:** move your `[Unreleased]` notes under a new
    `## [X.Y.Z] - YYYY-MM-DD` heading (or run
    `node scripts/bump-changelog.cjs X.Y.Z`).

2.  **Bump Version:**
    ```bash
    npm version patch  # or minor, major
    ```

3.  **Update Manifest:**
    Manually update the `"version"` field in `public/manifest.json` to match `package.json`.

4.  **Regenerate assets (optional but recommended):**
    ```bash
    npm run assets    # promo tiles + icons + screenshots
    npm run package   # store-upload zips into releases/
    ```

5.  **Commit & Tag:**
    ```bash
    git add public/manifest.json CHANGELOG.md screenshots public/icons
    git commit --amend --no-edit
    git tag -f vX.X.X  # Replace with actual version
    ```

6.  **Push:**
    ```bash
    git push origin main --tags
    ```

