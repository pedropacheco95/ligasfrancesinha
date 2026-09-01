import { useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";

import { urlSegment } from "@/lib/format";

/**
 * The standings and scorers tables wrap each player name in a GET form whose
 * action is the player page. Keeping the form markup preserves the
 * `.discret_button` styling; the submit is intercepted so navigation stays
 * client-side.
 */
export function PlayerNameForm({
  playerName,
  editionName,
}: {
  playerName: string;
  editionName?: string;
}) {
  const navigate = useNavigate();
  const href = editionName
    ? `/player/general/${urlSegment(playerName)}/${urlSegment(editionName)}`
    : `/player/general/${urlSegment(playerName)}`;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (editionName) {
      navigate({
        to: "/player/general/$playerName/$editionName",
        params: { playerName, editionName },
      });
    } else {
      navigate({ to: "/player/general/$playerName", params: { playerName } });
    }
  };

  return (
    <a>
      <form action={href} onSubmit={onSubmit}>
        <button type="submit" id="player_name" className="discret_button">
          {playerName}
        </button>
      </form>
    </a>
  );
}
