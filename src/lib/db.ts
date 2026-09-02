/**
 * Database access layer.
 *
 * The league data lives in the cloud database (tables mirror the original
 * SQLAlchemy models, snake_case). This module converts between those rows and
 * the camelCase shapes `domain.ts` expects, and is the only place that talks
 * to the database.
 */

import { supabase } from "@/integrations/supabase/client";

import type {
  EditionRow,
  GameRow,
  LeagueRow,
  PlayerEditionRow,
  PlayerGameRow,
  PlayerRow,
  RawData,
  TeamName,
} from "./domain";

type Row = Record<string, unknown>;

const num = (value: unknown) => (value === null || value === undefined ? null : Number(value));
const str = (value: unknown) => (value === null || value === undefined ? null : String(value));

function toLeague(row: Row): LeagueRow {
  return { id: Number(row["id"]), name: String(row["name"]), picture: str(row["picture"]) };
}

function toEdition(row: Row): EditionRow {
  return {
    id: Number(row["id"]),
    name: String(row["name"]),
    time: str(row["time"]),
    finalGame: str(row["final_game"]),
    hasEnded: Boolean(row["has_ended"]),
    goalValue: num(row["goal_value"]),
    numberOfTeamsMade: num(row["number_of_teams_made"]),
    leagueId: num(row["league_id"]),
    lastTeam: str(row["last_team"]),
  };
}

function toPlayer(row: Row): PlayerRow {
  return {
    id: Number(row["id"]),
    name: String(row["name"]),
    fullName: str(row["full_name"]),
    birthday: str(row["birthday"]),
    imageUrl: str(row["image_url"]),
  };
}

function toGame(row: Row): GameRow {
  return {
    id: Number(row["id"]),
    goalsTeam1: num(row["goals_team1"]),
    goalsTeam2: num(row["goals_team2"]),
    date: str(row["date"]),
    winner: num(row["winner"]),
    matchweek: Number(row["matchweek"]),
    played: Boolean(row["played"]),
    editionId: num(row["edition_id"]),
  };
}

function toPlayerGame(row: Row): PlayerGameRow {
  return {
    id: Number(row["id"]),
    playerId: num(row["player_id"]),
    gameId: num(row["game_id"]),
    team: String(row["team"]) as TeamName,
    goals: num(row["goals"]),
  };
}

function toPlayerEdition(row: Row): PlayerEditionRow {
  return {
    id: Number(row["id"]),
    playerId: num(row["player_id"]),
    editionId: num(row["edition_id"]),
    place: num(row["place"]),
    lastPlace: num(row["last_place"]),
    points: num(row["points"]),
    appearances: num(row["appearances"]),
    goals: num(row["goals"]),
    percentageOfAppearances: num(row["percentage_of_appearances"]),
    wins: num(row["wins"]),
    draws: num(row["draws"]),
    losts: num(row["losts"]),
    goalsScoredByTeam: num(row["goals_scored_by_team"]),
    goalsSufferedByTeam: num(row["goals_suffered_by_team"]),
    matchweek: num(row["matchweek"]),
  };
}

/**
 * Every row of a table, ordered by id so ties keep insertion order as in the
 * original app.
 *
 * PostgREST caps a response at `db-max-rows` (1000 by default), and it does so
 * silently — you get a short array, not an error. `players_in_game` is far past
 * that, so a plain select drops most of the match history and every appearance,
 * points and goals total computed from it comes out wrong. Page explicitly.
 */
const PAGE_SIZE = 1000;

async function selectAll(table: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table as never)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = (data ?? []) as unknown as Row[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}

/**
 * The highest id currently in a table, read straight from the database.
 *
 * Ids are chosen by the client, so they cannot be derived from a cache that
 * another person's insert has already moved past — that collides on the primary
 * key. Reading the maximum at write time closes all but an instantaneous race,
 * which the caller retries.
 */
export async function maxId(table: string): Promise<number> {
  const { data, error } = await supabase
    .from(table as never)
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{ id: number }>;
  return rows.length ? rows[0].id : 0;
}

export async function fetchAllData(): Promise<RawData> {
  const [leagues, editions, players, games, playersInGame, playersInEdition] = await Promise.all([
    selectAll("leagues"),
    selectAll("editions"),
    selectAll("players"),
    selectAll("games"),
    selectAll("players_in_game"),
    selectAll("players_in_edition"),
  ]);

  return {
    leagues: leagues.map(toLeague),
    editions: editions.map(toEdition),
    players: players.map(toPlayer),
    games: games.map(toGame),
    playersInGame: playersInGame.map(toPlayerGame),
    playersInEdition: playersInEdition.map(toPlayerEdition),
  };
}

/* ------------------------------------------------------------------ Writes */

/**
 * Insert a game and its line-up, assigning ids from the database's current
 * maximum rather than from the caller's cache. Retries once on a unique
 * violation, which is what a genuine race between two people looks like.
 */
