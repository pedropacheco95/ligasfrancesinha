import { redirect } from "@tanstack/react-router";

import type { ScoresView } from "@/components/ScoresLayout";
import { sameText } from "./format";
import { getDataset, getServerDataset } from "./store";

/**
 * The Flask views accept a league (or player) with no edition and 302 to the
 * most recent one. The league→edition mapping never changes locally, so the
 * seed dataset is enough to resolve the target during `beforeLoad`.
 */
export function redirectToLatestEdition(view: ScoresView, leagueId: string): never {
  const league = getServerDataset().leagueById.get(Number(leagueId));
  const latest = league?.editions[league.editions.length - 1];
  if (!latest) {
    // Flask redirects to a blueprint that was never registered and 500s here.
    throw new Error(`No league with id ${leagueId}`);
  }
  throw redirect({
    to: `/scores/${view}/$leagueId/$editionId`,
    params: { leagueId, editionId: String(latest.id) },
  });
}

/*
 * The guards below run in `beforeLoad` rather than during render so an unknown
 * id fails the request and returns a 500, as Flask does. Throwing from a
 * component would be caught by the router's error boundary and served as a 200.
 *
 * They are safe to resolve against the current dataset because leagues,
 * editions and players are never created locally — only games are, which is why
 * the game route deliberately has no such guard.
 */

export function requireLeague(leagueId: string): void {
  if (!getDataset().leagueById.has(Number(leagueId))) {
    throw new Error(`No league with id ${leagueId}`);
  }
}

export function requireLeagueAndEdition(leagueId: string, editionId: string): void {
  requireLeague(leagueId);
  if (!getDataset().editionById.has(Number(editionId))) {
    throw new Error(`No edition with id ${editionId}`);
  }
}

/**
 * `players/layout.html` links "Página inicial" at the player's most recent
 * edition, reached as `editions_relations[-1]`. A player who belongs to no
 * edition raises IndexError there, so the views that render the layout without
 * an edition of their own 500 for that player.
 */
export function requirePlayerWithEditions(playerName: string): void {
  const player = getDataset().players.find((candidate) => sameText(candidate.name, playerName));
  if (!player) {
    throw new Error(`No player named ${playerName}`);
  }
  if (player.editionsRelations.length === 0) {
    throw new Error(`IndexError: ${player.name} belongs to no edition`);
  }
}

export function requirePlayerAndEdition(playerName: string, editionName: string): void {
  const dataset = getDataset();
  if (!dataset.players.some((candidate) => sameText(candidate.name, playerName))) {
    throw new Error(`No player named ${playerName}`);
  }
  if (!dataset.editions.some((candidate) => sameText(candidate.name, editionName))) {
    throw new Error(`No edition named ${editionName}`);
  }
}
