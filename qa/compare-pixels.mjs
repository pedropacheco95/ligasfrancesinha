// Pixel-compare each page as rendered by the Flask app and by the React port.
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const FLASK = "http://127.0.0.1:5001";
const REACT = "http://127.0.0.1:5173";
const OUT = path.resolve("shots");
fs.mkdirSync(OUT, { recursive: true });

const URLS = fs
  .readFileSync(process.argv[2], "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const VIEWPORTS = [
  { name: "desktop", width: 1400, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

// The countdown ticks every second and the carousel animates, so freeze both
// before capturing or every run reports spurious differences.
const FREEZE = `
  document.querySelectorAll('.time_value_box').forEach(el => { el.textContent = '00'; });
  document.querySelectorAll('*').forEach(el => {
    el.style.transition = 'none';
    el.style.animation = 'none';
  });
`;

async function shoot(page, base, urlPath, file) {
  const response = await page.goto(base + encodeURI(urlPath), {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await page.waitForTimeout(400);
  await page.evaluate(FREEZE);
  await page.waitForTimeout(150);
  await page.screenshot({ path: file, fullPage: true });
  return response?.status() ?? 0;
}

const browser = await chromium.launch();
const results = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  for (const urlPath of URLS) {
    const slug = (viewport.name + urlPath).replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 100);
    const flaskFile = path.join(OUT, `${slug}.flask.png`);
    const reactFile = path.join(OUT, `${slug}.react.png`);

    try {
      const flaskStatus = await shoot(page, FLASK, urlPath, flaskFile);
      const reactStatus = await shoot(page, REACT, urlPath, reactFile);

      const a = PNG.sync.read(fs.readFileSync(flaskFile));
      const b = PNG.sync.read(fs.readFileSync(reactFile));

      if (a.width !== b.width || a.height !== b.height) {
        results.push({
          viewport: viewport.name,
          urlPath,
          status: `${flaskStatus}/${reactStatus}`,
          note: `size ${a.width}x${a.height} vs ${b.width}x${b.height}`,
          pct: null,
        });
        continue;
      }

      const diff = new PNG({ width: a.width, height: a.height });
      const changed = pixelmatch(a.data, b.data, diff.data, a.width, a.height, {
        threshold: 0.15,
      });
      const pct = (changed / (a.width * a.height)) * 100;
      if (pct > 0.05) {
        fs.writeFileSync(path.join(OUT, `${slug}.diff.png`), PNG.sync.write(diff));
      }
      results.push({
        viewport: viewport.name,
        urlPath,
        status: `${flaskStatus}/${reactStatus}`,
        pct,
        note: "",
      });
    } catch (error) {
      results.push({
        viewport: viewport.name,
        urlPath,
        status: "-",
        pct: null,
        note: `ERROR ${error.message.split("\n")[0]}`,
      });
    }
  }
  await context.close();
}

await browser.close();

results.sort((x, y) => (y.pct ?? 1e9) - (x.pct ?? 1e9));
let clean = 0;
for (const r of results) {
  const pct = r.pct === null ? "  n/a " : `${r.pct.toFixed(3)}%`;
  if (r.pct !== null && r.pct <= 0.05 && !r.note) clean += 1;
  console.log(
    `${pct.padStart(8)}  ${r.status.padEnd(9)} ${r.viewport.padEnd(8)} ${r.urlPath} ${r.note}`,
  );
}
console.log(`\n${clean}/${results.length} captures visually identical (<=0.05% pixels)`);
