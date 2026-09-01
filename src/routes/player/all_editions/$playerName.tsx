import { createFileRoute } from "@tanstack/react-router";

import { PlayerLayout } from "@/components/PlayerLayout";
import { AllEditionsView } from "@/components/PlayerPages";
import { useDataset } from "@/hooks/use-app-data";
import { sameText } from "@/lib/format";
import { requirePlayerWithEditions } from "@/lib/routing";

export const Route = createFileRoute("/player/all_editions/$playerName")({
  beforeLoad: ({ params }) => requirePlayerWithEditions(params.playerName),
  component: PlayerAllEditionsPage,
});

/** `modules/players.py::all_editions`. */
function PlayerAllEditionsPage() {
  const { playerName } = Route.useParams();
  const dataset = useDataset();

  const player = dataset.players.find((candidate) => sameText(candidate.name, playerName));
  if (!player) throw new Error(`No player named ${playerName}`);

  return (
    <PlayerLayout player={player}>
      <AllEditionsView player={player} />
    </PlayerLayout>
  );
}
