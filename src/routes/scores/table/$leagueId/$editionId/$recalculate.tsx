import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { ScoresPage, TableView } from "@/components/ScoresPages";
import { useDataset } from "@/hooks/use-app-data";
import { computeTableUpdate, getPlayedMatches } from "@/lib/domain";
import { requireLeagueAndEdition } from "@/lib/routing";
import { getDataset, patchPlayerEditions } from "@/lib/store";

export const Route = createFileRoute("/scores/table/$leagueId/$editionId/$recalculate")({
  // An edition with no games cannot be recalculated: percentage_of_appearances
  // divides by the match count, so Flask raises ZeroDivisionError and returns a
  // 500. Refusing here fails the request the same way, instead of letting the
  // component quietly persist a table full of NaN.
  beforeLoad: ({ params }) => {
    requireLeagueAndEdition(params.leagueId, params.editionId);
    const edition = getDataset().editionById.get(Number(params.editionId));
    if (edition && getPlayedMatches(edition).length === 0) {
      throw new Error(`ZeroDivisionError: ${edition.name} has no games to recalculate`);
    }
  },
  component: RecalculateTablePage,
});

/**
 * `modules/scores.py::table` with the third URL segment present, which is how
 * game creation returns: the edition's aggregate columns are recomputed before
 * the standings render.
 */
function RecalculateTablePage() {
  const { leagueId, editionId } = Route.useParams();
  const dataset = useDataset();
  const edition = dataset.editionById.get(Number(editionId)) ?? null;

  // Applying the patch re-renders this route, so only recalculate once.
  const recalculated = useRef<string | null>(null);
  useEffect(() => {
    if (!edition || recalculated.current === editionId) return;
    recalculated.current = editionId;
    patchPlayerEditions(
      computeTableUpdate(edition).map(({ relationId, ...columns }) => ({
        id: relationId,
        ...columns,
      })),
    );
  }, [edition, editionId]);

  return (
    <ScoresPage
      leagueId={leagueId}
      editionId={editionId}
      view="table"
      render={(_league, currentEdition) => <TableView edition={currentEdition} />}
    />
  );
}
