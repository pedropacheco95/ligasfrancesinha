/**
 * Draw the week's teams, exactly as the site's "Fazer Equipas" button does.
 *
 *   node --experimental-strip-types --import ./scripts/register-ts.mjs \
 *     scripts/draw-teams.mjs               # preview only
 *   … scripts/draw-teams.mjs --commit      # save the draw
 *
 * The draw itself is `makeTeams` from the app's own domain module, so this is
 * the same shuffle and the same write the button performs — not a second
 * implementation that could drift from it.
 *
 * Saving matters: until the week's result is entered, the site replays a saved
 * draw instead of rolling a new one. A draw that is announced but not saved is
 * therefore a draw the next person to open the page will silently replace.
 */
import fs from "node:fs";
import path from "node:path";

import { loadDataset, rest, ROOT } from "./supabase.mjs";
import { makeTeams, BRANQUELAS, MAREGOES } from "../src/lib/domain.ts";
import { isoLocalDate } from "../src/lib/format.ts";

const args = process.argv.slice(2);
const commit = args.includes("--commit");
const redraw = args.includes("--redraw");
const whatsapp = args.includes("--whatsapp");
const editionArg = (args.find((a) => a.startsWith("--edition=")) ?? "").split("=")[1];

const dataset = await loadDataset();

/**
 * Which edition is being played. An edition that has not ended but whose final
 * game is behind us is last season left open, not this week's league, so the
 * one still ahead of its final game wins.
 */
function pickEdition() {
  if (editionArg) {
    const found = dataset.editions.find(
      (e) => String(e.id) === editionArg || e.name === editionArg,
    );
    if (!found) throw new Error(`No edition ${editionArg}.`);
    return found;
  }
  const running = dataset.editions.filter((e) => !e.hasEnded);
  const today = isoLocalDate(new Date());
  const current = running.filter((e) => !e.finalGame || e.finalGame >= today);
  const candidates = current.length ? current : running;
  if (candidates.length !== 1) {
    throw new Error(
      `Pass --edition=<id>; these are all running: ${
        candidates.map((e) => `${e.id} ${e.name}`).join(", ") || "none"
      }`,
    );
  }
  return candidates[0];
}

const edition = pickEdition();

/**
 * `--redraw` throws away a draw that already stands and rolls another. The
 * counter does not move: the week still had one draw, it is just a different
 * one. Only ask for this when someone has decided to redo it — anyone already
 * told the old teams will not hear about the new ones.
 */
const { teams, lastTeam, drawCounted } = makeTeams(
  redraw ? { ...edition, numberOfTeamsMade: 0 } : edition,
);
const number = redraw
  ? Math.max(1, edition.numberOfTeamsMade ?? 0)
  : (edition.numberOfTeamsMade ?? 0) + (drawCounted ? 1 : 0);

console.log(`\n  ${edition.name}  ·  ${edition.league?.name}  ·  equipas numero ${number}`);
if (!drawCounted) {
  console.log("  Already drawn: this is the saved draw replayed, as the site replays it.");
} else if (redraw) {
  console.log("  Redraw: this replaces the teams that were already drawn for this week.");
}
console.log("");
console.log(`  ${"Branquelas".padEnd(22)}Maregões`);
for (let i = 0; i < Math.max(teams[BRANQUELAS].length, teams[MAREGOES].length); i += 1) {
  const left = teams[BRANQUELAS][i]?.name ?? "";
  console.log(`  ${left.padEnd(22)}${teams[MAREGOES][i]?.name ?? ""}`);
}
console.log("");

if (whatsapp) {
  const hour = (edition.time ?? "").replace(/:00$/, "h");
  console.log(`Equipas de hoje ⚽ ${hour} — ${edition.name}\n`);
  for (const [label, team] of [
    ["BRANQUELAS", BRANQUELAS],
    ["MAREGÕES", MAREGOES],
  ]) {
    console.log(`*${label}*`);
    for (const player of teams[team]) console.log(player.name);
    console.log("");
  }
}

if (!drawCounted) {
  console.log("  Nothing to save — the draw already stands.\n");
  process.exit(0);
}
if (!commit) {
  console.log("  Preview only. Re-run with --commit to save it.\n");
  process.exit(0);
}

await rest(`editions?id=eq.${edition.id}`, {
  method: "PATCH",
  body: JSON.stringify({ last_team: lastTeam, number_of_teams_made: number }),
});

// The app serves src/data/*.json until the browser has the real rows, so the
// export has to follow the write. Only this edition changed; rewriting the one
// file by hand keeps the diff to the two fields instead of the churn a full
// re-export brings.
const file = path.join(ROOT, "src/data/editions.json");
const rows = JSON.parse(fs.readFileSync(file, "utf8"));
const row = rows.find((e) => e.id === edition.id);
if (!row) {
  // The draw is saved either way; only the export is behind. Say so plainly
  // rather than dying on it, since the database write has already happened.
  console.log(`  Saved: equipas numero ${number}.`);
  console.log(`  Edition ${edition.id} is not in the export yet — run qa/export-supabase.py.\n`);
  process.exit(0);
}
row.numberOfTeamsMade = number;
row.lastTeam = lastTeam;
fs.writeFileSync(file, `${JSON.stringify(rows, null, 1)}\n`, "utf8");

console.log(`  Saved: equipas numero ${number}, and src/data/editions.json with it.\n`);
