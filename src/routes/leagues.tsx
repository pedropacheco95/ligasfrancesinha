import { createFileRoute, Link } from "@tanstack/react-router";

import { Layout } from "@/components/Layout";
import { useDataset } from "@/hooks/use-app-data";
import { leagueImageUrl } from "@/lib/domain";

export const Route = createFileRoute("/leagues")({
  head: () => ({ meta: [{ title: "Ligas Francesinha" }] }),
  component: LeaguesPage,
});

/** `modules/main.py::leagues` rendering `main/leagues.html`. */
function LeaguesPage() {
  const dataset = useDataset();

  return (
    <Layout>
      <div className="leagues_container">
        {dataset.leagues.map((league) => (
          <div className="league_container" key={league.id}>
            <Link to="/scores/table/$leagueId" params={{ leagueId: String(league.id) }}>
              <div>
                <img className="league_image" src={leagueImageUrl(league)} />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </Layout>
  );
}
