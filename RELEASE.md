# Release Workflow

This project uses an automated release workflow via GitHub Actions.

## 🚀 The Easy Way (Interactive Script)

We have an interactive script that handles the entire process for you:

```bash
./scripts/release.sh
```

**What this script does:**
1.  Checks for uncommitted changes.
2.  Asks you for the type of release (Patch, Minor, Major).
3.  Runs linting and build checks locally to ensure quality.
4.  Bumps the version in `package.json` AND `public/manifest.json`.
5.  Creates a git commit and tag.
6.  Pushes the code and tags to GitHub.

**After the script finishes:**
1.  Go to the [GitHub Actions](https://github.com/YOUR_USERNAME/opfs-explorer/actions) tab.
2.  Watch the **Release** workflow run.
3.  Once finished, go to the **Releases** page on GitHub.
4.  Download the `opfs-explorer-vX.X.X.zip` asset.
5.  Upload it to the [Chrome Web Store Dashboard](https://chrome.google.com/webstore/dev/dashboard).

## 🛠 Manual Release Process

If you prefer to do it manually:

1.  **Bump Version:**
    ```bash
    npm version patch  # or minor, major
    ```

2.  **Update Manifest:**
    Manually update the `"version"` field in `public/manifest.json` to match `package.json`.

3.  **Commit & Tag:**
    ```bash
    git add public/manifest.json
    git commit --amend --no-edit
    git tag -f vX.X.X  # Replace with actual version
    ```

4.  **Push:**
    ```bash
    git push origin main --tags
    ```
