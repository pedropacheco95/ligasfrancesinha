import { createFileRoute } from "@tanstack/react-router";

import { GamesView, ScoresPage } from "@/components/ScoresPages";
import { requireLeagueAndEdition } from "@/lib/routing";

export const Route = createFileRoute("/scores/games/$leagueId/$editionId")({
  beforeLoad: ({ params }) => requireLeagueAndEdition(params.leagueId, params.editionId),
  component: GamesPage,
});

/** `modules/scores.py::games`. */
function GamesPage() {
  const { leagueId, editionId } = Route.useParams();
  return (
    <ScoresPage
      leagueId={leagueId}
      editionId={editionId}
      view="games"
      render={(league, edition) => <GamesView league={league} edition={edition} />}
    />
  );
}
