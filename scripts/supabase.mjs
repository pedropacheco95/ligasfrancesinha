/**
 * The cloud database, as the scripts see it.
 *
 * `src/lib/db.ts` is the app's way in and speaks to Supabase through its
 * client; scripts run outside the browser, so they go at the REST API directly
 * with the same publishable key. Both end up handing `buildDataset` the same
 * camelCase rows.
 */
import fs from "node:fs";
import path from "node:path";

import { buildDataset } from "../src/lib/domain.ts";

export const ROOT = path.resolve(import.meta.dirname, "..");

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

export async function rest(pathname, init = {}) {
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

export const maxId = async (table) =>
  (await rest(`${table}?select=id&order=id.desc&limit=1`))[0]?.id ?? 0;

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

export async function loadDataset() {
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
