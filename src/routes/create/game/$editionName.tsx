import { createFileRoute, redirect } from "@tanstack/react-router";

import { CreateGameForm } from "@/components/CreateGame";
import { Layout } from "@/components/Layout";
import { useDataset } from "@/hooks/use-app-data";
import { sameText } from "@/lib/format";
import { getServerDataset } from "@/lib/store";

export const Route = createFileRoute("/create/game/$editionName")({
  beforeLoad: ({ params }) => {
    const known = getServerDataset().editions.some((edition) =>
      sameText(edition.name, params.editionName),
    );
    // Flask falls back to the picker when the edition name doesn't resolve.
    if (!known) {
      throw redirect({ to: "/create/choose_edition/$view", params: { view: "game" } });
    }
  },
  component: CreateGamePage,
});

/** `modules/create.py::game`. Public in Flask — the admin decorator sits above
 *  `@bp.route`, so the registered view is the undecorated function. */
function CreateGamePage() {
  const { editionName } = Route.useParams();
  const dataset = useDataset();
  const edition = dataset.editions.find((candidate) => sameText(candidate.name, editionName));
  if (!edition) throw new Error(`No edition named ${editionName}`);

  return (
    <Layout>
      <CreateGameForm edition={edition} />
    </Layout>
  );
}
