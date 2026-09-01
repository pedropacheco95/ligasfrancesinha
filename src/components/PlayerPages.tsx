import { Link, useNavigate } from "@tanstack/react-router";

import { ResultSign } from "@/components/ScoresPages";
import {
  goalsOnGame,
  playerEditions,
  resultOnGame,
  type Edition,
  type Game,
  type Player,
  type PlayerEdition,
} from "@/lib/domain";
import { pyFloat, strftimeShort } from "@/lib/format";

/** The Portugal flag cell repeated across every player table. */
function FlagCell() {
  return (
    <div className="image">
      <a href="https://pt.wikipedia.org/wiki/Portugal">
        <img
          src="/static/images/Bandeira-PT.png"
          width="18"
          height="12"
          alt="Portugal"
          title="Portugal"
          style={{ verticalAlign: "middle", marginTop: "0px" }}
        />
      </a>
    </div>
  );
}

/** Header row shared by `players/general.html` and `players/all_editions.html`. */
function StatsHead({ secondColumnOptional }: { secondColumnOptional: boolean }) {
  return (
    <thead style={{ backgroundColor: "rgba(13, 121, 209, 0.493)" }}>
      <tr>
        <th className="optional"></th>
        <th className={secondColumnOptional ? "optional" : undefined}></th>
        <th className="not_optional" name="Pontos">
          Pontos
        </th>
        <th className="optional">Presenças</th>
        <th className="not_optional" name="Golos">
          Golos
        </th>
        <th className="optional">% Presenças</th>
        <th>V</th>
        <th className="optional">E</th>
        <th>D</th>
      </tr>
    </thead>
  );
}

function StatsCells({ relation }: { relation: PlayerEdition }) {
  return (
    <>
      <td>
        <strong>{pyFloat(relation.points)}</strong>
      </td>
      <td className="optional">{relation.appearances}</td>
      <td>{relation.goals}</td>
      <td className="optional">{pyFloat(relation.percentageOfAppearances)}</td>
      <td>{relation.wins}</td>
      <td className="optional">{relation.draws}</td>
      <td>{relation.losts}</td>
    </>
  );
}

