import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { FormEvent } from "react";

import { Layout } from "@/components/Layout";
import { TextInput } from "@/components/FrontendInputs";
import { login } from "@/lib/store";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Log In" }] }),
  component: LoginPage,
});

/**
 * `modules/auth.py::login` rendering `auth/login.html`.
 *
 * Flask checks a Werkzeug password hash stored in SQLite. Those hashes are not
 * shipped with this port, so it accepts the admin account that
 * `sql_db.init_db` seeds in source and rejects everything else. A rejected
 * login re-renders the form, matching Flask — whose `flash(error)` is never
 * displayed because `layout.html` renders no flash block.
 */
function LoginPage() {
  const navigate = useNavigate();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("username") === "admin" && form.get("password") === "admin") {
      login("admin");
      navigate({ to: "/" });
    }
    // Otherwise fall through and re-render the empty form, as Flask does.
  };

  return (
    <Layout>
      <div className="login_page">
        <div className="login_block l-grid">
          <div className="login_container">
            <div className="inner_login_container">
              <form method="post" className="login_form" autoComplete="off" onSubmit={onSubmit}>
                <div className="form-group">
                  <TextInput label="Username" name="username" required />
                </div>
                <div className="form-group">
                  <TextInput label="Password" name="password" type="password" required />
                </div>
                <button className="btn btn-primary submit_button" type="submit">
                  Login
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
