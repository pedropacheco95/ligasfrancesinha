import { createFileRoute } from "@tanstack/react-router";

import { CreateTeamsView, ScoresPage } from "@/components/ScoresPages";
import { requireLeague } from "@/lib/routing";

export const Route = createFileRoute("/scores/create_teams/$leagueId/$editionId")({
  // Only the league is checked: create_teams.html touches no edition method
  // before a draw, so Flask still returns 200 for an unknown edition id.
  beforeLoad: ({ params }) => requireLeague(params.leagueId),
  component: CreateTeamsPage,
});

/** `modules/scores.py::create_teams`. */
function CreateTeamsPage() {
  const { leagueId, editionId } = Route.useParams();
  return (
    <ScoresPage
      leagueId={leagueId}
      editionId={editionId}
      view="create_teams"
      render={(_league, edition) => <CreateTeamsView edition={edition} />}
    />
  );
}
