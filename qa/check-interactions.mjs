// Drive the React port's interactive flows and check them against the Flask
// app's behaviour. Team draws use the reference output captured from Flask for
// the two editions whose draw is deterministic.
import { chromium } from "playwright";

const REACT = "http://127.0.0.1:5173";
const FLASK = "http://127.0.0.1:5001";

// Captured from POSTing /scores/create_teams on the pristine Flask database.
const EXPECTED_DRAWS = {
  // TuesdayLeague: no shuffle, so the snake draw is deterministic.
  "/scores/create_teams/2/11": [
    ["António PT", "Tomás Cottim"],
    ["Vilarinho", "Tomás Pacheco"],
    ["Kiko BF", "Pedro F"],
    ["Pedro Rodrigues", "João Morgado"],
    ["Mini", "Manel Cerquinho"],
    ["Eloi", "Pedro Pacheco"],
    ["Gustavo", "Filipe"],
  ],
  // MasterLeague edition 10 has 7 games but 8 draws recorded, so make_teams
  // takes the early-return branch and replays last_team without shuffling.
  "/scores/create_teams/1/10": [
    ["Mini Zi", "Bernardo Queiroz"],
    ["Kiko TM", "Bernardo Castro"],
    ["Vinhas", "Bernardo Xavier"],
    ["Zi", "Zé SF"],
    ["Afonso Mariz", "Miguel"],
    ["Pedro Pacheco", "Ferna"],
    ["Fanuca", "Luis Fragoso"],
  ],
};

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});
page.on("pageerror", (e) => consoleErrors.push("pageerror: " + e.message));

const failedRequests = new Set();
page.on("response", (r) => {
  if (r.status() >= 400) failedRequests.add(r.status() + " " + decodeURI(r.url()));
});

async function freshVisit(path) {
  await page.goto(REACT + encodeURI(path), { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}

/* ---------------------------------------------------- 1. team draws */

for (const [path, expected] of Object.entries(EXPECTED_DRAWS)) {
  await freshVisit(path);
  await page.getByRole("button", { name: "Fazer Equipas" }).click();
  await page.waitForTimeout(400);

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("table tr")]
      .map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent.trim()))
      .filter((cells) => cells.length === 4 && (cells[1] || cells[2]))
      .map((cells) => [cells[1], cells[2]]),
  );
  const same = JSON.stringify(rows) === JSON.stringify(expected);
  check(
    `team draw ${path}`,
    same,
    same ? `${rows.length} pairs match Flask` : `got ${JSON.stringify(rows)}`,
  );

  const counter = await page.evaluate(
    () => document.body.innerText.match(/Equipas numero (\d+)/)?.[1] ?? null,
  );
  const flaskCounter = path.includes("/2/11") ? "3" : "8";
  check(
    `draw counter ${path}`,
    counter === flaskCounter,
    `shown ${counter}, Flask ${flaskCounter}`,
  );
}

/* ------------------------------------------------------- 2. sign in */

await freshVisit("/auth/login");
const navBefore = await page.evaluate(() =>
  document.querySelector(".navbar-user").innerText.trim(),
);
check("logged-out navbar", /Registar/.test(navBefore) && /Login/.test(navBefore), navBefore);

await page.fill('input[name="username"]', "admin");
await page.fill('input[name="password"]', "admin");
await page.click('button[type="submit"]');
await page.waitForTimeout(600);
const navAfter = await page.evaluate(() => document.querySelector(".navbar-user").innerText.trim());
check(
  "signed-in navbar shows Criar jogos / Log Out",
  /Criar jogos/.test(navAfter) && /Log Out/.test(navAfter),
  navAfter,
);
check("sign-in lands on the index", new URL(page.url()).pathname === "/", page.url());

