import { createFileRoute } from "@tanstack/react-router";

import { redirectToLatestEdition } from "@/lib/routing";

/** Flask 302s /scores/scorers/<league_id> to the league's most recent edition. */
export const Route = createFileRoute("/scores/scorers/$leagueId/")({
  beforeLoad: ({ params }) => redirectToLatestEdition("scorers", params.leagueId),
});
