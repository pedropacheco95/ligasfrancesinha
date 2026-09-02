/**
 * Render an article's link-preview card.
 *
 *   npm i --no-save playwright        # not a project dependency
 *   node scripts/render-card.mjs <slug>
 *
 * Reads `articles/<slug>.card.html` and writes
 * `public/static/images/news/<slug>.jpg` at 1200×630, which is the size the
 * `og:image` tags in `src/routes/noticias/$slug.tsx` declare. JPEG, and kept
 * small on purpose: WhatsApp shows no card at all for an image it thinks is
 * too big.
 */

import { existsSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];

if (!slug) {
  console.error("usage: node scripts/render-card.mjs <slug>");
  process.exit(1);
}

const source = resolve(root, `articles/${slug}.card.html`);
if (!existsSync(source)) {
  console.error(`${source}: not found`);
  process.exit(1);
}

const output = resolve(root, `public/static/images/news/${slug}.jpg`);

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(`file://${source}`, { waitUntil: "networkidle" });
// The web fonts are already loaded by `networkidle`; this is for the layout
// they cause to settle.
await page.waitForTimeout(800);
await page.screenshot({ path: output, type: "jpeg", quality: 82 });
await browser.close();

const kb = Math.round(statSync(output).size / 1024);
console.log(`public/static/images/news/${slug}.jpg  1200×630  ${kb} KB`);
if (kb > 300) console.warn("over 300 KB — drop the quality, or WhatsApp may skip the preview");
