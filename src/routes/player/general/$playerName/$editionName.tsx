import { createFileRoute } from "@tanstack/react-router";

import { PlayerLayout } from "@/components/PlayerLayout";
import { GeneralView } from "@/components/PlayerPages";
import { useDataset } from "@/hooks/use-app-data";
import { gamesPlayedOnEdition } from "@/lib/domain";
import { sameText } from "@/lib/format";
import { requirePlayerAndEdition } from "@/lib/routing";

export const Route = createFileRoute("/player/general/$playerName/$editionName")({
  beforeLoad: ({ params }) => requirePlayerAndEdition(params.playerName, params.editionName),
  component: PlayerGeneralPage,
});

/** `modules/players.py::general`. */
function PlayerGeneralPage() {
  const { playerName, editionName } = Route.useParams();
  const dataset = useDataset();

  const player = dataset.players.find((candidate) => sameText(candidate.name, playerName));
  if (!player) throw new Error(`No player named ${playerName}`);
  const edition = dataset.editions.find((candidate) => sameText(candidate.name, editionName));
  if (!edition) throw new Error(`No edition named ${editionName}`);

  const association =
    player.editionsRelations.find((relation) => relation.editionId === edition.id) ?? null;

  return (
    <PlayerLayout player={player} edition={edition}>
      <GeneralView
        player={player}
        edition={edition}
        association={association}
        games={gamesPlayedOnEdition(player, edition)}
      />
    </PlayerLayout>
  );
}
