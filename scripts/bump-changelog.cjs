/**
 * Promotes the CHANGELOG.md "[Unreleased]" section to a dated version
 * section and inserts a fresh, empty "[Unreleased]" section above it.
 *
 * Run with: node scripts/bump-changelog.cjs <version>
 * (invoked automatically by scripts/release.sh, not usually run by hand)
 */

const fs = require('fs');
const path = require('path');

const CHANGELOG_PATH = path.join(__dirname, '..', 'CHANGELOG.md');
const UNRELEASED_HEADING = '## [Unreleased]';

const version = process.argv[2];
if (!version) {
  console.error('Usage: node scripts/bump-changelog.cjs <version>');
  process.exit(1);
}

const changelog = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
const unreleasedIdx = changelog.indexOf(UNRELEASED_HEADING);

if (unreleasedIdx === -1) {
  console.error(`❌ Could not find "${UNRELEASED_HEADING}" heading in CHANGELOG.md`);
  process.exit(1);
}

// Find the start of the next "## " heading after Unreleased, to isolate its body.
const bodyStart = unreleasedIdx + UNRELEASED_HEADING.length;
const nextHeadingIdx = changelog.indexOf('\n## ', bodyStart);
const unreleasedBody = (nextHeadingIdx === -1 ? changelog.slice(bodyStart) : changelog.slice(bodyStart, nextHeadingIdx)).trim();

if (!unreleasedBody) {
  console.error('❌ The "[Unreleased]" section in CHANGELOG.md is empty, add notes before releasing, or pass --allow-empty.');
  if (!process.argv.includes('--allow-empty')) {
    process.exit(1);
  }
}

const today = new Date().toISOString().slice(0, 10);
const versionHeading = `## [${version}] - ${today}`;

const before = changelog.slice(0, unreleasedIdx);
const after = nextHeadingIdx === -1 ? '' : changelog.slice(nextHeadingIdx);

const updated =
  `${before}${UNRELEASED_HEADING}\n\n${versionHeading}\n\n${unreleasedBody}\n\n${after.replace(/^\n+/, '')}`;

fs.writeFileSync(CHANGELOG_PATH, updated);
console.log(`✅ CHANGELOG.md: "[Unreleased]" -> "[${version}] - ${today}" (fresh Unreleased section added above it)`);