/** One row of the "Jogos" tables. The leading cells differ per view. */
function GameRow({
  player,
  game,
  leading,
  showLeagueBadge,
  badgeOptional = true,
}: {
  player: Player;
  game: Game;
  leading: React.ReactNode;
  showLeagueBadge: boolean;
  badgeOptional?: boolean;
}) {
  const league = game.edition?.league ?? null;

  return (
    <tr>
      {leading}
      <td className="form">
        <ResultSign result={resultOnGame(player, game)} />
      </td>
      <td className="home">
        <a>Branquelas</a>
      </td>
      <td className="result">
        <Link to="/game/$id" params={{ id: String(game.id) }}>
          {" "}
          {game.goalsTeam1} - {game.goalsTeam2}
        </Link>
      </td>
      <td className="away">
        <a>Maregões</a>
      </td>
      <td>
        {goalsOnGame(player, game)} <img src="/static/images/goal.png" width="18" height="18" />
      </td>
      {showLeagueBadge && league ? (
        <td className={badgeOptional ? "double desktop optional" : "double desktop"}>
          <FlagCell />
          <div className="text">
            <Link to="/scores/table/$leagueId" params={{ leagueId: String(league.id) }}>
              {league.name[0]}L
            </Link>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

/* --------------------------------------------------------------- general */

export function GeneralView({
  player,
  edition,
  association,
  games,
}: {
  player: Player;
  edition: Edition;
  association: PlayerEdition | null;
  games: Game[];
}) {
  const navigate = useNavigate();
  const editions = playerEditions(player);

  return (
    <table width="100%" cellSpacing={0} cellPadding={0}>
      <tbody>
        <tr>
          <td className="top_table_header" width="100%" valign="top">
            <div className="smallheader">Resumo</div>
            <br />
            <div style={{ float: "left" }}>
              <form>
                <select
                  className="custom-select my-1 mr-sm-2"
                  name="edicao"
                  id="edicao"
                  value={edition.name}
                  onChange={(event) =>
                    navigate({
                      to: "/player/general/$playerName/$editionName",
                      params: { playerName: player.name, editionName: event.target.value },
                    })
                  }
                >
                  {editions.map((stepEdition) => (
                    <option key={stepEdition.id} value={stepEdition.name}>
                      {" "}
                      {stepEdition.name}{" "}
                    </option>
                  ))}
                </select>
              </form>
            </div>
            <div className="box_container" style={{ width: "95%" }}>
              <table style={{ backgroundColor: "rgba(255, 255, 255, 1)" }} width="100%">
                <StatsHead secondColumnOptional />
                <tbody>
                  <tr>
                    <td className="optional">
                      <FlagCell />
                    </td>
                    <td className="optional">{edition.name}</td>
                    {association ? (
                      <StatsCells relation={association} />
                    ) : (
                      <>
                        <td>
                          <strong>None</strong>
                        </td>
                        <td className="optional">None</td>
                        <td>None</td>
                        <td className="optional">None</td>
                        <td>None</td>
                        <td className="optional">None</td>
                        <td>None</td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </td>
        </tr>
        <tr>
          <td width="100%" valign="top" className="players_info_container">
            <div className="smallheader">Jogos</div>
            <br />
            <div className="box_container">
              <table style={{ backgroundColor: "rgba(255, 255, 255, 1)" }} width="100%">
                <tbody>
                  {games.map((game) => (
                    <GameRow
                      key={game.id}
                      player={player}
                      game={game}
                      showLeagueBadge
                      leading={
                        <>
                          <td className="optional">{strftimeShort(game.date) ?? "Sem data"}</td>
                          <td className="desktop optional">{game.edition?.time}</td>
                          <td className="desktop optional">Jornada {game.matchweek}</td>
                        </>
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------- games played */

export function GamesPlayedView({ player, games }: { player: Player; games: Game[] }) {
  return (
    <table width="100%" cellSpacing={0} cellPadding={0}>
      <tbody>
        <tr>
          <td width="100%" valign="top" className="players_info_container">
            <div className="smallheader">Jogos</div>
            <br />
            <div className="box_container">
              <table style={{ backgroundColor: "rgba(255, 255, 255, 1)" }} width="100%">
                <tbody>
                  {games.map((game) => (
                    <GameRow
                      key={game.id}
                      player={player}
                      game={game}
                      showLeagueBadge
                      badgeOptional={false}
                      leading={
                        <>
                          <td className="optional">{game.edition?.name}</td>
                          <td className="desktop optional">Jornada {game.matchweek}</td>
                        </>
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/* ---------------------------------------------------------- all editions */

export function AllEditionsView({ player }: { player: Player }) {
  return (
    <table width="100%" cellSpacing={0} cellPadding={0}>
      <tbody>
        <tr>
          <td width="100%" valign="top" className="players_info_container">
            <div className="smallheader">Épocas</div>
            <br />
            <div className="box_container">
              <table style={{ backgroundColor: "rgba(255, 255, 255, 1)" }} width="100%">
                <StatsHead secondColumnOptional={false} />
                <tbody>
                  {player.editionsRelations.map((relation) => (
                    <tr key={relation.id}>
                      <td className="optional">
                        <FlagCell />
                      </td>
                      <td>
                        {relation.edition ? (
                          <Link
                            to="/scores/table/$leagueId/$editionId"
                            params={{
                              leagueId: String(relation.edition.league?.id),
                              editionId: String(relation.edition.id),
                            }}
                          >
                            {" "}
                            {relation.edition.name}{" "}
                          </Link>
                        ) : null}
                      </td>
                      <StatsCells relation={relation} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
