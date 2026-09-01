import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { ScoresPage, TableView } from "@/components/ScoresPages";
import { useDataset } from "@/hooks/use-app-data";
import { computeTableUpdate } from "@/lib/domain";
import { patchPlayerEditions } from "@/lib/store";

export const Route = createFileRoute("/scores/table/$leagueId/$editionId/$recalculate")({
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

  useEffect(() => {
    if (!edition) return;
    patchPlayerEditions(
      computeTableUpdate(edition).map(({ relationId, ...columns }) => ({
        id: relationId,
        ...columns,
      })),
    );
    // Recompute once per edition arrival; the patch itself changes `edition`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editionId]);

  return (
    <ScoresPage
      leagueId={leagueId}
      editionId={editionId}
      view="table"
      render={(_league, currentEdition) => <TableView edition={currentEdition} />}
    />
  );
}
