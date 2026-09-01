import { createFileRoute } from "@tanstack/react-router";

import { redirectToLatestEdition } from "@/lib/routing";

/** Flask 302s /scores/games/<league_id> to the league's most recent edition. */
export const Route = createFileRoute("/scores/games/$leagueId/")({
  beforeLoad: ({ params }) => redirectToLatestEdition("games", params.leagueId),
});
