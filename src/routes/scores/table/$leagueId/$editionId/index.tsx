import { createFileRoute } from "@tanstack/react-router";

import { ScoresPage, TableView } from "@/components/ScoresPages";

export const Route = createFileRoute("/scores/table/$leagueId/$editionId/")({
  component: TablePage,
});

/** `modules/scores.py::table`. */
function TablePage() {
  const { leagueId, editionId } = Route.useParams();
  return (
    <ScoresPage
      leagueId={leagueId}
      editionId={editionId}
      view="table"
      render={(_league, edition) => <TableView edition={edition} />}
    />
  );
}