await page.goto(REACT + "/auth/logout", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const navOut = await page.evaluate(() => document.querySelector(".navbar-user").innerText.trim());
check("sign-out restores the logged-out navbar", /Registar/.test(navOut), navOut);

/* ------------------------------------------- 3. index league tabs */

await freshVisit("/");
const tabState = async () =>
  page.evaluate(() => ({
    tabs: [...document.querySelectorAll(".table_tab")].map((el) => el.className),
    tables: [...document.querySelectorAll(".table_standings")].map((el) => el.className),
  }));
const before = await tabState();
await page.locator(".table_tab", { hasText: "Tuesday League" }).click();
await page.waitForTimeout(200);
const after = await tabState();
check(
  "clicking Tuesday League swaps the active tab and table",
  before.tabs[0].includes("active") &&
    !before.tabs[1].includes("active") &&
    !after.tabs[0].includes("active") &&
    after.tabs[1].includes("active") &&
    after.tables[1].includes("active") &&
    !after.tables[0].includes("active"),
  JSON.stringify(after),
);

/* ------------------------------------------ 4. edition dropdowns */

await freshVisit("/scores/table/1/10");
await page.selectOption("select#edicao", "3ª Edição MasterLeague");
await page.waitForTimeout(600);
check(
  "scores edition dropdown navigates",
  new URL(page.url()).pathname === "/scores/table/1/7",
  page.url(),
);

await freshVisit("/player/general/Pedro Pacheco/5ª Edição Masterleague");
await page.selectOption("select#edicao", "3ª Edição MasterLeague");
await page.waitForTimeout(600);
check(
  "player edition dropdown navigates",
  decodeURI(new URL(page.url()).pathname) ===
    "/player/general/Pedro Pacheco/3ª Edição MasterLeague",
  decodeURI(page.url()),
);

/* --------------------------------- 5. standings name -> player page */

await freshVisit("/scores/table/2/11");
await page.locator("button.discret_button").first().click();
await page.waitForTimeout(600);
check(
  "standings player name opens that player's page",
  decodeURI(new URL(page.url()).pathname).startsWith("/player/general/"),
  decodeURI(page.url()),
);

/* ------------------------------- 6. create game: modal + submission */

await freshVisit("/create/game/6ª Edição Tuesday League");

const firstRowName = await page.evaluate(() =>
  document.querySelector(".create_game_player_row .playerField").textContent.trim(),
);
await page.locator(".create_game_player_row .playerField").first().click();
await page.waitForTimeout(300);
const modalOpen = await page.evaluate(() => {
  const m = document.querySelector("#switch_player_modal");
  return getComputedStyle(m).display !== "none";
});
check("switch-player modal opens", modalOpen);

// Pick a different player from the modal grid.
const swapped = await page.evaluate((current) => {
  const cards = [...document.querySelectorAll("#switch_player_modal .players-grid .player")];
  const target = cards.find((c) => c.querySelector(".player-name").textContent.trim() !== current);
  const name = target.querySelector(".player-name").textContent.trim();
  target.click();
  return name;
}, firstRowName);
await page.waitForTimeout(400);
const newFirstName = await page.evaluate(() =>
  document.querySelector(".create_game_player_row .playerField").textContent.trim(),
);
check(
  "modal swaps the player in the row",
  newFirstName === swapped,
  `${firstRowName} -> ${newFirstName}`,
);

const modalClosed = await page.evaluate(
  () => getComputedStyle(document.querySelector("#switch_player_modal")).display === "none",
);
check("modal closes after picking", modalClosed);

// Rebuild the page, fill a scoreline and submit.
await freshVisit("/create/game/6ª Edição Tuesday League");
const beforeGames = await page.evaluate(async () => {
  const r = await fetch("/scores/games/2/11");
  return (await r.text()).split("Jornada").length - 1;
});
await page.fill('input[name="goals_team1"] >> nth=0', "4");
await page.fill('input[name="goals_team2"] >> nth=0', "2");
await page.fill(".goals_of_player_input >> nth=0", "3");
await page.click('button[type="submit"]:has-text("Criar")');
await page.waitForTimeout(1200);

check(
  "creating a game redirects to the recalculated table",
  /\/scores\/table\/2\/11\/True$/.test(new URL(page.url()).pathname),
  page.url(),
);

const created = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".box_container table tbody tr")];
  return {
    rowCount: rows.length,
    firstRow: rows[0] ? [...rows[0].querySelectorAll("td")].map((t) => t.textContent.trim()) : null,
  };
});
check(
  "standings still render after recalculation",
  created.rowCount === 14 && created.firstRow !== null,
  JSON.stringify(created.firstRow),
);

// The new game must show up in the games list and the goals must be counted.
await page.goto(REACT + "/scores/games/2/11", { waitUntil: "networkidle" });
await page.waitForTimeout(400);
const gameRows = await page.evaluate(
  () => document.querySelectorAll(".box_container table tbody tr").length,
);
check("new game appears in the games list", gameRows === 3, `${gameRows} rows (was 2)`);

const newestScore = await page.evaluate(() => {
  const rows = [...document.querySelectorAll(".box_container table tbody tr")];
  const last = rows[rows.length - 1];
  return [...last.querySelectorAll("td")].map((t) => t.textContent.trim()).join(" | ");
});
check("new game shows the submitted score", /4 - 2/.test(newestScore), newestScore);

/* ------------------------------------------- 7. Flask parity checks */

// The register link 500s in Flask; the port must not quietly succeed.
const registerStatus = async (base) => {
  const r = await page.request.get(base + "/auth/register");
  return r.status();
};
const fReg = await registerStatus(FLASK);
const rReg = await registerStatus(REACT);
check(
  "/auth/register 500s in both apps",
  fReg === rReg && fReg >= 500,
  `flask ${fReg}, react ${rReg}`,
);

check(
  "no uncaught page errors",
  consoleErrors.filter((e) => /pageerror/i.test(e)).length === 0,
  consoleErrors
    .filter((e) => /pageerror/i.test(e))
    .slice(0, 3)
    .join(" | "),
);

// Flask 404s this same asset: players 50 and 51 have a doubled image path stored
// in the database. The port reproduces the broken path rather than fixing it.
const unexpected = [...failedRequests].filter(
  (u) => !u.includes("/static/images/images/Players/default_player") && !u.includes("favicon"),
);
check("no unexpected failed requests", unexpected.length === 0, unexpected.slice(0, 5).join(" | "));

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} interaction checks passed`);
process.exit(failed.length ? 1 : 0);
