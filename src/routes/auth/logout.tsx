import { createFileRoute, redirect } from "@tanstack/react-router";

import { logout } from "@/lib/store";

/** `modules/auth.py::logout` — clears the session and returns to the index. */
export const Route = createFileRoute("/auth/logout")({
  beforeLoad: () => {
    logout();
    throw redirect({ to: "/" });
  },
});
