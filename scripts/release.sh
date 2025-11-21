#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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
options=("Patch (0.0.X - Bug fixes)" "Minor (0.X.0 - Features)" "Major (X.0.0 - Breaking)" "Quit")
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
        "Quit")
            exit 0
            ;;
        *) echo "Invalid option $REPLY";;
    esac
done

# 3. Run tests and lint before proceeding
echo -e "\n${BLUE}🧪 Running tests and lint checks...${NC}"
npm run lint && npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Checks failed. Aborting release.${NC}"
    exit 1
fi

# 4. Perform Version Bump
echo -e "\n${BLUE}📦 Bumping version ($BUMP)...${NC}"
npm version $BUMP -m "chore(release): %s"

# Get the new version number
VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✅ Version bumped to v$VERSION${NC}"

# 5. Update manifest.json version to match package.json
# (Simple sed replacement, assuming standard formatting)
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" public/manifest.json
else
  sed -i "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" public/manifest.json
fi
git add public/manifest.json
git commit --amend --no-edit
# Move tag to point to amended commit
git tag -f "v$VERSION"

echo -e "${GREEN}✅ manifest.json updated${NC}"

# 6. Push to GitHub
echo -e "\n${BLUE}🚀 Pushing to GitHub...${NC}"
read -p "Are you sure you want to push v$VERSION to origin? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    git push origin main --tags
    echo -e "\n${GREEN}🎉 Release v$VERSION pushed!${NC}"
    echo "Github Actions will now build and publish the release."
    echo "Check status here: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\).git/\1/')/actions"
else
    echo -e "${RED}❌ Push cancelled.${NC}"
    echo "You can push manually later with: git push origin main --tags"
fi
