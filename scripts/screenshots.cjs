/**
 * Automated Screenshot Generator for OPFS Explorer
 *
 * This script generates screenshots for Chrome Web Store listing.
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

  try {
    // Navigate to panel
    await page.goto(`http://localhost:${PORT}/panel.html`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Screenshot 1: Welcome screen
    console.log('1. Capturing welcome screen...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-welcome-screen.png'),
      type: 'png'
    });

    // Screenshot 2: File editor - click on file1.txt
    console.log('2. Capturing file editor...');
    await page.getByLabel(/File:.*file1\.txt/).click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-file-editor.png'),
      type: 'png'
    });

    // Screenshot 3: Context menu - right click on data.json
    console.log('3. Capturing context menu...');
    await page.getByLabel(/File:.*data\.json/).click({ button: 'right' });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-context-menu.png'),
      type: 'png'
    });

    // Screenshot 4: Keyboard shortcuts
    console.log('4. Capturing keyboard shortcuts...');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Show keyboard shortcuts' }).click();
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-keyboard-shortcuts.png'),
      type: 'png'
    });

    // Screenshot 5: Search filter
    console.log('5. Capturing search filter...');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Search files' }).click();
    await page.getByRole('textbox', { name: 'Search files' }).fill('json');
    await page.waitForTimeout(200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-search-filter.png'),
      type: 'png'
    });

    // Screenshot 6: Folder expanded
    console.log('6. Capturing folder expanded...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.getByLabel(/Folder:.*folder1/).click();
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-folder-expanded.png'),
      type: 'png'
    });

    console.log('\n✓ All screenshots saved to screenshots/\n');

  } catch (error) {
    console.error('Error taking screenshots:', error);
  } finally {
    await browser.close();
    server.close();
  }
}

// Run
takeScreenshots().catch(console.error);
