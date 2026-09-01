import { createFileRoute } from "@tanstack/react-router";

/**
 * `modules/auth.py::register` renders `auth/register.html`, which does not exist
 * in the Flask project — the navbar's "Registar" link raises TemplateNotFound
 * and returns a 500. Reproduced rather than filled in, so both apps behave the
 * same. Thrown from `beforeLoad` so the failure happens during the request and
 * the response carries a 500, as Flask's does.
 */
export const Route = createFileRoute("/auth/register")({
  beforeLoad: () => {
    throw new Error("jinja2.exceptions.TemplateNotFound: auth/register.html");
  },
});
