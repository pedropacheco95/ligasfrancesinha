import { createFileRoute } from "@tanstack/react-router";

import { redirectToLatestEdition } from "@/lib/routing";

/** Flask 302s /scores/create_teams/<league_id> to the league's most recent edition. */
export const Route = createFileRoute("/scores/create_teams/$leagueId/")({
  beforeLoad: ({ params }) => redirectToLatestEdition("create_teams", params.leagueId),
});
