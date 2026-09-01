import { createFileRoute, redirect } from "@tanstack/react-router";

/** `/create/game` with no edition 302s to the edition picker. */
export const Route = createFileRoute("/create/game/")({
  beforeLoad: () => {
    throw redirect({ to: "/create/choose_edition/$view", params: { view: "game" } });
  },
});
