import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PlayerNameForm } from "@/components/PlayerLink";
import { ScoresLayout, type ScoresView } from "@/components/ScoresLayout";
import { StandingsTable } from "@/components/StandingsTable";
import { useDataset } from "@/hooks/use-app-data";
import {
  makeTeams,
  playersRelationsClassificationByGoals,
  BRANQUELAS,
  MAREGOES,
  type Edition,
  type League,
  type Player,
  type TeamName,
} from "@/lib/domain";
import { jinjaRound, pyFloat, strftimeShort } from "@/lib/format";
import { patchEdition } from "@/lib/store";

/** Resolve the URL params the way the Flask views do, or report the 500 it raises. */
export function useScoresContext(leagueId: string, editionId: string) {
  const dataset = useDataset();
  const league = dataset.leagueById.get(Number(leagueId)) ?? null;
  const edition = dataset.editionById.get(Number(editionId)) ?? null;
  return { league, edition };
}

export function ScoresPage({
  leagueId,
  editionId,
  view,
  render,
}: {
  leagueId: string;
  editionId: string;
  view: ScoresView;
  render: (league: League, edition: Edition) => React.ReactNode;
}) {
  const { league, edition } = useScoresContext(leagueId, editionId);
  if (!league || !edition) {
    // Matches the Flask behaviour: an unknown id blows up rather than 404ing.
    throw new Error(`No ${league ? "edition" : "league"} for /scores/${view}/${leagueId}/${editionId}`);
  }
  return (
    <ScoresLayout league={league} edition={edition} view={view}>
      {render(league, edition)}
    </ScoresLayout>
  );
}

/* ---------------------------------------------------------------- table */

