/**
 * Object graph and business logic ported from the Flask/SQLAlchemy models.
 *
 * The Flask app renders the *stored* aggregate columns of `players_in_edition`
 * on every normal page load — `update_table` only runs when the `recalculate`
 * URL segment is present. So this module reads those columns as-is and only
 * recomputes what the templates compute at render time.
 *
 * Rows arrive ordered by primary key, which matters: Python's sort is stable,
 * so standings ties fall back to insertion order. JS's sort is stable too, so
 * keeping the id ordering reproduces the Flask tie-breaking exactly.
 */

import { pyRound, pyWeekday } from "./format";

export const BRANQUELAS = "Branquelas";
export const MAREGOES = "Maregões";
export type TeamName = typeof BRANQUELAS | typeof MAREGOES;

export interface LeagueRow {
  id: number;
  name: string;
  picture: string | null;
}

export interface EditionRow {
  id: number;
  name: string;
  time: string | null;
  finalGame: string | null;
  hasEnded: boolean;
  goalValue: number | null;
  numberOfTeamsMade: number | null;
  leagueId: number | null;
  lastTeam: string | null;
}

export interface PlayerRow {
  id: number;
  name: string;
  fullName: string | null;
  birthday: string | null;
  imageUrl: string | null;
}

export interface GameRow {
  id: number;
  goalsTeam1: number | null;
  goalsTeam2: number | null;
  date: string | null;
  winner: number | null;
  matchweek: number;
  played: boolean;
  editionId: number | null;
}

export interface PlayerGameRow {
  id: number;
  playerId: number | null;
  gameId: number | null;
  team: TeamName;
  goals: number | null;
}

export interface PlayerEditionRow {
  id: number;
  playerId: number | null;
  editionId: number | null;
  place: number | null;
  lastPlace: number | null;
  points: number | null;
  appearances: number | null;
  goals: number | null;
  percentageOfAppearances: number | null;
  wins: number | null;
  draws: number | null;
  losts: number | null;
  goalsScoredByTeam: number | null;
  goalsSufferedByTeam: number | null;
  matchweek: number | null;
}

export interface RawData {
  leagues: LeagueRow[];
  editions: EditionRow[];
  players: PlayerRow[];
  games: GameRow[];
  playersInGame: PlayerGameRow[];
  playersInEdition: PlayerEditionRow[];
}

export interface League extends LeagueRow {
  editions: Edition[];
}

export interface Edition extends EditionRow {
  league: League | null;
  games: Game[];
  playersRelations: PlayerEdition[];
}

export interface Player extends PlayerRow {
  gamesRelations: PlayerGame[];
  editionsRelations: PlayerEdition[];
}

export interface Game extends GameRow {
  edition: Edition | null;
  playersRelations: PlayerGame[];
}

export interface PlayerGame extends PlayerGameRow {
  game: Game | null;
  player: Player | null;
}

export interface PlayerEdition extends PlayerEditionRow {
  player: Player | null;
  edition: Edition | null;
}

export interface Dataset {
  leagues: League[];
  editions: Edition[];
  players: Player[];
  games: Game[];
  leagueById: Map<number, League>;
  editionById: Map<number, Edition>;
  playerById: Map<number, Player>;
  gameById: Map<number, Game>;
}

/** Resolve the flat rows into the bidirectional graph SQLAlchemy hands Jinja. */
export function buildDataset(raw: RawData): Dataset {
  const leagues: League[] = raw.leagues.map((row) => ({ ...row, editions: [] }));
  const editions: Edition[] = raw.editions.map((row) => ({
    ...row,
    league: null,
    games: [],
    playersRelations: [],
  }));
  const players: Player[] = raw.players.map((row) => ({
    ...row,
    gamesRelations: [],
    editionsRelations: [],
  }));
  const games: Game[] = raw.games.map((row) => ({
    ...row,
    edition: null,
    playersRelations: [],
  }));

  const leagueById = new Map(leagues.map((l) => [l.id, l]));
  const editionById = new Map(editions.map((e) => [e.id, e]));
  const playerById = new Map(players.map((p) => [p.id, p]));
  const gameById = new Map(games.map((g) => [g.id, g]));

  for (const edition of editions) {
    const league = edition.leagueId === null ? null : (leagueById.get(edition.leagueId) ?? null);
    edition.league = league;
    league?.editions.push(edition);
  }

  for (const game of games) {
    const edition = game.editionId === null ? null : (editionById.get(game.editionId) ?? null);
    game.edition = edition;
    edition?.games.push(game);
  }

  for (const row of raw.playersInEdition) {
    const player = row.playerId === null ? null : (playerById.get(row.playerId) ?? null);
    const edition = row.editionId === null ? null : (editionById.get(row.editionId) ?? null);
    const relation: PlayerEdition = { ...row, player, edition };
    player?.editionsRelations.push(relation);
    edition?.playersRelations.push(relation);
  }

  for (const row of raw.playersInGame) {
    const player = row.playerId === null ? null : (playerById.get(row.playerId) ?? null);
    const game = row.gameId === null ? null : (gameById.get(row.gameId) ?? null);
    const relation: PlayerGame = { ...row, player, game };
    player?.gamesRelations.push(relation);
    game?.playersRelations.push(relation);
  }

  return { leagues, editions, players, games, leagueById, editionById, playerById, gameById };
}

