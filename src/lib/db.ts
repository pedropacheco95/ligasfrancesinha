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
  return { id: Number(row['id']), name: String(row['name']), picture: str(row['picture']) };
}

function toEdition(row: Row): EditionRow {
  return {
    id: Number(row['id']),
    name: String(row['name']),
    time: str(row['time']),
    finalGame: str(row['final_game']),
    hasEnded: Boolean(row['has_ended']),
    goalValue: num(row['goal_value']),
    numberOfTeamsMade: num(row['number_of_teams_made']),
    leagueId: num(row['league_id']),
    lastTeam: str(row['last_team']),
  };
}

function toPlayer(row: Row): PlayerRow {
  return {
    id: Number(row['id']),
    name: String(row['name']),
    fullName: str(row['full_name']),
    birthday: str(row['birthday']),
    imageUrl: str(row['image_url']),
  };
}

function toGame(row: Row): GameRow {
  return {
    id: Number(row['id']),
    goalsTeam1: num(row['goals_team1']),
    goalsTeam2: num(row['goals_team2']),
    date: str(row['date']),
    winner: num(row['winner']),
    matchweek: Number(row['matchweek']),
    played: Boolean(row['played']),
    editionId: num(row['edition_id']),
  };
}

function toPlayerGame(row: Row): PlayerGameRow {
  return {
    id: Number(row['id']),
    playerId: num(row['player_id']),
    gameId: num(row['game_id']),
    team: String(row['team']) as TeamName,
    goals: num(row['goals']),
  };
}

function toPlayerEdition(row: Row): PlayerEditionRow {
  return {
    id: Number(row['id']),
    playerId: num(row['player_id']),
    editionId: num(row['edition_id']),
    place: num(row['place']),
    lastPlace: num(row['last_place']),
    points: num(row['points']),
    appearances: num(row['appearances']),
    goals: num(row['goals']),
    percentageOfAppearances: num(row['percentage_of_appearances']),
    wins: num(row['wins']),
    draws: num(row['draws']),
    losts: num(row['losts']),
    goalsScoredByTeam: num(row['goals_scored_by_team']),
    goalsSufferedByTeam: num(row['goals_suffered_by_team']),
    matchweek: num(row['matchweek']),
  };
}

/** Rows come back ordered by id so ties keep insertion order, as in the original app. */
async function selectAll(table: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
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

export async function insertGame(game: GameRow, relations: PlayerGameRow[]) {
  const { error: gameError } = await supabase.from("games").insert({
    id: game.id,
    goals_team1: game.goalsTeam1,
    goals_team2: game.goalsTeam2,
    date: game.date,
    winner: game.winner,
    matchweek: game.matchweek,
    played: game.played,
    edition_id: game.editionId,
  });
  if (gameError) throw gameError;

  if (relations.length === 0) return;
  const { error } = await supabase.from("players_in_game").insert(
    relations.map((relation) => ({
      id: relation.id,
      player_id: relation.playerId,
      game_id: relation.gameId,
      team: relation.team,
      goals: relation.goals,
    })),
  );
  if (error) throw error;
}

export async function updateEdition(editionId: number, patch: Partial<EditionRow>) {
  const columns: Row = {};
  if ("name" in patch) columns['name'] = patch.name;
  if ("time" in patch) columns['time'] = patch.time;
  if ("finalGame" in patch) columns['final_game'] = patch.finalGame;
  if ("hasEnded" in patch) columns['has_ended'] = patch.hasEnded;
  if ("goalValue" in patch) columns['goal_value'] = patch.goalValue;
  if ("numberOfTeamsMade" in patch) columns['number_of_teams_made'] = patch.numberOfTeamsMade;
  if ("leagueId" in patch) columns['league_id'] = patch.leagueId;
  if ("lastTeam" in patch) columns['last_team'] = patch.lastTeam;
  if (Object.keys(columns).length === 0) return;

  const { error } = await supabase.from("editions").update(columns).eq("id", editionId);
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
      const { error } = await supabase.from("players_in_edition").update(columns).eq("id", id);
      if (error) throw error;
    }),
  );
}
