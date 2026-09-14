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

import { loadDataset, maxId, rest } from "./supabase.mjs";
import { computeTableUpdate, BRANQUELAS, MAREGOES } from "../src/lib/domain.ts";
import { isoLocalDate, pyWeekday } from "../src/lib/format.ts";

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

function candidatesFor(raw, roster) {
  const query = fold(raw).split(/\s+/).filter(Boolean);
  const exact = roster.filter((p) => fold(p.name) === fold(raw));
  if (exact.length === 1) return exact;
  return roster.filter((player) => {
    const names = [player.name, player.fullName ?? ""].join(" ");
    return matches(query, fold(names).split(/\s+/).filter(Boolean));
  });
}

/**
 * Resolve a whole message at once, because the entries disambiguate each other.
 *
 * Someone can only appear in a game once, so a player already claimed by an
 * unambiguous entry cannot also be the answer to an ambiguous one. Eliminating
 * those and re-checking, until nothing more falls out, settles most of what a
 * name-by-name pass would call ambiguous: "Pacheco" alongside "Tomás P" has to
 * be the other Pacheco.
 *
 * What survives is genuinely undecidable from the message and is reported with
 * enough context to decide it — never guessed.
 */
function resolveAll(sides, roster) {
  const entries = sides.flatMap((side) => side.players);
  for (const entry of entries) entry.candidates = candidatesFor(entry.raw, roster);

  for (;;) {
    const claimed = new Set(
      entries.filter((e) => e.candidates.length === 1).map((e) => e.candidates[0].id),
    );
    let narrowed = false;
    for (const entry of entries) {
      if (entry.candidates.length <= 1) continue;
      const kept = entry.candidates.filter((c) => !claimed.has(c.id));
      if (kept.length && kept.length < entry.candidates.length) {
        entry.candidates = kept;
        narrowed = true;
      }
    }
    if (!narrowed) break;
  }

  for (const entry of entries) {
    if (entry.candidates.length === 1) entry.player = entry.candidates[0];
  }
  return entries;
}

/** Appearances give a sense of who actually turns up, which helps decide. */
function appearancesIn(edition, playerId) {
  const relation = edition.playersRelations.find((r) => r.player?.id === playerId);
  return relation?.appearances ?? 0;
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

/**
 * `--resolve "Pacheco=1"` pins a name to a player id, for the cases the message
 * alone cannot settle.
 */
const pinned = new Map(
  args
    .filter((a) => a.startsWith("--resolve="))
    .map((a) => a.slice("--resolve=".length).split("="))
    .map(([name, id]) => [fold(name), Number(id)]),
);

/** Try each running edition; the right one is where every name resolves. */
const attempts = candidates.map((edition) => {
  const roster = edition.playersRelations.map((r) => r.player).filter(Boolean);
  const resolved = parsed.map((side) => ({
    ...side,
    players: side.players.map((p) => ({ ...p })),
  }));
  const entries = resolveAll(resolved, roster);

  for (const entry of entries) {
    const pin = pinned.get(fold(entry.raw));
    if (pin === undefined) continue;
    const player = roster.find((p) => p.id === pin);
    if (player) {
      entry.player = player;
      entry.candidates = [player];
      entry.pinned = true;
    }
  }

  const unresolved = entries.filter((e) => !e.player);
  return { edition, resolved, entries, unresolved };
});

const usable = attempts.filter((a) => a.unresolved.length === 0);
if (usable.length !== 1) {
  if (usable.length === 0) {
    console.error("Could not resolve every name against a running edition.\n");
    for (const attempt of attempts) {
      console.error(`  ${attempt.edition.name} (edition ${attempt.edition.id})`);
      for (const entry of attempt.unresolved) {
        if (entry.candidates.length === 0) {
          console.error(`    "${entry.raw}" — nobody in this edition matches`);
        } else {
          console.error(`    "${entry.raw}" — could be:`);
          for (const c of entry.candidates) {
            const full = c.fullName && c.fullName !== c.name ? ` (${c.fullName})` : "";
            console.error(
              `        id ${c.id}  ${c.name}${full} — ${appearancesIn(attempt.edition, c.id)} appearances this edition`,
            );
          }
        }
      }
      // Anyone already resolved, or still in the running for an unresolved name,
      // is accounted for; only the genuinely unmentioned belong in this list.
      const named = new Set([
        ...attempt.entries.filter((e) => e.player).map((e) => e.player.id),
        ...attempt.unresolved.flatMap((e) => e.candidates.map((c) => c.id)),
      ]);
      const rest = attempt.edition.playersRelations
        .map((r) => r.player)
        .filter((p) => p && !named.has(p.id))
        .map((p) => `${p.name} (${p.id})`);
      console.error(
        `    rest of the squad, not named in this message: ${rest.join(", ") || "none"}`,
      );
      console.error("");
    }
    console.error('Decide, then pin it: --resolve="Pacheco=1"   (or fix the message)');
  } else {
    console.error(
      `These names fit more than one edition (${usable.map((a) => a.edition.name).join(", ")}). Pass --edition=<id>.`,
    );
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
