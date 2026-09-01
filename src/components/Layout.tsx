import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";

import { useCurrentUser } from "@/hooks/use-app-data";

/** `templates/layout.html` — the navbar/footer shell every page extends. */
export function Layout({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <>
      <div className="navbar-fixed-container">
        <div className="navbar">
          <Link activeProps={{ className: "" }} to="/" className="navbar-logo main-logo">
            <img src="/static/images/ligas_francesinha_logo.png" alt="Logo" />
          </Link>

          <div className="navbar-toggle" id="navToggle">
            <div className="navbar_toggle_container">
              <button
                type="button"
                className={navOpen ? "navbar_toggler collapsed" : "navbar_toggler"}
                onClick={() => setNavOpen((open) => !open)}
              >
                <span className="icon_bar"></span>
                <span className="icon_bar"></span>
                <span className="icon_bar"></span>
              </button>
            </div>
          </div>

          <ul className={navOpen ? "navbar-links navbar_links_show" : "navbar-links"}>
            <li>
              <Link activeProps={{ className: "" }} to="/players">
                Players
              </Link>
            </li>
            <li>
              <Link
                activeProps={{ className: "" }}
                to="/scores/table/$leagueId"
                params={{ leagueId: "1" }}
                className="navbar-logo"
              >
                <img src="/static/images/master_logo.png" alt="Logo" />
              </Link>
            </li>
            <li>
              <Link
                activeProps={{ className: "" }}
                to="/scores/table/$leagueId"
                params={{ leagueId: "2" }}
                className="navbar-logo"
              >
                <img src="/static/images/tuesday_logo.png" alt="Logo" />
              </Link>
            </li>
          </ul>

          {/* The `{" "}` between links reproduces the whitespace text node Jinja
              leaves between the two anchors, which the inline layout renders. */}
          <div className="navbar-user">
            {currentUser ? (
              <>
                <Link
                  activeProps={{ className: "" }}
                  to="/create/game"
                  className="navbar-login-link"
                >
                  Criar jogos
                </Link>{" "}
                <Link
                  activeProps={{ className: "" }}
                  to="/auth/logout"
                  className="navbar-login-link"
                >
                  Log Out
                </Link>
              </>
            ) : (
              <>
                <Link
                  activeProps={{ className: "" }}
                  to="/auth/register"
                  className="navbar-login-link"
                >
                  Registar
                </Link>{" "}
                <Link
                  activeProps={{ className: "" }}
                  to="/auth/login"
                  className="navbar-login-link"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="main_block">{children}</main>

      <footer className="footer">
        <a href="https://www.instagram.com/fcporto/" className="social-media-logo">
          <img src="/static/images/instagram.png" alt="Logo" />
        </a>
        <a
          href="https://sicnoticias.pt/mundo/2023-01-10-Privacidade-no-TikTok-um-perigo-para-a-Europa--cbafa2de"
          className="social-media-logo"
        >
          <img src="/static/images/tik-tok.png" alt="Logo" />
        </a>
        <a href="https://www.youtube.com/watch?v=SOqJq_987jw" className="social-media-logo">
          <img src="/static/images/youtube.png" alt="Logo" />
        </a>
      </footer>
    </>
  );
}
