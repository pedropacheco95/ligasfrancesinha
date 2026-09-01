import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Layout } from "@/components/Layout";
import type { Edition, League } from "@/lib/domain";

export type ScoresView = "table" | "games" | "scorers" | "create_teams";

/**
 * `templates/scores/layout.html`. The edition dropdown posts to
 * `api.choose_new_edition_scores`, which looks the edition up by name and
 * bounces through `scores.index` to the same view — so it resolves to a plain
 * navigation to `/scores/<view>/<leagueId>/<editionId>`.
 */
export function ScoresLayout({
  league,
  edition,
  view,
  children,
}: {
  league: League;
  edition: Edition;
  view: ScoresView;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const editionParams = { leagueId: String(league.id), editionId: String(edition.id) };

  return (
    <Layout>
      <div className="table_container">
        <div className="scores_header" style={{ backgroundColor: "rgb(255, 255, 255)" }}>
          <div>
            <div>
              <h1>
                <span className="name" style={{ color: "rgb(0, 0, 0)" }}>
                  {edition.name}
                </span>
              </h1>
            </div>
            <div>
              <form>
                <select
                  className="custom-select my-1 mr-sm-2"
                  name="edicao"
                  id="edicao"
                  style={{ width: "80%" }}
                  value={edition.name}
                  onChange={(event) => {
                    const chosen = league.editions.find((e) => e.name === event.target.value);
                    if (!chosen) return;
                    navigate({
                      to: `/scores/${view}/$leagueId/$editionId`,
                      params: {
                        leagueId: String(chosen.league?.id ?? league.id),
                        editionId: String(chosen.id),
                      },
                    });
                  }}
                >
                  {league.editions.map((stepEdition) => (
                    <option key={stepEdition.id} value={stepEdition.name}>
                      {" "}
                      {stepEdition.name}{" "}
                    </option>
                  ))}
                </select>
              </form>
            </div>
          </div>

          <nav className="navbar navbar-expand-md navbar-light bg-light border">
            <button
              aria-controls="navbar"
              aria-expanded="false"
              aria-label="Toggle navigation"
              className="navbar-toggler"
              type="button"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="scores_navbar" data-name="scores_navbar">
              <ul className="navbar-nav mr-auto mt-2" style={{ width: "100%" }}>
                <li className="nav-item" style={{ width: "25%" }}>
                  <Link
                    activeProps={{ className: "" }}
                    className="nav-link"
                    to="/scores/table/$leagueId/$editionId"
                    params={editionParams}
                  >
                    Tabela
                  </Link>
                </li>
                <li className="nav-item" style={{ width: "25%" }}>
                  <Link
                    activeProps={{ className: "" }}
                    className="nav-link"
                    to="/scores/games/$leagueId/$editionId"
                    params={editionParams}
                  >
                    Jogos
                  </Link>
                </li>
                <li className="nav-item" style={{ width: "25%" }}>
                  <Link
                    activeProps={{ className: "" }}
                    className="nav-link"
                    to="/scores/scorers/$leagueId/$editionId"
                    params={editionParams}
                  >
                    Melhores marcadores
                  </Link>
                </li>
                <li className="nav-item" style={{ width: "25%" }}>
                  <Link
                    activeProps={{ className: "" }}
                    className="nav-link"
                    to="/scores/create_teams/$leagueId/$editionId"
                    params={editionParams}
                  >
                    Criar Equipas
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        {children}
      </div>
    </Layout>
  );
}
