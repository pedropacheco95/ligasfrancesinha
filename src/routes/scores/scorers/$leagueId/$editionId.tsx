import { createFileRoute } from "@tanstack/react-router";

import { ScorersView, ScoresPage } from "@/components/ScoresPages";

export const Route = createFileRoute("/scores/scorers/$leagueId/$editionId")({
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
