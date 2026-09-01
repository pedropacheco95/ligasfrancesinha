import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { logout } from "@/lib/store";

export const Route = createFileRoute("/auth/logout")({
  component: LogoutPage,
});

/**
 * `modules/auth.py::logout` — clears the session and returns to the index.
 *
 * The session lives in localStorage, so this has to run on the client. Doing it
 * in `beforeLoad` would clear a server-side copy and leave the browser's own
 * session untouched on a full page load.
 */
function LogoutPage() {
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate({ to: "/", replace: true });
  }, [navigate]);

  return null;
}
