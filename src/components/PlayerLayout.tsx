import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Layout } from "@/components/Layout";
import { playerAge, playerImageUrl, type Edition, type Player } from "@/lib/domain";

/** `templates/players/layout.html` — profile header plus the three sub-views. */
export function PlayerLayout({
  player,
  edition,
  children,
}: {
  player: Player;
  /** Only `general` passes an edition; the others fall back to the last one. */
  edition?: Edition | null;
  children: ReactNode;
}) {
  const age = playerAge(player);
  const homeEditionName =
    edition?.name ??
    player.editionsRelations[player.editionsRelations.length - 1]?.edition?.name ??
    "";

  return (
    <Layout>
      <div className="table_container">
        <div style={{ backgroundColor: "rgb(255, 255, 255)" }}>
          <div>
            <table
              className="table table-borderless"
              cellSpacing={0}
              cellPadding={0}
              style={{ display: "flex" }}
            >
              <tbody>
                <tr>
                  <td rowSpan={2}>
                    <div className="image profile_picture">
                      <img src={playerImageUrl(player)} />
                    </div>
                  </td>
                  <td colSpan={3}>
                    <h1 style={{ float: "left" }}>
                      <span className="id" style={{ color: "rgb(0, 0, 0)" }}>
                        {player.id}.
                      </span>{" "}
                      <span
                        className="name"
                        style={{ color: "rgb(0, 0, 0)", fontWeight: "bold" }}
                      >
                        {player.name}
                      </span>
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td>
                    <a href="https://pt.wikipedia.org/wiki/Portugal">
                      <img
                        className="tiny_flag_image"
                        src="/static/images/Bandeira-PT.png"
                        width="18"
                        height="12"
                        alt="Portugal"
                        title="Portugal"
                        style={{ verticalAlign: "middle", marginTop: "0px" }}
                      />
                    </a>
                  </td>
                  {player.fullName ? (
                    <td className="optional">
                      <div className="text">• {player.fullName}</div>
                    </td>
                  ) : null}
                  {age ? (
                    <td>
                      <div className="text">• {age} anos</div>
                    </td>
                  ) : null}
                  <td>
                    <div className="text">
                      <a href="https://pt.wikipedia.org/wiki/Portugal">• Portugal</a>
                    </div>
                  </td>
                  <td className="optional">
                    <div className="text">• Futebol</div>
                  </td>
                </tr>
              </tbody>
            </table>
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
            <div className="collapse navbar-collapse" id="player_navbar">
              <ul className="navbar-nav mr-auto mt-2" style={{ width: "100%" }}>
                <li className="nav-item" style={{ width: "33%" }}>
                  <Link
                    className="nav-link"
                    to="/player/general/$playerName/$editionName"
                    params={{ playerName: player.name, editionName: homeEditionName }}
                  >
                    Página inicial
                  </Link>
                </li>
                <li className="nav-item" style={{ width: "33%" }}>
                  <Link
                    className="nav-link"
                    to="/player/games_played/$playerName"
                    params={{ playerName: player.name }}
                  >
                    Jogos realizados
                  </Link>
                </li>
                <li className="nav-item" style={{ width: "34%" }}>
                  <Link
                    className="nav-link"
                    to="/player/all_editions/$playerName"
                    params={{ playerName: player.name }}
                  >
                    Todas as épocas
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
