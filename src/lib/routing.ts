import { redirect } from "@tanstack/react-router";

import type { ScoresView } from "@/components/ScoresLayout";
import { getServerDataset } from "./store";

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