/* ---------------------------------------------------------------- Edition */

export function getNumberOfPlayers(edition: Edition): number {
  return edition.playersRelations.length;
}

/** `Edition.players_relations_classification` — points descending, ties keep id order. */
export function playersRelationsClassification(edition: Edition): PlayerEdition[] {
  return [...edition.playersRelations].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
}

export function playersClassification(edition: Edition): Player[] {
  return playersRelationsClassification(edition)
    .map((relation) => relation.player)
    .filter((player): player is Player => player !== null);
}

/** `Edition.players_relations_classification_by_goals`. */
export function playersRelationsClassificationByGoals(edition: Edition): PlayerEdition[] {
  return [...edition.playersRelations].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0));
}

export function getOrderedGames(edition: Edition): Game[] {
  return [...edition.games].sort((a, b) => a.matchweek - b.matchweek);
}

/** `Edition.get_played_matches` — the `played` filter is commented out upstream. */
export function getPlayedMatches(edition: Edition): Game[] {
  return edition.games;
}

/** `Edition.players_ids_last_team`. */
export function playersIdsLastTeam(edition: Edition): number[] {
  if (edition.lastTeam) {
    return edition.lastTeam
      .slice(0, -1)
      .split(";")
      .map((id) => Number.parseInt(id, 10));
  }
  return edition.playersRelations.map((relation) => relation.player?.id ?? 0);
}

/**
 * `Edition.next_game_datetime` — the weekday of `final_game`, projected onto
 * the coming week, at the edition's kickoff time. Returned as the
 * '%Y-%m-%dT%H:%M' string the countdown widget parses.
 */
export function nextGameDatetime(edition: Edition, now: Date = new Date()): string | null {
  if (!edition.finalGame || !edition.time) return null;

  const [year, month, day] = edition.finalGame.split("-").map(Number);
  const finalGame = new Date(year, month - 1, day);
  const daysUntilNext = (pyWeekday(finalGame) - pyWeekday(now) + 7) % 7;

  const target = new Date(now);
  target.setDate(target.getDate() + daysUntilNext);

  const [hours, minutes] = edition.time.split(":");
  const yyyy = String(target.getFullYear()).padStart(4, "0");
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
}

/* ----------------------------------------------------------------- Player */

export function playerEditions(player: Player): Edition[] {
  return player.editionsRelations
    .map((relation) => relation.edition)
    .filter((edition): edition is Edition => edition !== null);
}

export function gamesPlayed(player: Player): Game[] {
  return player.gamesRelations
    .map((relation) => relation.game)
    .filter((game): game is Game => game !== null);
}

export function gamesPlayedOnEdition(player: Player, edition: Edition): Game[] {
  return player.gamesRelations
    .filter((relation) => relation.game?.editionId === edition.id)
    .map((relation) => relation.game as Game);
}

/** Relations for one edition, or every relation when no edition is given. */
export function getGamesRelationsPlayed(player: Player, edition?: Edition | null): PlayerGame[] {
  if (!edition) return player.gamesRelations;
  return player.gamesRelations.filter((relation) => relation.game?.editionId === edition.id);
}

/** `Player.result_on_game` — 1 win, 0 draw, -1 loss, from the player's side. */
export function resultOnGame(player: Player, game: Game): number {
  const relation = player.gamesRelations.find((rel) => rel.game?.id === game.id);
  if (!relation) return 0;
  const factor = relation.team === MAREGOES ? -1 : 1;
  return (game.winner ?? 0) * factor;
}

