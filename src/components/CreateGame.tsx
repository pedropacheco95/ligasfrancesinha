import { useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";

import {
  playerImageUrl,
  playersIdsLastTeam,
  BRANQUELAS,
  MAREGOES,
  type Edition,
  type Player,
  type PlayerGameRow,
  type TeamName,
} from "@/lib/domain";
import { isoLocalDate, pyWeekday } from "@/lib/format";
import { addGame, nextGameId, nextPlayerGameId } from "@/lib/store";

/** A line-up slot: a player, or the "Substituto" placeholder the trash icon leaves behind. */
type Slot = { key: number; playerId: number | null };

/**
 * `modules/create.py::game` default date — today, wound back to the league's
 * usual matchday (Thursday for MasterLeague, Tuesday for TuesdayLeague).
 */
export function defaultGameDay(edition: Edition, today: Date = new Date()): string {
  const target =
    edition.league?.name === "MasterLeague" ? 3 : edition.league?.name === "TuesdayLeague" ? 1 : null;
  if (target === null) return isoLocalDate(today);
  const offset = (pyWeekday(today) - target + 7) % 7;
  const day = new Date(today);
  day.setDate(day.getDate() - offset);
  return isoLocalDate(day);
}

export function CreateGameForm({ edition }: { edition: Edition }) {
  const navigate = useNavigate();

  const lineup = playersIdsLastTeam(edition);
  const numberOfPlayersInTeam = Math.floor(lineup.length / 2);
  const playerById = new Map(
    edition.playersRelations
      .filter((relation) => relation.player)
      .map((relation) => [relation.player!.id, relation.player!]),
  );
  // `players` in the template is the last-team list, and it also feeds the modal.
  const modalPlayers = lineup
    .map((id) => playerById.get(id))
    .filter((player): player is Player => player !== undefined);

  const [teams, setTeams] = useState<[Slot[], Slot[]]>(() => [
    lineup.slice(0, numberOfPlayersInTeam).map((id, index) => ({ key: index, playerId: id })),
    lineup.slice(numberOfPlayersInTeam).map((id, index) => ({
      key: numberOfPlayersInTeam + index,
      playerId: id,
    })),
  ]);
  const [goals, setGoals] = useState<Record<number, string>>({});
  const [teamGoals, setTeamGoals] = useState({ team1: "", team2: "" });
  const [date, setDate] = useState(() => defaultGameDay(edition));
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ team: 0 | 1; key: number } | null>(null);

  const replaceSlot = (team: 0 | 1, key: number, playerId: number | null) => {
    setTeams((current) => {
      const next: [Slot[], Slot[]] = [[...current[0]], [...current[1]]];
      next[team] = next[team].map((slot) => (slot.key === key ? { ...slot, playerId } : slot));
      return next;
    });
    setModal(null);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    const goals1 = teamGoals.team1.trim();
    const goals2 = teamGoals.team2.trim();
    if (!goals1 || !goals2) {
      setError("Uma das equipas não tem um numero de golos definido");
      return;
    }

    // Flask resolves the submitted ids through `Player.query.filter(id.in_(...))`,
    // so the placeholder (-1) drops out and the survivors come back in id order.
    const idsFor = (team: 0 | 1) =>
      teams[team]
        .map((slot) => slot.playerId)
        .filter((id): id is number => id !== null && playerById.has(id))
        .sort((a, b) => a - b);
    const team1 = idsFor(0);
    const team2 = idsFor(1);

    if (team1.some((id) => team2.includes(id))) {
      setError("Houve um jogador posto nas duas equipas");
      return;
    }

    const goalsTeam1 = Number.parseInt(goals1, 10);
    const goalsTeam2 = Number.parseInt(goals2, 10);
    const winner = goalsTeam1 > goalsTeam2 ? 1 : goalsTeam1 < goalsTeam2 ? -1 : 0;
    const matchweek = edition.games.length
      ? Math.max(...edition.games.map((game) => game.matchweek)) + 1
      : 1;

    const gameId = nextGameId();
    let relationId = nextPlayerGameId();
    const roster: Array<{ playerId: number; team: TeamName }> = [
      ...team1.map((playerId) => ({ playerId, team: BRANQUELAS as TeamName })),
      ...team2.map((playerId) => ({ playerId, team: MAREGOES as TeamName })),
    ];
    const relations = roster.map(({ playerId, team }): PlayerGameRow => ({
      id: relationId++,
      playerId,
      gameId,
      team,
      goals: Number.parseInt(goals[playerId] ?? "", 10) || 0,
    }));

    addGame(
      {
        id: gameId,
        goalsTeam1,
        goalsTeam2,
        date,
        winner,
        matchweek,
        played: false,
        editionId: edition.id,
      },
      relations,
    );

    navigate({
      to: "/scores/table/$leagueId/$editionId/$recalculate",
      params: {
        leagueId: String(edition.league?.id),
        editionId: String(edition.id),
        recalculate: "True",
      },
    });
  };

  return (
    <>
      <form method="post" onSubmit={onSubmit}>
        <div className="game_container">
          <div
            className="game_info_container"
            style={{
              backgroundImage:
                "linear-gradient(to top,rgba(2, 90, 61, 0.5) ,rgba(0,0,0,0.8)), url(/static/images/Campo-Torrinha.jpg)",
              color: "white",
            }}
          >
            <div>
              <table className="table table-borderless" cellSpacing={0} cellPadding={0}>
                <tbody>
                  <tr style={{ fontSize: "smaller" }}>
                    <td colSpan={3}>{edition.name}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="results_container">
              <TeamBadge team={BRANQUELAS} />
              <div className="game_result">
                <ScoreInputs value={teamGoals} onChange={setTeamGoals} />
              </div>
              <TeamBadge team={MAREGOES} />
            </div>
            <div className="results_container_small_screen">
              <div className="teams_container">
                <TeamBadge team={BRANQUELAS} />
                <TeamBadge team={MAREGOES} />
              </div>
              <div className="game_result">
                <ScoreInputs value={teamGoals} onChange={setTeamGoals} />
              </div>
            </div>
          </div>

          <div className="games_info">
            <br />
            <div className="smallheader">Ficha do jogo</div>
            {error ? <div>{error}</div> : null}
            <div>
              <input
                type="date"
                name="game_date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="box_container">
              {([0, 1] as const).map((teamIndex) => (
                <div className="line_up" key={teamIndex}>
                  <div className="heading">
                    <span className="optional_description">Equipa</span>
                    <span className="optional_description_for_small_screen">
                      {teamIndex === 0 ? "Branquelas" : " Maregões"}
                    </span>
                  </div>
                  <div className="table table-striped table_line_up">
                    {teams[teamIndex].map((slot) => (
                      <PlayerRow
                        key={slot.key}
                        team={teamIndex + 1}
                        player={slot.playerId === null ? null : playerById.get(slot.playerId) ?? null}
                        goals={slot.playerId === null ? "" : (goals[slot.playerId] ?? "")}
                        onGoals={(value) =>
                          slot.playerId !== null &&
                          setGoals((current) => ({ ...current, [slot.playerId!]: value }))
                        }
                        onPick={() => setModal({ team: teamIndex, key: slot.key })}
                        onRemove={() => replaceSlot(teamIndex, slot.key, null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" type="submit">
            Criar
          </button>
        </div>
      </form>

      <div className="modal" id="switch_player_modal" style={{ display: modal ? "block" : "none" }}>
        <div className="modal_content">
          <div className="modal_header">
            <h4>Escolhe outro jogador</h4>
            <h4 className="closeModal topButton" onClick={() => setModal(null)}>
              ×
            </h4>
          </div>
          <div className="modal_body">
            <div className="like_modal">
              <div className="like_modal_container">
                <div className="players-grid">
                  {modalPlayers.map((player) => (
                    <div
                      className="player"
                      key={player.id}
                      onClick={() => modal && replaceSlot(modal.team, modal.key, player.id)}
                    >
                      <img className="player-pic" src={playerImageUrl(player)} alt="Player Name" />
                      <div className="player-name">{player.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function TeamBadge({ team }: { team: typeof BRANQUELAS | typeof MAREGOES }) {
  return (
    <div className="team_logo_container">
      <div className="image profile_picture">
        <img src={`/static/images/${team}.png`} />
      </div>
      <div className="team_name"> {team} </div>
    </div>
  );
}

function ScoreInputs({
  value,
  onChange,
}: {
  value: { team1: string; team2: string };
  onChange: (next: { team1: string; team2: string }) => void;
}) {
  return (
    <div className="game_result_inputs">
      <input
        type="number"
        name="goals_team1"
        className="goals_of_team_input"
        value={value.team1}
        onChange={(event) => onChange({ ...value, team1: event.target.value })}
      />
      -
      <input
        type="number"
        name="goals_team2"
        className="goals_of_team_input"
        value={value.team2}
        onChange={(event) => onChange({ ...value, team2: event.target.value })}
      />
    </div>
  );
}

/** `macros/frontend_creation.html::create_game_player_input` and its empty variant. */
function PlayerRow({
  team,
  player,
  goals,
  onGoals,
  onPick,
  onRemove,
}: {
  team: number;
  player: Player | null;
  goals: string;
  onGoals: (value: string) => void;
  onPick: () => void;
  onRemove: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const dragStart = useState<{ x: number | null }>({ x: null })[0];

  return (
    <div
      className={revealed ? "create_game_player_row is-dragging" : "create_game_player_row"}
      data-team={team}
      onPointerDown={(event) => {
        dragStart.x = event.clientX;
      }}
      onPointerUp={(event) => {
        if (dragStart.x === null) return;
        const delta = event.clientX - dragStart.x;
        dragStart.x = null;
        if (delta < -10) setRevealed(true);
        else if (delta > 10) setRevealed(false);
      }}
    >
      <div className="row-content">
        <div className="player_id">{player?.id}</div>
        <div className="player_image">
          <img
            className="table_profile_image_editing"
            src={player ? playerImageUrl(player) : "/static/images/Player/no_player.png"}
          />
        </div>
        <div className="player_name">
          <div className="modalActivation playerField" onClick={onPick}>
            {" "}
            {player ? player.name : "Substituto"}{" "}
          </div>
          <input
            type="number"
            name={`player_team_${team}`}
            value={player ? player.id : -1}
            readOnly
            style={{ display: "none" }}
          />
        </div>
        <div className="player_goals_input">
          {player ? (
            <>
              <input
                type="number"
                name={`goals_${player.id}`}
                className="goals_of_player_input"
                value={goals}
                onChange={(event) => onGoals(event.target.value)}
              />
              <img src="/static/images/goal.png" width="18" height="18" />
            </>
          ) : null}
        </div>
      </div>
      <div
        className="trash"
        style={revealed ? { transform: "translateX(-10%)" } : undefined}
        onClick={onRemove}
      >
        <img src="/static/images/delete.png" className="delete_icon" alt="Delete Image" />
      </div>
    </div>
  );
}