export function TableView({ edition }: { edition: Edition }) {
  return (
    <>
      <table width="100%" cellSpacing={0} cellPadding={0}>
        <tbody>
          <tr>
            <td width="100%" valign="top" className="players_info_container">
              <div className="smallheader">Classificação</div>
              <br />
              <div className="box_container">
                <StandingsTable edition={edition} />
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <br />
      <table>
        <tbody>
          <tr>
            <td>
              <div className="square_primeiro"></div>
            </td>
            <td>
              <div style={{ textAlign: "left" }}>&#160;Primeiro lugar</div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="square_vitoria"></div>
            </td>
            <td>
              <div style={{ textAlign: "left" }}>&#160;Recebe uma magnífica Francesinha</div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="square_derrota"></div>
            </td>
            <td>
              <div style={{ textAlign: "left" }}>&#160;Paga uma Francesinha que se Fode</div>
            </td>
          </tr>
          <tr>
            <td>
              <div className="square_ultimo"></div>
            </td>
            <td>
              <div style={{ textAlign: "left" }}>&#160;João Magalhães</div>
            </td>
          </tr>
        </tbody>
      </table>
      {edition.finalGame ? (
        <div>ÚLTIMO JOGO E JANTAR DIA {strftimeShort(edition.finalGame)}</div>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- games */

export function GamesView({ league, edition }: { league: League; edition: Edition }) {
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
                  {edition.games.map((game) => (
                    <tr key={game.id}>
                      <td className="optional">{strftimeShort(game.date) ?? "Sem data"}</td>
                      <td className="desktop optional">{game.edition?.time}</td>
                      <td className="form">
                        <ResultSign result={game.winner ?? 0} />
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
                      <td className="form">
                        <ResultSign result={-(game.winner ?? 0)} />
                      </td>
                      <td className="desktop optional">Jornada {game.matchweek}</td>
                      <td className="double desktop optional">
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
                        <div className="text">
                          <Link to="/scores/table/$leagueId" params={{ leagueId: String(league.id) }}>
                            {league.name[0]}L
                          </Link>
                        </div>
                      </td>
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

/** V / E / D badge; 1 is a win for the side being rendered. */
export function ResultSign({ result }: { result: number }) {
  if (result === 1) return <div className="sign win">V</div>;
  if (result === -1) return <div className="sign lost">D</div>;
  return <div className="sign draw">E</div>;
}

/* -------------------------------------------------------------- scorers */

export function ScorersView({ edition }: { edition: Edition }) {
  const relations = playersRelationsClassificationByGoals(edition);

  return (
    <>
      <table width="100%" cellSpacing={0} cellPadding={0}>
        <tbody>
          <tr>
            <td width="100%" valign="top" className="players_info_container">
              <div className="smallheader">Classificação</div>
              <br />
              <div className="box_container">
                <table
                  className="table-hover"
                  width="100%"
                  cellSpacing={0}
                  cellPadding={0}
                  style={{ backgroundColor: "rgba(255, 255, 255, 1)" }}
                >
                  <thead>
                    <tr>
                      <th></th>
                      <th className="text" name="Jogador">
                        Jogador
                      </th>
                      <th className="not_optional" name="Golos">
                        Golos
                      </th>
                      <th className="not_optional" name="Presenças">
                        Presenças
                      </th>
                      <th className="not_optional" name="Golos/Presença">
                        Golos/Presença
                      </th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map((relation, position) => (
                      <tr
                        key={relation.id}
                        style={
                          position === 0
                            ? { backgroundColor: "rgba(221, 218, 7, 0.493)" }
                            : undefined
                        }
                      >
                        <td>{position + 1}</td>
                        <td className="text">
                          <PlayerNameForm
                            playerName={relation.player?.name ?? ""}
                            editionName={edition.name}
                          />
                        </td>
                        <td>{relation.goals}</td>
                        <td>{relation.appearances}</td>
                        <td>
                          {relation.appearances
                            ? pyFloat(jinjaRound((relation.goals ?? 0) / relation.appearances, 2))
                            : " 0.0 "}
                        </td>
                        <td></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <br />
      <table>
        <tbody>
          <tr>
            <td>
              <div className="square_melhor_marcador"></div>
            </td>
            <td>
              <div style={{ textAlign: "left" }}>&#160;Nadará em cerveja</div>
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

/* --------------------------------------------------------- create teams */

export function CreateTeamsView({ edition }: { edition: Edition }) {
  const [teams, setTeams] = useState<Record<TeamName, Player[]> | null>(null);

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = makeTeams(edition);
    setTeams(result.teams);
    // The Flask model persists the draw before rendering, so the counter shown
    // below already includes this one.
    if (result.drawCounted) {
      patchEdition(edition.id, {
        lastTeam: result.lastTeam,
        numberOfTeamsMade: (edition.numberOfTeamsMade ?? 0) + 1,
      });
    }
  };

  if (teams) {
    return (
      <>
        <table width="100%" cellSpacing={0} cellPadding={0}>
          <tbody>
            <tr>
              <td width="100%" valign="top" className="players_info_container">
                <div className="smallheader">Equipas</div>
                <br />
                <div className="box_container">
                  <table
                    className="table table-borderless"
                    width="100%"
                    cellSpacing={0}
                    cellPadding={0}
                    style={{ backgroundColor: "rgba(255, 255, 255, 1)" }}
                  >
                    <thead>
                      <tr>
                        <th></th>
                        <th>Branquelas</th>
                        <th>Maregões</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {teams[BRANQUELAS].map((player, index) => (
                        <tr key={player.id}>
                          <td></td>
                          <td>{player.name}</td>
                          <td>{teams[MAREGOES][index]?.name}</td>
                          <td></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p> Equipas numero {edition.numberOfTeamsMade}</p>
      </>
    );
  }

  return (
    <table width="100%" cellSpacing={0} cellPadding={0}>
      <tbody>
        <tr>
          <td width="100%" valign="top" className="players_info_container">
            <br />
            <div>
              <form method="post" onSubmit={onSubmit}>
                <button className="btn btn-primary" type="submit">
                  {" "}
                  Fazer Equipas{" "}
                </button>
              </form>
            </div>
            <br />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