export function goalsOnGame(player: Player, game: Game): number | null {
  const relation = player.gamesRelations.find((rel) => rel.game?.id === game.id);
  return relation ? relation.goals : null;
}

export function playerAge(player: Player, today: Date = new Date()): number | null {
  if (!player.birthday) return null;
  const [year, month, day] = player.birthday.split("-").map(Number);
  const hadBirthday =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (hadBirthday ? 0 : 1);
}

export function gamesWon(player: Player, edition?: Edition | null): Game[] {
  return getGamesRelationsPlayed(player, edition)
    .filter(
      (rel) =>
        (rel.team === BRANQUELAS && rel.game?.winner === 1) ||
        (rel.team === MAREGOES && rel.game?.winner === -1),
    )
    .map((rel) => rel.game as Game);
}

export function gamesDrawn(player: Player, edition?: Edition | null): Game[] {
  return getGamesRelationsPlayed(player, edition)
    .filter((rel) => rel.game?.winner === 0)
    .map((rel) => rel.game as Game);
}

export function gamesLost(player: Player, edition?: Edition | null): Game[] {
  return getGamesRelationsPlayed(player, edition)
    .filter(
      (rel) =>
        (rel.team === MAREGOES && rel.game?.winner === 1) ||
        (rel.team === BRANQUELAS && rel.game?.winner === -1),
    )
    .map((rel) => rel.game as Game);
}

export function playerGoals(player: Player, edition?: Edition | null): number {
  return getGamesRelationsPlayed(player, edition).reduce((sum, rel) => sum + (rel.goals ?? 0), 0);
}

export function goalsScoredByTeam(player: Player, edition?: Edition | null): number {
  return getGamesRelationsPlayed(player, edition).reduce((sum, rel) => {
    const game = rel.game;
    if (!game) return sum;
    return sum + ((rel.team === BRANQUELAS ? game.goalsTeam1 : game.goalsTeam2) ?? 0);
  }, 0);
}

export function goalsSufferedByTeam(player: Player, edition?: Edition | null): number {
  return getGamesRelationsPlayed(player, edition).reduce((sum, rel) => {
    const game = rel.game;
    if (!game) return sum;
    return sum + ((rel.team === MAREGOES ? game.goalsTeam1 : game.goalsTeam2) ?? 0);
  }, 0);
}

/** `Player.full_image_url` — always under /static/images, however broken the value. */
export function playerImageUrl(player: Player): string {
  return `/static/images/${player.imageUrl ?? "Players/default_player.png"}`;
}

export function leagueImageUrl(league: League): string {
  return `/static/images/${league.picture ?? ""}`;
}

/* ------------------------------------------------------------------- Game */

/** `Game.players_by_team` — both keys always exist, even when empty. */
export function playersByTeam(game: Game): Record<TeamName, Array<[PlayerGame, Player]>> {
  const teams: Record<TeamName, Array<[PlayerGame, Player]>> = {
    [BRANQUELAS]: [],
    [MAREGOES]: [],
  };
  for (const relation of game.playersRelations) {
    if (relation.player) teams[relation.team].push([relation, relation.player]);
  }
  return teams;
}

/* -------------------------------------------------------------- Team draw */

/**
 * `Edition.make_teams`. Snakes the standings into two teams: the leader pairs
 * with the tail, then the sides alternate every other pick.
 *
 * Two branches are load-bearing for parity. When fewer games have been played
 * than teams drawn, the previous draw is replayed verbatim (no shuffle, no
 * counter bump). And MasterLeague shuffles the standings first, so its output
 * is genuinely random — `shuffle` is injected so callers can seed it.
 */