export async function insertGame(game: GameRow, relations: PlayerGameRow[]) {
  const UNIQUE_VIOLATION = "23505";

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const gameId = (await maxId("games")) + 1;
    const { error: gameError } = await supabase.from("games").insert({
      id: gameId,
      goals_team1: game.goalsTeam1,
      goals_team2: game.goalsTeam2,
      date: game.date,
      winner: game.winner,
      matchweek: game.matchweek,
      played: game.played,
      edition_id: game.editionId,
    });
    if (gameError) {
      if (gameError.code === UNIQUE_VIOLATION) continue;
      throw gameError;
    }

    if (relations.length === 0) return gameId;

    const firstRelationId = (await maxId("players_in_game")) + 1;
    const { error } = await supabase.from("players_in_game").insert(
      relations.map((relation, index) => ({
        id: firstRelationId + index,
        player_id: relation.playerId,
        game_id: gameId,
        team: relation.team,
        goals: relation.goals,
      })),
    );
    if (error) {
      // The game is already in; leaving it without its line-up would silently
      // corrupt every total computed from that edition, so take it back out.
      await supabase.from("games").delete().eq("id", gameId);
      if (error.code === UNIQUE_VIOLATION) continue;
      throw error;
    }
    return gameId;
  }
  throw new Error("Could not allocate a free id for the game after three attempts");
}

export async function updateEdition(editionId: number, patch: Partial<EditionRow>) {
  const columns: Row = {};
  if ("name" in patch) columns["name"] = patch.name;
  if ("time" in patch) columns["time"] = patch.time;
  if ("finalGame" in patch) columns["final_game"] = patch.finalGame;
  if ("hasEnded" in patch) columns["has_ended"] = patch.hasEnded;
  if ("goalValue" in patch) columns["goal_value"] = patch.goalValue;
  if ("numberOfTeamsMade" in patch) columns["number_of_teams_made"] = patch.numberOfTeamsMade;
  if ("leagueId" in patch) columns["league_id"] = patch.leagueId;
  if ("lastTeam" in patch) columns["last_team"] = patch.lastTeam;
  if (Object.keys(columns).length === 0) return;

  const { error } = await supabase
    .from("editions")
    .update(columns as never)
    .eq("id", editionId);
  if (error) throw error;
}

const PLAYER_EDITION_COLUMNS: Record<string, string> = {
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

export async function updatePlayerEditions(
  patches: Array<{ id: number } & Partial<PlayerEditionRow>>,
) {
  await Promise.all(
    patches.map(async ({ id, ...rest }) => {
      const columns: Row = {};
      for (const [key, value] of Object.entries(rest)) {
        const column = PLAYER_EDITION_COLUMNS[key];
        if (column) columns[column] = value;
      }
      if (Object.keys(columns).length === 0) return;
      const { error } = await supabase
        .from("players_in_edition")
        .update(columns as never)
        .eq("id", id);
      if (error) throw error;
    }),
  );
}

/* -------------------------------------------------- Regulamento: o que o grupo decide */

/**
 * The tables behind `/regulamento` are created by
 * `supabase/migrations/20260902160000_regulamento_votes.sql`. Until someone
 * runs it, PostgREST answers every query with an error rather than an empty
 * set, so the read below reports the feature as unavailable and the page still
 * renders — the rules are the point of it, the tallies are not.
 */
export interface RegulamentoActivity {
  votes: VoteRow[];
  objections: ObjectionRow[];
  proposals: ProposalRow[];
  /** False when the tables are missing, which is not an error worth showing. */
  available: boolean;
}

export interface VoteRow {
  pointId: string;
  voter: string;
  choice: string;
}

export interface ObjectionRow {
  id: number;
  ruleId: string;
  voter: string;
  reason: string;
  proposal: string | null;
  createdAt: string;
}

export interface ProposalRow {
  id: number;
  pointId: string | null;
  voter: string;
  proposal: string;
  createdAt: string;
}

const EMPTY_ACTIVITY: RegulamentoActivity = {
  votes: [],
  objections: [],
  proposals: [],
  available: false,
};

export async function fetchRegulamentoActivity(): Promise<RegulamentoActivity> {
  try {
    const [votes, objections, proposals] = await Promise.all([
      selectAll("regulamento_votes"),
      selectAll("regulamento_objections"),
      selectAll("regulamento_proposals"),
    ]);

    return {
      votes: votes.map((row) => ({
        pointId: String(row["point_id"]),
        voter: String(row["voter"]),
        choice: String(row["choice"]),
      })),
      objections: objections.map((row) => ({
        id: Number(row["id"]),
        ruleId: String(row["rule_id"]),
        voter: String(row["voter"]),
        reason: String(row["reason"]),
        proposal: str(row["proposal"]),
        createdAt: String(row["created_at"]),
      })),
      proposals: proposals.map((row) => ({
        id: Number(row["id"]),
        pointId: str(row["point_id"]),
        voter: String(row["voter"]),
        proposal: String(row["proposal"]),
        createdAt: String(row["created_at"]),
      })),
      available: true,
    };
  } catch (error) {
    console.warn("[regulamento] as tabelas de votação ainda não existem:", error);
    return EMPTY_ACTIVITY;
  }
}

/** Cast or change one person's vote on one point. */
export async function castVote(pointId: string, voter: string, choice: string) {
  const { error } = await supabase
    .from("regulamento_votes" as never)
    .upsert({ point_id: pointId, voter, choice } as never, { onConflict: "point_id,voter" });
  if (error) throw error;
}

export async function addObjection(
  ruleId: string,
  voter: string,
  reason: string,
  proposal: string | null,
) {
  const { error } = await supabase
    .from("regulamento_objections" as never)
    .insert({ rule_id: ruleId, voter, reason, proposal } as never);
  if (error) throw error;
}

export async function addProposal(pointId: string | null, voter: string, proposal: string) {
  const { error } = await supabase
    .from("regulamento_proposals" as never)
    .insert({ point_id: pointId, voter, proposal } as never);
  if (error) throw error;
}
