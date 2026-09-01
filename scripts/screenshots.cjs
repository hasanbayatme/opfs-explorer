/**
 * Automated Screenshot Generator for OPFS Explorer
 *
 * Generates store-listing screenshots against the built panel, seeding a
 * realistic fixture tree directly into the *page's own* OPFS (via
 * navigator.storage.getDirectory()). This works because api.ts falls back to
 * running OPFS operations directly in the current page when no DevTools host
 * is present (see `canRunOpfsLocally()` / `runLocalOpfs()` in
 * src/panel/api.ts), the exact same code path used by `npm run dev`.
 *
 * Run with: node scripts/screenshots.cjs
 *
 * Prerequisites:
 * - npm run build (to generate dist/)
 * - npx playwright install chromium (first time only)
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = 8765;

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Simple static file server
function createServer() {
  return http.createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url === '/' ? 'panel.html' : req.url);
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml',
    };

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentTypes[ext] || 'text/plain' });
      res.end(content);
    });
  });
}

// Seeds a realistic fixture tree directly into the page's OPFS. Runs inside
// the page via page.evaluate, must be a self-contained function (no
// closures over Node-side variables).
async function seedOpfs(page) {
  await page.evaluate(async () => {
    async function writeFile(root, filePath, content) {
      const parts = filePath.split('/');
      const name = parts.pop();
      let dir = root;
      for (const part of parts) {
        dir = await dir.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await dir.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    }

    const root = await navigator.storage.getDirectory();

    // Reset to a clean slate so re-runs are idempotent.
    for await (const name of root.keys()) {
      await root.removeEntry(name, { recursive: true }).catch(() => {});
    }

    await writeFile(root, 'file1.txt',
      'Hello from OPFS Explorer!\n\nThis is a sample text file used to demonstrate the built-in code editor.');

    await writeFile(root, 'notes.md',
      '# Project Notes\n\n- OPFS Explorer makes browser-private storage visible\n' +
      '- **Bold**, _italic_, and `inline code` all render in the live preview\n' +
      '- Supports lists, headings, links, and fenced code blocks\n');

    // Intentionally minified/unformatted so the "Format" button has visible effect.
    await writeFile(root, 'data.json',
      '{"name":"opfs-explorer","version":"1.0.0","features":["editor","search","preview","directory-sizes"]}');

    await writeFile(root, 'logo.svg',
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="40" fill="#3B82F6"/></svg>');

    await writeFile(root, 'folder1/child.txt', 'A file inside folder1.');
    await writeFile(root, 'folder1/data2.json', '{"nested":true,"values":[1,2,3]}');
    await writeFile(root, 'folder1/subfolder/deep.txt',
      'A deeply nested file, useful for demonstrating recursive directory size calculation.');
    await writeFile(root, 'folder1/subfolder/deep2.txt',
      'Another nested file, to make the recursive folder size more interesting.');
  });
}

async function takeScreenshots() {
  console.log('Starting screenshot generation...\n');

  // Check if dist exists
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist/ folder not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Start server
  const server = createServer();
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log(`Server running on http://localhost:${PORT}\n`);

  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Closes any open context menu/modal and waits for it to fully detach
  // before the next interaction, avoids flaky clicks landing on a menu
  // that's mid-close-animation from the previous step.
  async function closeOverlays() {
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="menu"]', { state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(150);
  }

  // Runs one screenshot step in isolation, a failure here is logged and
  // skipped rather than aborting the entire batch, so one flaky/renamed
  // selector doesn't prevent the other screenshots from being generated.
  let failures = 0;
  async function capture(label, fileName, fn) {
    console.log(label);
    try {
      await fn();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, fileName), type: 'png' });
    } catch (err) {
      failures++;
      console.error(`   ✗ Failed: ${err.message.split('\n')[0]}`);
    }
  }

  try {
    // Navigate once to establish the page's own OPFS origin, seed fixture
    // data directly into it, then reload so the panel picks it up.
    await page.goto(`http://localhost:${PORT}/panel.html`);
    await page.waitForLoadState('networkidle');
    console.log('Seeding fixture files into OPFS...');
    await seedOpfs(page);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Target tree rows by their `data-path` attribute (set directly on each
    // TreeItem row) rather than by accessible-name regex, exact-match and
    // immune to ambiguity as the tree grows/expands during the run.
    const treeItem = (path) => page.locator(`[data-path="${path}"]`);

    await capture('1. Capturing welcome screen...', '01-welcome-screen.png', async () => {});

    await capture('2. Capturing file editor...', '02-file-editor.png', async () => {
      await treeItem('file1.txt').click();
      await page.waitForTimeout(300);
    });

    await capture('3. Capturing markdown preview...', '03-markdown-preview.png', async () => {
      await treeItem('notes.md').click();
      await page.waitForTimeout(300);
    });

    await capture('4. Capturing JSON formatting...', '04-json-format.png', async () => {
      await treeItem('data.json').click();
      await page.waitForTimeout(300);
      await page.getByRole('button', { name: 'Format JSON' }).click();
      await page.waitForTimeout(200);
    });

    await capture('5. Capturing context menu...', '05-context-menu.png', async () => {
      await treeItem('data.json').click({ button: 'right' });
      await page.waitForSelector('[role="menu"]', { state: 'visible' });
      await page.waitForTimeout(150);
    });
    await closeOverlays();

    await capture('6. Capturing folder size calculation...', '06-folder-size.png', async () => {
      await treeItem('folder1').click();
      await page.waitForTimeout(300);
      await treeItem('folder1').click({ button: 'right' });
      await page.waitForSelector('[role="menu"]', { state: 'visible' });
      await page.getByRole('menuitem', { name: 'Calculate Size (Recursive)', exact: true }).click();
      await page.waitForTimeout(400);
    });
    await closeOverlays();

    await capture('7. Capturing settings panel...', '07-settings-panel.png', async () => {
      await page.getByRole('button', { name: 'Open settings' }).click();
      await page.waitForTimeout(200);
    });
    await closeOverlays();

    await capture('8. Capturing keyboard shortcuts...', '08-keyboard-shortcuts.png', async () => {
      await page.getByRole('button', { name: 'Show keyboard shortcuts' }).click();
      await page.waitForTimeout(200);
    });
    await closeOverlays();

    await capture('9. Capturing search filter...', '09-search-filter.png', async () => {
      await page.getByRole('button', { name: 'Search files' }).click();
      await page.getByRole('searchbox', { name: 'Search files' }).fill('json');
      await page.waitForTimeout(200);
    });

    if (failures > 0) {
      console.log(`\n⚠ ${failures} screenshot(s) failed, see log above.\n`);
      process.exitCode = 1;
    } else {
      console.log('\n✓ All screenshots saved to screenshots/\n');
    }

  } catch (error) {
    console.error('Error taking screenshots:', error);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
  }
}

// Run
takeScreenshots().catch((err) => {
  console.error(err);
  process.exit(1);
});

