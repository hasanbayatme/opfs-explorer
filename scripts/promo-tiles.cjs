/**
 * Promo Tile Generator for Chrome Web Store
 *
 * Generates:
 * - Small promo tile: 440x280
 * - Marquee promo tile: 1400x560
 * - Icon PNGs from SVG: 16x16, 48x48, 128x128
 *
 * Run with: node scripts/promo-tiles.cjs
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the SVG logo
const logoSvg = fs.readFileSync(path.join(ICONS_DIR, 'logo.svg'), 'utf-8');
const logoDataUri = `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;

// Small promo tile HTML (440x280)
const smallPromoHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 440px;
      height: 280px;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.05;
      background-image:
        linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px);
      background-size: 20px 20px;
    }
    .content {
      position: relative;
      z-index: 1;
      text-align: center;
    }
    .logo {
      width: 80px;
      height: 80px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 14px;
      color: #94A3B8;
      max-width: 300px;
    }
    .badge {
      position: absolute;
      top: 16px;
      right: 16px;
      background: #3B82F6;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="badge">DevTools</div>
  <div class="content">
    <img src="${logoDataUri}" class="logo" alt="OPFS Explorer">
    <h1>OPFS Explorer</h1>
    <p>See inside the invisible file system</p>
  </div>
</body>
</html>
`;

// Marquee promo tile HTML (1400x560)
const marqueePromoHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1400px;
      height: 560px;
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 80px;
      color: white;
      position: relative;
      overflow: hidden;
    }
    .bg-pattern {
      position: absolute;
      inset: 0;
      opacity: 0.03;
      background-image:
        linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    .glow {
      position: absolute;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
      top: -200px;
      right: 100px;
    }
    .left {
      position: relative;
      z-index: 1;
      max-width: 550px;
    }
    .badge {
      display: inline-block;
      background: rgba(59,130,246,0.2);
      border: 1px solid rgba(59,130,246,0.3);
      color: #60A5FA;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 56px;
      font-weight: 800;
      margin-bottom: 16px;
      background: linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.1;
    }
    .subtitle {
      font-size: 20px;
      color: #94A3B8;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .features {
      display: flex;
      gap: 24px;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #CBD5E1;
      font-size: 14px;
    }
    .feature svg {
      color: #3B82F6;
    }
    .right {
      position: relative;
      z-index: 1;
    }
    .logo {
      width: 280px;
      height: 280px;
      filter: drop-shadow(0 20px 40px rgba(0,0,0,0.3));
    }
  </style>
</head>
<body>
  <div class="bg-pattern"></div>
  <div class="glow"></div>
  <div class="left">
    <div class="badge">Chrome DevTools Extension</div>
    <h1>OPFS Explorer</h1>
    <p class="subtitle">The missing DevTools panel for Origin Private File System. Browse, edit, and manage hidden browser storage.</p>
    <div class="features">
      <div class="feature">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Visual file tree
      </div>
      <div class="feature">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Code editor
      </div>
      <div class="feature">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Image preview
      </div>
      <div class="feature">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Drag & drop
      </div>
    </div>
  </div>
  <div class="right">
    <img src="${logoDataUri}" class="logo" alt="OPFS Explorer">
  </div>
</body>
</html>
`;

async function generatePromoTiles() {
  console.log('Generating promo tiles and icons...\n');

  const browser = await chromium.launch();

  try {
    // Generate small promo tile (440x280)
    console.log('1. Generating small promo tile (440x280)...');
    const smallPage = await browser.newPage({ viewport: { width: 440, height: 280 } });
    await smallPage.setContent(smallPromoHtml);
    await smallPage.screenshot({
      path: path.join(OUTPUT_DIR, 'promo-small-440x280.png'),
      type: 'png'
    });
    await smallPage.close();

    // Generate marquee promo tile (1400x560)
    console.log('2. Generating marquee promo tile (1400x560)...');
    const marqueePage = await browser.newPage({ viewport: { width: 1400, height: 560 } });
    await marqueePage.setContent(marqueePromoHtml);
    await marqueePage.screenshot({
      path: path.join(OUTPUT_DIR, 'promo-marquee-1400x560.png'),
      type: 'png'
    });
    await marqueePage.close();

    // Generate icon PNGs from SVG
    const iconSizes = [16, 48, 128];
    for (const size of iconSizes) {
      console.log(`3. Generating icon ${size}x${size}...`);
      const iconHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; }
            body {
              width: ${size}px;
              height: ${size}px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: transparent;
            }
            img { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <img src="${logoDataUri}" alt="Icon">
        </body>
        </html>
      `;
      const iconPage = await browser.newPage({
        viewport: { width: size, height: size },
        deviceScaleFactor: 1
      });
      await iconPage.setContent(iconHtml);
      await iconPage.screenshot({
        path: path.join(ICONS_DIR, `icon-${size}.png`),
        type: 'png',
        omitBackground: true
      });
      await iconPage.close();
    }

    console.log('\n✓ All promo tiles and icons generated!\n');
    console.log('Files created:');
    console.log(`  - ${path.join(OUTPUT_DIR, 'promo-small-440x280.png')}`);
    console.log(`  - ${path.join(OUTPUT_DIR, 'promo-marquee-1400x560.png')}`);
    iconSizes.forEach(size => {
      console.log(`  - ${path.join(ICONS_DIR, `icon-${size}.png`)}`);
    });

  } catch (error) {
    console.error('Error generating tiles:', error);
  } finally {
    await browser.close();
  }
}

// Run
generatePromoTiles().catch(console.error);
