import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment } from "react";

import { Layout } from "@/components/Layout";
import { useDataset } from "@/hooks/use-app-data";
import { gamesWon, playerGoals, playerImageUrl } from "@/lib/domain";

export const Route = createFileRoute("/players")({
  head: () => ({ meta: [{ title: "Ligas Francesinha" }] }),
  component: PlayersPage,
});

/**
 * `modules/main.py::players` rendering `main/players.html`. Players are sorted
 * by career wins, descending; ties keep database id order because both Python's
 * and JavaScript's sorts are stable.
 */
function PlayersPage() {
  const dataset = useDataset();
  const players = [...dataset.players].sort((a, b) => gamesWon(b).length - gamesWon(a).length);

  return (
    <Layout>
      <div className="player_list_container">
        <br />
        <div className="players_ranking">
          <div className="ranking_block">
            <ul className="player_cards_container">
              {players.map((player, position) => (
                <li className="player_card_container" key={player.id}>
                  <Link
                    activeProps={{ className: "" }}
                    to="/player/general/$playerName"
                    params={{ playerName: player.name }}
                  >
                    <div className="player_card">
                      <div className="player_card_header">
                        <div className="player_details">
                          <div className="player_position">{position + 1}</div>
                          <div className="player_card__name">
                            {player.name.split(" ").map((word, index) => (
                              <Fragment key={`${word}-${index}`}>
                                {word}
                                <br />
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="player_card_image">
                          <div className="player_image">
                            <img className="table_profile_image" src={playerImageUrl(player)} />
                          </div>
                        </div>
                      </div>
                      <div className="player_card_footer">
                        <div> Jogos: {player.gamesRelations.length}</div>
                        <div> Vitórias: {gamesWon(player).length}</div>
                        <div> Golos: {playerGoals(player)}</div>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}
