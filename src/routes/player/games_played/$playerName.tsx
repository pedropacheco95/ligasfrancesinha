import { createFileRoute } from "@tanstack/react-router";

import { PlayerLayout } from "@/components/PlayerLayout";
import { GamesPlayedView } from "@/components/PlayerPages";
import { useDataset } from "@/hooks/use-app-data";
import { gamesPlayed } from "@/lib/domain";
import { sameText } from "@/lib/format";

export const Route = createFileRoute("/player/games_played/$playerName")({
  component: PlayerGamesPlayedPage,
});

/** `modules/players.py::games_played`. */
function PlayerGamesPlayedPage() {
  const { playerName } = Route.useParams();
  const dataset = useDataset();

  const player = dataset.players.find((candidate) => sameText(candidate.name, playerName));
  if (!player) throw new Error(`No player named ${playerName}`);

  return (
    <PlayerLayout player={player}>
      <GamesPlayedView player={player} games={gamesPlayed(player)} />
    </PlayerLayout>
  );
}