export function makeTeams(
  edition: Edition,
  shuffle: (players: Player[]) => void = defaultShuffle,
): { teams: Record<TeamName, Player[]>; lastTeam: string | null; drawCounted: boolean } {
  if (edition.games.length < (edition.numberOfTeamsMade ?? 0)) {
    const byId = new Map(
      edition.playersRelations
        .filter((relation) => relation.player)
        .map((relation) => [relation.player!.id, relation.player!]),
    );
    const previous = playersIdsLastTeam(edition)
      .map((id) => byId.get(id))
      .filter((player): player is Player => player !== undefined);
    const midIndex = Math.floor(previous.length / 2);
    return {
      teams: {
        [BRANQUELAS]: previous.slice(0, midIndex),
        [MAREGOES]: previous.slice(midIndex),
      },
      lastTeam: edition.lastTeam,
      drawCounted: false,
    };
  }

  const players = playersClassification(edition);
  if (edition.league?.name === "MasterLeague") shuffle(players);

  const evenPlayers = ((players.length / 2) % 2) === 0;
  const teams: Record<TeamName, Player[]> = { [BRANQUELAS]: [], [MAREGOES]: [] };
  const order: [Player[], Player[]] = [teams[BRANQUELAS], teams[MAREGOES]];
  let flip = false;
  let count = 1;

  while (players.length) {
    if (players.length === 2 && flip && !evenPlayers) {
      order[flip ? 0 : 1].push(players.pop() as Player);
      order[flip ? 1 : 0].push(players.shift() as Player);
    } else {
      const team = order[flip ? 1 : 0];
      const first = players.shift() as Player;
      team.push(first);
      if (players.length) team.push(players.pop() as Player);
      flip = !flip;
    }
    if (count % 2 === 0) flip = !flip;
    count += 1;
  }

  let lastTeam = "";
  for (const key of [BRANQUELAS, MAREGOES] as TeamName[]) {
    for (const player of teams[key]) lastTeam += `${player.id};`;
  }

  return { teams, lastTeam, drawCounted: true };
}

function defaultShuffle(players: Player[]): void {
  // Fisher-Yates, matching random.shuffle's uniform result (not its sequence).
  for (let i = players.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
}

/* ---------------------------------------------------------- Table refresh */

export interface TableUpdate {
  relationId: number;
  points: number;
  appearances: number;
  percentageOfAppearances: number;
  wins: number;
  draws: number;
  losts: number;
  goals: number;
  goalsScoredByTeam: number;
  goalsSufferedByTeam: number;
  matchweek: number;
  place: number;
  lastPlace: number | null;
}

/**
 * `Edition.update_table(force_update=True)`, the recalculation the app runs
 * after a game is created. Returns the new column values rather than mutating,
 * so the caller decides how to persist them.
 */
export function computeTableUpdate(edition: Edition): TableUpdate[] {
  const ordered = getOrderedGames(edition);
  const matchweek = ordered.length ? ordered[ordered.length - 1].matchweek : 0;
  const playedMatches = getPlayedMatches(edition).length;
  const goalValue = edition.goalValue ?? 0;

  const computed = edition.playersRelations.map((relation) => {
    const player = relation.player;
    if (!player) {
      return {
        relationId: relation.id,
        points: relation.points ?? 0,
        appearances: relation.appearances ?? 0,
        percentageOfAppearances: relation.percentageOfAppearances ?? 0,
        wins: relation.wins ?? 0,
        draws: relation.draws ?? 0,
        losts: relation.losts ?? 0,
        goals: relation.goals ?? 0,
        goalsScoredByTeam: relation.goalsScoredByTeam ?? 0,
        goalsSufferedByTeam: relation.goalsSufferedByTeam ?? 0,
        matchweek,
      };
    }

    const wins = gamesWon(player, edition).length;
    const draws = gamesDrawn(player, edition).length;
    const losts = gamesLost(player, edition).length;
    const goals = playerGoals(player, edition);
    const appearances = gamesPlayedOnEdition(player, edition).length;

    return {
      relationId: relation.id,
      points: wins * 4 + draws * 2 + losts + goals * goalValue,
      appearances,
      percentageOfAppearances: pyRound((appearances / playedMatches) * 100, 2),
      wins,
      draws,
      losts,
      goals,
      goalsScoredByTeam: goalsScoredByTeam(player, edition),
      goalsSufferedByTeam: goalsSufferedByTeam(player, edition),
      matchweek,
    };
  });

  // `players_classification(update_places=True)` then renumbers every place.
  const previousPlace = new Map(edition.playersRelations.map((rel) => [rel.id, rel.place]));
  const ranked = [...computed].sort((a, b) => b.points - a.points);
  const places = new Map(ranked.map((entry, index) => [entry.relationId, index + 1]));

  return computed.map((entry) => ({
    ...entry,
    place: places.get(entry.relationId) ?? 0,
    lastPlace: previousPlace.get(entry.relationId) ?? null,
  }));
}
