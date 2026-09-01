import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { Layout } from "@/components/Layout";
import { useDataset } from "@/hooks/use-app-data";
import { leagueImageUrl } from "@/lib/domain";

export const Route = createFileRoute("/create/choose_edition/$view")({
  component: ChooseEditionPage,
});

/** `modules/create.py::choose_edition` — only editions still running are offered. */
function ChooseEditionPage() {
  const { view } = Route.useParams();
  const dataset = useDataset();
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="table_container">
        <form method="post" onSubmit={(event) => event.preventDefault()}>
          <div className="leagues_container">
            {dataset.editions
              .filter((edition) => !edition.hasEnded)
              .map((edition) => (
                <div className="league_container" key={edition.id}>
                  <button
                    className="button_image"
                    type="submit"
                    value={edition.name}
                    name="edition_name"
                    id="edition_name"
                    onClick={() =>
                      navigate({
                        to: `/create/${view}/$editionName`,
                        params: { editionName: edition.name },
                      })
                    }
                  >
                    {edition.league ? <img src={leagueImageUrl(edition.league)} /> : null}
                  </button>
                </div>
              ))}
          </div>
        </form>
      </div>
    </Layout>
  );
}
