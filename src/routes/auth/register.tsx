import { createFileRoute } from "@tanstack/react-router";

/**
 * `modules/auth.py::register` renders `auth/register.html`, which does not
 * exist in the Flask project — the navbar's "Registar" link 500s. Reproduced
 * rather than filled in, so both apps behave the same.
 */
export const Route = createFileRoute("/auth/register")({
  component: () => {
    throw new Error("jinja2.exceptions.TemplateNotFound: auth/register.html");
  },
});
