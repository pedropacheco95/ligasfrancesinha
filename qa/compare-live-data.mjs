// Compare Flask against the React app AFTER it has swapped the seed for live
// Supabase rows — the server-rendered comparison never exercises that path.
import { chromium } from "playwright";
import fs from "node:fs";

const FLASK = "http://127.0.0.1:5001";
const REACT = "http://127.0.0.1:5173";
const urls = fs
  .readFileSync(process.argv[2], "utf8")
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const text = (m) =>
  m
    .replace(/<head\b[\s\S]*?<\/head>/gi, " ")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await c.newPage();
let match = 0;
const diffs = [];

// Both sides are rendered in the browser and serialised the same way, so
// entity spelling (&#160; vs &nbsp;) cannot masquerade as a difference. The
// countdown is frozen because it ticks.
const FREEZE = `document.querySelectorAll('.time_value_box').forEach(e => e.textContent = '00');`;
const render = async (base, u, settle) => {
  await p.goto(base + encodeURI(u), { waitUntil: "networkidle" });
  await p.waitForTimeout(settle);
  await p.evaluate(FREEZE);
  return text(await p.content());
};

for (const u of urls) {
  const f = await render(FLASK, u, 300);
  const r = await render(REACT, u, 2200); // let the Supabase fetch land and re-render
  if (JSON.stringify(f) === JSON.stringify(r)) {
    match++;
  } else {
    const i = f.findIndex((x, k) => x !== r[k]);
    diffs.push(
      `${u}\n     flask: ${JSON.stringify(f.slice(Math.max(0, i - 1), i + 3))}\n     react: ${JSON.stringify(r.slice(Math.max(0, i - 1), i + 3))}`,
    );
  }
}
await b.close();
for (const d of diffs.slice(0, 6)) console.log("  DIFF " + d);
console.log(`\n  ${match}/${urls.length} pages match Flask with live database data`);
