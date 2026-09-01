import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Layout } from "@/components/Layout";
import { useDataset } from "@/hooks/use-app-data";
import {
  playerImageUrl,
  playersByTeam,
  BRANQUELAS,
  MAREGOES,
  type Edition,
  type Game,
  type TeamName,
} from "@/lib/domain";
import { pyDate } from "@/lib/format";

export const Route = createFileRoute("/game/$id")({
  component: GamePage,
});

/** `modules/games.py::general` rendering `games/games.html` on `games/layout.html`. */
function GamePage() {
  const { id } = Route.useParams();
  const dataset = useDataset();
  const game = dataset.gameById.get(Number(id));
  if (!game) throw new Error(`No game with id ${id}`);

  const edition = game.edition;
  const teams = playersByTeam(game);

  return (
    <Layout>
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
                  <td colSpan={3}>
                    Jogo dia {pyDate(game.date)} - {edition?.time}- Campo Francisco torrinha
                  </td>
                </tr>
                <tr style={{ fontSize: "smaller" }}>
                  <td colSpan={3}>
                    {edition?.name}, Jornada {game.matchweek}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="results_container">
            <TeamBadge team={BRANQUELAS} />
            <div className="game_result">
              <div>
                {game.goalsTeam1} - {game.goalsTeam2}
              </div>
            </div>
            <TeamBadge team={MAREGOES} />
          </div>
          <div className="results_container_small_screen">
            <div className="game_result">
              <div>
                {game.goalsTeam1} - {game.goalsTeam2}
              </div>
            </div>
            <div className="teams_container">
              <TeamBadge team={BRANQUELAS} />
              <TeamBadge team={MAREGOES} />
            </div>
          </div>
        </div>

        <div className="games_info">
          <div className="smallheader">Ficha do jogo</div>
          <div className="box_container">
            <LineUp game={game} edition={edition} team={BRANQUELAS} teams={teams} />
            <LineUp game={game} edition={edition} team={MAREGOES} teams={teams} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

function TeamBadge({ team }: { team: TeamName }) {
  return (
    <div className="team_logo_container">
      <div className="image profile_picture">
        <img src={`/static/images/${team}.png`} />
      </div>
      <div className="team_name"> {team} </div>
    </div>
  );
}

function LineUp({
  edition,
  team,
  teams,
}: {
  game: Game;
  edition: Edition | null;
  team: TeamName;
  teams: ReturnType<typeof playersByTeam>;
}) {
  const navigate = useNavigate();

  return (
    <div className="line_up">
      <div className="heading">
        <span className="optional_description">Equipa</span>
        <span className="optional_description_for_small_screen">
          {team === MAREGOES ? " Maregões" : "Branquelas"}
        </span>
      </div>
      <table className="table table-striped table_line_up">
        <tbody>
          {teams[team].map(([relation, player]) => (
            <tr
              key={relation.id}
              onClick={() =>
                navigate({
                  to: "/player/general/$playerName/$editionName",
                  params: { playerName: player.name, editionName: edition?.name ?? "" },
                })
              }
            >
              <td>{player.id}</td>
              <td>
                <img className="table_profile_image" src={playerImageUrl(player)} />
              </td>
              <td>{player.name}</td>
              <td>
                {relation.goals} <img src="/static/images/goal.png" width="18" height="18" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
