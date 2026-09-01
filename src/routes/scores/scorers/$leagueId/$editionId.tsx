import { createFileRoute } from "@tanstack/react-router";

import { ScorersView, ScoresPage } from "@/components/ScoresPages";
import { requireLeagueAndEdition } from "@/lib/routing";

export const Route = createFileRoute("/scores/scorers/$leagueId/$editionId")({
  beforeLoad: ({ params }) => requireLeagueAndEdition(params.leagueId, params.editionId),
  component: ScorersPage,
});

/** `modules/scores.py::scorers`. */
function ScorersPage() {
  const { leagueId, editionId } = Route.useParams();
  return (
    <ScoresPage
      leagueId={leagueId}
      editionId={editionId}
      view="scorers"
      render={(_league, edition) => <ScorersView edition={edition} />}
    />
  );
}
