import { createFileRoute, redirect } from "@tanstack/react-router";

import { sameText } from "@/lib/format";
import { getServerDataset } from "@/lib/store";

/**
 * Flask 302s /player/general/<name> to the player's most recent edition, via
 * `player.editions_relations[-1].edition.name`.
 */
export const Route = createFileRoute("/player/general/$playerName/")({
  beforeLoad: ({ params }) => {
    const player = getServerDataset().players.find((candidate) =>
      sameText(candidate.name, params.playerName),
    );
    if (!player) throw new Error(`No player named ${params.playerName}`);
    const latest = player.editionsRelations[player.editionsRelations.length - 1]?.edition;
    if (!latest) throw new Error(`${player.name} has no editions`);
    throw redirect({
      to: "/player/general/$playerName/$editionName",
      params: { playerName: player.name, editionName: latest.name },
    });
  },
});
