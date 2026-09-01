/**
 * Add a week's result from the message the league gets sent, e.g.
 *
 *   brancos 6            pretos 11
 *   Pacheco 2            Afonso 2
 *   Fragoso 3            Zé SF 3
 *   Nuno 1               Fanuca
 *
 * A player who did not turn up is simply absent from the message. A name with
 * no number scored none. Names are however people write them, so they are
 * matched against the roster loosely — but never guessed: anything ambiguous or
 * unrecognised stops the run and is reported.
 *
 *   node --experimental-strip-types --import ./scripts/register-ts.mjs \
 *     scripts/add-game.mjs message.txt            # preview only
 *   … scripts/add-game.mjs message.txt --commit   # write it
 */
import fs from "node:fs";
import path from "node:path";

import { buildDataset, computeTableUpdate, BRANQUELAS, MAREGOES } from "../src/lib/domain.ts";
import { isoLocalDate, pyWeekday } from "../src/lib/format.ts";

/* ------------------------------------------------------------------ config */

const ROOT = path.resolve(import.meta.dirname, "..");

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

const ENV = loadEnv();
const URL_BASE = ENV["SUPABASE_URL"];
const KEY = ENV["SUPABASE_PUBLISHABLE_KEY"];
const HEADERS = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

async function rest(pathname, init = {}) {
  const response = await fetch(`${URL_BASE}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...HEADERS, ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(
      `${init.method ?? "GET"} ${pathname} -> ${response.status} ${await response.text()}`,
    );
  }
  // Inserts come back 201 with an empty body unless return=representation is
  // asked for, so parse only when there is something to parse.
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}

/** PostgREST truncates at 1000 rows without saying so; page until short. */
async function selectAll(table) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const batch = await rest(`${table}?select=*&order=id.asc`, {
      headers: { Range: `${from}-${from + 999}` },
    });
    rows.push(...batch);
    if (batch.length < 1000) return rows;
  }
}

const CAMEL = {
  full_name: "fullName",
  image_url: "imageUrl",
  final_game: "finalGame",
  has_ended: "hasEnded",
  goal_value: "goalValue",
  number_of_teams_made: "numberOfTeamsMade",
  league_id: "leagueId",
  last_team: "lastTeam",
  goals_team1: "goalsTeam1",
  goals_team2: "goalsTeam2",
  edition_id: "editionId",
  player_id: "playerId",
  game_id: "gameId",
  last_place: "lastPlace",
  percentage_of_appearances: "percentageOfAppearances",
  goals_scored_by_team: "goalsScoredByTeam",
  goals_suffered_by_team: "goalsSufferedByTeam",
};
const camel = (rows) =>
  rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [CAMEL[k] ?? k, v])));

async function loadDataset() {
  const [leagues, editions, players, games, playersInGame, playersInEdition] = await Promise.all(
    ["leagues", "editions", "players", "games", "players_in_game", "players_in_edition"].map(
      selectAll,
    ),
  );
  return buildDataset({
    leagues: camel(leagues),
    editions: camel(editions),
    players: camel(players),
    games: camel(games),
    playersInGame: camel(playersInGame),
    playersInEdition: camel(playersInEdition),
  });
}

/* ------------------------------------------------------------------ parsing */

const TEAM_WORDS = {
  [BRANQUELAS]: [
    "brancos",
    "brancas",
    "branco",
    "branca",
    "branquelas",
    "brancos:",
    "whites",
    "white",
  ],
  [MAREGOES]: ["pretos", "pretas", "preto", "preta", "maregoes", "maregões", "blacks", "black"],
};

const fold = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function parseMessage(text) {
  const teams = [];
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    // "brancos 6" — a team header carries the side's goal total.
    const header = line.match(/^(.+?)[\s:–-]+(\d+)\s*$/);
    const headWord = fold(header ? header[1] : line);
    const side = Object.keys(TEAM_WORDS).find((team) => TEAM_WORDS[team].includes(headWord));
    if (side) {
      current = { team: side, goals: header ? Number(header[2]) : null, players: [] };
      teams.push(current);
      continue;
    }

    if (!current) continue; // anything before the first team header is preamble
    // "Zé SF 3", "Zé SF: 3", "Zé SF - 3", or just "Fanuca" for none.
    const scored = line.match(/^(.+?)[\s:–-]+(\d+)\s*$/);
    current.players.push(
      scored
        ? { raw: scored[1].trim(), goals: Number(scored[2]) }
        : { raw: line.replace(/[\s:–-]+$/, ""), goals: 0 },
    );
  }
  return teams;
}

/* --------------------------------------------------------------- name match */

/** Every token of the query must prefix a distinct token of the candidate, in order. */
function matches(queryTokens, candidateTokens) {
  let index = 0;
  for (const token of queryTokens) {
    const found = candidateTokens.findIndex(
      (candidate, i) => i >= index && candidate.startsWith(token),
    );
    if (found === -1) return false;
    index = found + 1;
  }
  return true;
}

function resolveName(raw, roster) {
  const query = fold(raw).split(/\s+/).filter(Boolean);
  const exact = roster.filter((p) => fold(p.name) === fold(raw));
  if (exact.length === 1) return { player: exact[0] };

  const hits = roster.filter((player) => {
    const names = [player.name, player.fullName ?? ""].join(" ");
    return matches(query, fold(names).split(/\s+/).filter(Boolean));
  });
  if (hits.length === 1) return { player: hits[0] };
  if (hits.length === 0) return { error: "no player in this edition matches" };
  return { error: `ambiguous — could be ${hits.map((p) => p.name).join(", ")}` };
}

/* ------------------------------------------------------------------- main */

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const dateArg = (args.find((a) => a.startsWith("--date=")) ?? "").split("=")[1];
const editionArg = (args.find((a) => a.startsWith("--edition=")) ?? "").split("=")[1];
const file = args.find((a) => !a.startsWith("--"));
const message = file ? fs.readFileSync(file, "utf8") : fs.readFileSync(0, "utf8");

const parsed = parseMessage(message);
if (parsed.length !== 2) {
  console.error(
    `Expected two teams, found ${parsed.length}. Each side needs a header like "brancos 6".`,
  );
  process.exit(1);
}

const dataset = await loadDataset();
const active = dataset.editions.filter((e) => !e.hasEnded);
const candidates = editionArg
  ? active.filter((e) => String(e.id) === editionArg || e.name === editionArg)
  : active;

/** Try each running edition; the right one is where every name resolves. */
const attempts = candidates.map((edition) => {
  const roster = edition.playersRelations.map((r) => r.player).filter(Boolean);
  const resolved = parsed.map((side) => ({
    ...side,
    players: side.players.map((entry) => ({ ...entry, ...resolveName(entry.raw, roster) })),
  }));
  const failures = resolved.flatMap((s) =>
    s.players.filter((p) => p.error).map((p) => `${p.raw}: ${p.error}`),
  );
  return { edition, resolved, failures };
});

const usable = attempts.filter((a) => a.failures.length === 0);
if (usable.length !== 1) {
  if (usable.length === 0) {
    console.error("Could not match this message to a running edition.\n");
    for (const attempt of attempts) {
      console.error(`  ${attempt.edition.name}:`);
      for (const failure of attempt.failures) console.error(`    - ${failure}`);
    }
    console.error("\nFix the spelling, or pass --edition=<id> to force one.");
  } else {
    console.error(
      `Ambiguous: these names fit more than one edition (${usable.map((a) => a.edition.name).join(", ")}).`,
    );
    console.error("Pass --edition=<id> to choose.");
  }
  process.exit(1);
}

const { edition, resolved } = usable[0];
const [first, second] = resolved;
const sides = {
  [BRANQUELAS]: resolved.find((s) => s.team === BRANQUELAS) ?? first,
  [MAREGOES]: resolved.find((s) => s.team === MAREGOES) ?? second,
};

const goalsTeam1 = sides[BRANQUELAS].goals;
const goalsTeam2 = sides[MAREGOES].goals;
if (goalsTeam1 === null || goalsTeam2 === null) {
  console.error('Both team headers need a score, e.g. "brancos 6".');
  process.exit(1);
}

const matchweek = Math.max(0, ...edition.games.map((g) => g.matchweek)) + 1;
// Same default as the create-game page: today, wound back to the matchday.
const target =
  edition.league?.name === "MasterLeague" ? 3 : edition.league?.name === "TuesdayLeague" ? 1 : null;
const day = new Date();
if (target !== null) day.setDate(day.getDate() - ((pyWeekday(day) - target + 7) % 7));
const date = dateArg ?? isoLocalDate(day);

/* ---------------------------------------------------------------- preview */

console.log(`\n  ${edition.name}  ·  jornada ${matchweek}  ·  ${date}`);
console.log(`  Branquelas ${goalsTeam1} - ${goalsTeam2} Maregões\n`);
for (const team of [BRANQUELAS, MAREGOES]) {
  const side = sides[team];
  const tally = side.players.reduce((sum, p) => sum + p.goals, 0);
  console.log(
    `  ${team} (${side.players.length} players, ${tally} of ${side.goals} goals accounted for)`,
  );
  for (const entry of side.players) {
    const note = fold(entry.player.name) === fold(entry.raw) ? "" : `   ← "${entry.raw}"`;
    console.log(`    ${String(entry.goals).padStart(2)}  ${entry.player.name}${note}`);
  }
  if (tally !== side.goals)
    console.log(`     note: ${Math.abs(side.goals - tally)} goal(s) unattributed`);
  console.log("");
}

if (!commit) {
  console.log("  Preview only. Re-run with --commit to save it.\n");
  process.exit(0);
}

/* ------------------------------------------------------------------ write */

const maxId = async (table) => (await rest(`${table}?select=id&order=id.desc&limit=1`))[0]?.id ?? 0;

const gameId = (await maxId("games")) + 1;
await rest("games", {
  method: "POST",
  body: JSON.stringify({
    id: gameId,
    goals_team1: goalsTeam1,
    goals_team2: goalsTeam2,
    date,
    winner: goalsTeam1 > goalsTeam2 ? 1 : goalsTeam1 < goalsTeam2 ? -1 : 0,
    matchweek,
    played: false,
    edition_id: edition.id,
  }),
});

let relationId = (await maxId("players_in_game")) + 1;
const relations = [BRANQUELAS, MAREGOES].flatMap((team) =>
  sides[team].players.map((entry) => ({
    id: relationId++,
    player_id: entry.player.id,
    game_id: gameId,
    team,
    goals: entry.goals,
  })),
);
try {
  await rest("players_in_game", { method: "POST", body: JSON.stringify(relations) });
} catch (error) {
  // A game without its line-up would skew the edition's totals; take it back out.
  await rest(`games?id=eq.${gameId}`, { method: "DELETE" });
  throw error;
}

// Recalculate the table with the app's own logic, so the numbers match exactly.
const after = await loadDataset();
const updates = computeTableUpdate(after.editionById.get(edition.id));
const COLUMNS = {
  place: "place",
  lastPlace: "last_place",
  points: "points",
  appearances: "appearances",
  goals: "goals",
  percentageOfAppearances: "percentage_of_appearances",
  wins: "wins",
  draws: "draws",
  losts: "losts",
  goalsScoredByTeam: "goals_scored_by_team",
  goalsSufferedByTeam: "goals_suffered_by_team",
  matchweek: "matchweek",
};
for (const { relationId: id, ...values } of updates) {
  const body = {};
  for (const [key, column] of Object.entries(COLUMNS))
    if (key in values) body[column] = values[key];
  await rest(`players_in_edition?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

console.log(`  Saved as game ${gameId}; ${edition.name} standings recalculated.\n`);
