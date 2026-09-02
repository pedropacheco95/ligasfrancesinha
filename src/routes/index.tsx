import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CountdownTimer } from "@/components/CountdownTimer";
import { GamesCarousel } from "@/components/GamesCarousel";
import { Layout } from "@/components/Layout";
import { NewsCard } from "@/components/NewsCard";
import { StandingsTable } from "@/components/StandingsTable";
import { articles } from "@/data/news";
import { useDataset } from "@/hooks/use-app-data";
import { leagueImageUrl, nextGameDatetime } from "@/lib/domain";

import newsCss from "@/styles/news.css?url";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "Ligas Francesinha" }],
    links: [{ rel: "stylesheet", href: newsCss }],
  }),
  component: IndexPage,
});

/** `modules/main.py::index` rendering `main/index.html`. */
function IndexPage() {
  const dataset = useDataset();
  // `Game.query.order_by(Game.id.desc()).limit(5)`
  const lastGames = [...dataset.games].sort((a, b) => b.id - a.id).slice(0, 5);
  // `[league.editions[-1] for league in leagues]`
  const editions = dataset.leagues
    .map((league) => league.editions[league.editions.length - 1])
    .filter((edition) => edition !== undefined);

  // `showTab` toggles `active` on every `.table_tab` and `.table_standings`
  // at once, which flips both the tab and its table in one go.
  const [swapped, setSwapped] = useState(false);

  return (
    <Layout>
      <div className="index">
        <GamesCarousel games={lastGames} />
        <div className="tables_section">
          <div className="tables_container">
            <div className="tabs_container">
              <div
                className={swapped ? "table_tab" : "table_tab active"}
                onClick={() => setSwapped(false)}
              >
                {" "}
                Master League{" "}
              </div>
              <div
                className={swapped ? "table_tab active" : "table_tab"}
                onClick={() => setSwapped(true)}
              >
                {" "}
                Tuesday League{" "}
              </div>
            </div>
            {editions.map((edition, position) => {
              const active = position === 0 ? !swapped : swapped;
              return (
                <div
                  key={edition.id}
                  id={edition.league?.name}
                  className={active ? "table_standings active" : "table_standings"}
                >
                  <CountdownTimer targetDatetime={nextGameDatetime(edition)} />
                  <table width="100%" cellSpacing={0} cellPadding={0}>
                    <tbody>
                      <tr>
                        <td width="100%" valign="top" className="players_info_container">
                          <div className="smallheader">Classificação</div>
                          <div className="table_header_logo">
                            {edition.league ? (
                              <img src={leagueImageUrl(edition.league)} alt="" />
                            ) : null}
                          </div>
                          <br />
                          <div className="standings_table_container">
                            <StandingsTable edition={edition} descriptive />
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>

        {articles.length > 0 ? (
          <div className="news_section">
            <div className="news_container">
              <div className="news_header">
                <h2>Notícias</h2>
                <span>O que os números andam a dizer</span>
              </div>
              {articles.map((article) => (
                <NewsCard key={article.slug} article={article} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Layout>
  );
}
