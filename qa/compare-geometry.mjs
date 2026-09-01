// Compare every element's tag, classes and layout box between the two apps.
// Pixel percentages say a page differs; this says which element moved.
import { chromium } from "playwright";
import fs from "node:fs";

const FLASK = "http://127.0.0.1:5001";
const REACT = "http://127.0.0.1:5173";

const URLS = fs
  .readFileSync(process.argv[2], "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter(Boolean);

const EXTRACT = `(() => {
  const out = [];
  const SKIP = new Set(['SCRIPT', 'NOSCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'META', 'TITLE']);
  for (const el of document.querySelectorAll('body *')) {
    if (SKIP.has(el.tagName)) continue;
    // Vite / TanStack dev-tools overlays exist only in the React app.
    if (el.closest('[data-vite-dev-id], #tsr-devtools, .tsqd-parent-container')) continue;
    const r = el.getBoundingClientRect();
    out.push({
      tag: el.tagName,
      cls: (el.getAttribute('class') || '').split(/\\s+/).filter(Boolean).sort().join(' '),
      x: Math.round(r.x * 10) / 10,
      y: Math.round(r.y * 10) / 10,
      w: Math.round(r.width * 10) / 10,
      h: Math.round(r.height * 10) / 10,
      txt: (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40),
    });
  }
  return out;
})()`;

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

let pagesWithIssues = 0;

for (const path of URLS) {
  const grab = async (base) => {
    await page.goto(base + encodeURI(path), { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(300);
    return page.evaluate(EXTRACT);
  };

  let flask, react;
  try {
    flask = await grab(FLASK);
    react = await grab(REACT);
  } catch (error) {
    console.log(`ERROR  ${path}: ${error.message.split("\n")[0]}`);
    pagesWithIssues += 1;
    continue;
  }

  const issues = [];
  if (flask.length !== react.length) {
    issues.push(`element count ${flask.length} vs ${react.length}`);
  }

  const limit = Math.min(flask.length, react.length);
  for (let i = 0; i < limit; i += 1) {
    const a = flask[i];
    const b = react[i];
    if (a.tag !== b.tag || a.cls !== b.cls) {
      issues.push(`#${i} tag/class: <${a.tag} class="${a.cls}"> vs <${b.tag} class="${b.cls}">`);
      continue;
    }
    // React SSR splits interpolated text into several nodes (separated by empty
    // comments), so each run is shaped and rounded independently. That shows up
    // as sub-pixel width drift which no viewer can see; ignore below half a pixel.
    const TOL = 0.5;
    const off = (p, q) => Math.abs(p - q) > TOL;
    if (off(a.x, b.x) || off(a.y, b.y) || off(a.w, b.w) || off(a.h, b.h)) {
      issues.push(
        `#${i} <${a.tag}.${a.cls || "-"}> box ${a.x},${a.y} ${a.w}x${a.h}` +
          ` vs ${b.x},${b.y} ${b.w}x${b.h}  "${a.txt}"`,
      );
    }
  }

  if (issues.length) {
    pagesWithIssues += 1;
    console.log(`\n=== ${path}  (${issues.length} issues, ${flask.length} elements)`);
    for (const issue of issues.slice(0, 12)) console.log("   " + issue);
    if (issues.length > 12) console.log(`   ... ${issues.length - 12} more`);
  } else {
    console.log(`OK     ${path}  (${flask.length} elements)`);
  }
}

await browser.close();
console.log(`\n${URLS.length - pagesWithIssues}/${URLS.length} pages geometrically identical`);
