// Create the same game in both apps and compare the recalculated standings.
// This is the one write path that exercises update_table end to end.
import { chromium } from "playwright";

const REACT = "http://127.0.0.1:5173";
const FLASK = "http://127.0.0.1:5001";
const EDITION = "6ª Edição Tuesday League";

// Edition 11's last_team, which is the lineup the create page starts from.
const TEAM1 = [54, 53, 27, 52, 42, 48, 50];
const TEAM2 = [47, 23, 46, 33, 13, 1, 20];
const GOALS = { 54: 3, 47: 1, 23: 1 };
const SCORE = { team1: 4, team2: 2 };

const text = (markup) =>
  markup
    .replace(/<head\b[\s\S]*?<\/head>/gi, " ")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, "\n")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

/* ---------------------------------------------------------- React */

await page.goto(REACT + "/", { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.goto(REACT + encodeURI(`/create/game/${EDITION}`), { waitUntil: "networkidle" });
await page.waitForTimeout(400);

const gameDate = await page.inputValue('input[name="game_date"]');
await page.fill('input[name="goals_team1"] >> nth=0', String(SCORE.team1));
await page.fill('input[name="goals_team2"] >> nth=0', String(SCORE.team2));
for (const [id, goals] of Object.entries(GOALS)) {
  await page.fill(`#goals_${id}`, String(goals));
}
await page.click('button[type="submit"]:has-text("Criar")');
await page.waitForTimeout(1500);

await page.goto(REACT + "/scores/table/2/11", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const reactTable = text(await page.content());

await page.goto(REACT + "/scores/games/2/11", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const reactGames = text(await page.content());

/* ---------------------------------------------------------- Flask */

const form = new URLSearchParams();
form.append("goals_team1", String(SCORE.team1));
form.append("goals_team2", String(SCORE.team2));
// The page renders the score inputs twice (desktop + small screen); Flask reads
// getlist and takes the first non-empty value, so send both like the browser would.
form.append("goals_team1", "");
form.append("goals_team2", "");
for (const id of TEAM1) form.append("player_team_1", String(id));
for (const id of TEAM2) form.append("player_team_2", String(id));
for (const id of [...TEAM1, ...TEAM2]) {
  form.append(`goals_${id}`, GOALS[id] === undefined ? "" : String(GOALS[id]));
}
form.append("game_date", gameDate);

// Sent as a raw body: the form repeats keys (two score inputs, one
// player_team_N per row) and an object would collapse them.
const raw = await page.request.post(FLASK + encodeURI(`/create/game/${EDITION}`), {
  headers: { "content-type": "application/x-www-form-urlencoded" },
  data: form.toString(),
  maxRedirects: 0,
  failOnStatusCode: false,
});
console.log("flask create (raw form) status:", raw.status(), raw.headers()["location"] ?? "");

// Follow the redirect: /scores/table/<league>/<edition>/True is what triggers
// update_table. Without it Flask renders the stale stored aggregates.
await page.goto(FLASK + (raw.headers()["location"] ?? "/scores/table/2/11/True"), {
  waitUntil: "networkidle",
});
await page.waitForTimeout(400);

await page.goto(FLASK + "/scores/table/2/11", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const flaskTable = text(await page.content());

await page.goto(FLASK + "/scores/games/2/11", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const flaskGames = text(await page.content());

await browser.close();

/* -------------------------------------------------------- compare */

const report = (label, a, b) => {
  if (JSON.stringify(a) === JSON.stringify(b)) {
    console.log(`MATCH  ${label} (${a.length} tokens)`);
    return true;
  }
  console.log(`DIFF   ${label}: flask=${a.length} react=${b.length}`);
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    if (a[i] !== b[i]) {
      console.log(
        `   first difference at ${i}: flask=${JSON.stringify(a[i])} react=${JSON.stringify(b[i])}`,
      );
      console.log(`   flask around: ${JSON.stringify(a.slice(Math.max(0, i - 4), i + 6))}`);
      console.log(`   react around: ${JSON.stringify(b.slice(Math.max(0, i - 4), i + 6))}`);
      break;
    }
  }
  return false;
};

const ok = [
  report("standings after creating the game", flaskTable, reactTable),
  report("games list after creating the game", flaskGames, reactGames),
].every(Boolean);

process.exit(ok ? 0 : 1);
