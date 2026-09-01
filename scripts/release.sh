#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 OPFS Explorer Release Wizard${NC}"
echo "---------------------------------"

# 1. Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}❌ Error: You have uncommitted changes.${NC}"
    echo "Please commit or stash them before releasing."
    exit 1
fi

# 2. Ask for version bump type
echo -e "Select release type:"
PS3="Select number: "
options=("Patch (0.0.X - Bug fixes)" "Minor (0.X.0 - Features)" "Major (X.0.0 - Breaking)" "Skip (version already bumped)" "Quit")
select opt in "${options[@]}"
do
    case $opt in
        "Patch (0.0.X - Bug fixes)")
            BUMP="patch"
            break
            ;;
        "Minor (0.X.0 - Features)")
            BUMP="minor"
            break
            ;;
        "Major (X.0.0 - Breaking)")
            BUMP="major"
            break
            ;;
        "Skip (version already bumped)")
            BUMP="skip"
            break
            ;;
        "Quit")
            exit 0
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done

# 3. Make sure there's something in CHANGELOG.md to release (skipped when the
# version/changelog were already handled manually).
if [[ "$BUMP" != "skip" ]]; then
  UNRELEASED_BODY=$(awk '/^## \[Unreleased\]/{flag=1; next} /^## \[/{flag=0} flag' CHANGELOG.md | tr -d '[:space:]')
  if [[ -z "$UNRELEASED_BODY" ]]; then
    echo -e "${RED}❌ CHANGELOG.md's \"[Unreleased]\" section is empty.${NC}"
    echo "Add an entry describing this release before running the wizard."
    exit 1
  fi
fi

# 4. Run the full local quality gate before touching anything
echo -e "\n${BLUE}🧪 Running lint, type-check, tests, and build...${NC}"
npm run lint
npx tsc -b
npm test
npm run build

# 5. Perform Version Bump (skip if already bumped manually)
if [[ "$BUMP" != "skip" ]]; then
  echo -e "\n${BLUE}📦 Bumping version ($BUMP)...${NC}"
  npm version $BUMP -m "chore(release): %s"
fi

# Get the current version number (either freshly bumped or pre-existing)
VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ Version: v$VERSION${NC}"

# 6. Update manifest.json version to match package.json
# (Simple sed replacement, assuming standard formatting)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" public/manifest.json
else
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" public/manifest.json
fi
echo -e "${GREEN}✅ manifest.json updated${NC}"

# 7. Promote CHANGELOG.md's "[Unreleased]" section to a dated version header
if [[ "$BUMP" != "skip" ]]; then
  node scripts/bump-changelog.cjs "$VERSION"
fi

# 8. Regenerate store assets (promo tiles, icons, screenshots) so they never
# go stale. Skippable since it needs a Chromium download the first time
# (`npx playwright install chromium`).
read -p "$(echo -e ${BLUE}🖼  Regenerate promo tiles/icons/screenshots now? [Y/n] ${NC})" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
  npm run assets
  echo -e "${GREEN}✅ Assets regenerated in screenshots/ and public/icons/${NC}"
  echo -e "${YELLOW}   Review screenshots/*.png before publishing, they reflect real, seeded demo data.${NC}"
else
  echo -e "${YELLOW}⚠ Skipped asset regeneration, remember to run 'npm run assets' if the UI changed.${NC}"
fi

# 9. Build the store-upload zips (chromium/firefox/source) into releases/
echo -e "\n${BLUE}📦 Packaging store zips...${NC}"
npm run package

# 10. Stage everything this script touched and fold it into the release commit
git add public/manifest.json CHANGELOG.md screenshots public/icons
if [[ "$BUMP" != "skip" ]]; then
  git commit --amend --no-edit
  # Move tag to point to amended commit
  git tag -f "v$VERSION"
else
  # When skipping the bump, create a fresh commit for the manifest update
  # (only if there's actually a change to commit).
  if ! git diff --cached --quiet; then
    git commit -m "chore(release): sync manifest.json to v$VERSION"
  fi
  git tag -f "v$VERSION"
fi

# 11. Push to GitHub
echo -e "\n${BLUE}🚀 Pushing to GitHub...${NC}"
read -p "Are you sure you want to push v$VERSION to origin? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git push origin main --tags
    echo -e "\n${GREEN}🎉 Release v$VERSION pushed!${NC}"
    echo "Github Actions will now build, sign, and publish the GitHub release (zip + CRX)."
    echo "Check status here: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\).git/\1/')/actions"
else
    echo -e "${RED}❌ Push cancelled.${NC}"
    echo "You can push manually later with: git push origin main --tags"
fi

# 12. Summarize what's left to do by hand
echo -e "\n${BLUE}📋 Remaining manual steps${NC}"
echo "---------------------------------"
echo "Store-upload zips are ready in releases/:"
ls -1 "releases/opfs-explorer-v${VERSION}-"*.zip 2>/dev/null | sed 's/^/  - /' || true
echo
echo "Upload them to each store dashboard (see PUBLISHING.md for links):"
echo "  - Chrome Web Store / Edge Add-ons / Opera: *-chromium.zip"
echo "  - Firefox Add-ons: *-firefox.zip (+ *-source.zip, required for review)"
echo "  - Safari: run 'npm run package:safari' separately and follow RELEASE.md"
