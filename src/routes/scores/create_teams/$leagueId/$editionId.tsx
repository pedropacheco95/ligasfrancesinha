import { createFileRoute } from "@tanstack/react-router";

import { CreateTeamsView, ScoresPage } from "@/components/ScoresPages";

export const Route = createFileRoute("/scores/create_teams/$leagueId/$editionId")({
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
