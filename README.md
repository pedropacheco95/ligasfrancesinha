# Ligas Francesinha

A React port of the original Flask application (`../ligasfrancesinha`), built to run
and be edited in [Lovable](https://lovable.dev).

Ligas Francesinha is a weekly 7v7 football league. It tracks two leagues
(MasterLeague and TuesdayLeague) across eleven editions, 54 players and 209
games: standings, results, top scorers, per-player histories, an automatic team
draw and a form for entering each week's result.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7caeeddb-33d1-490c-beea-b461160fea63).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

You need Node.js 20.19+ — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).
Vite 8 will not start on older versions, so if `node -v` reports something
older, switch first:

```sh
nvm use          # reads .nvmrc
npm i
npm run dev
```

## How the port works

The Flask app is a server-rendered Jinja application backed by SQLite. This port
is a self-contained frontend, so there is no backend to run.

**Data.** `ligasfrancesinha/database.db` was exported to `src/data/*.json`, one
file per table, with rows ordered by primary key. That ordering is load-bearing:
Python's sort is stable, so ties in the standings fall back to insertion order,
and JavaScript's sort is stable too — keeping the id order reproduces Flask's
tie-breaking exactly.

**Business logic.** `src/lib/domain.ts` ports the SQLAlchemy model methods
(`Edition.make_teams`, `Edition.update_table`, the `Player.*` aggregates, the
classification sorts). The Flask views render the *stored* aggregate columns of
`players_in_edition` on a normal page load — `update_table` only runs when the
`recalculate` URL segment is present — so this module reads those columns as-is
and recomputes only what the templates compute at render time.

**Number formatting.** `src/lib/format.ts` reproduces how Python and Jinja
stringify values. A Float column holding 100 renders as `100.0`, not `100`, and
Jinja's `|round(n)` is half-to-even because its default method delegates to
Python's `round()`. Every interpolated number goes through these helpers.

**Writes.** Creating a game, drawing teams and signing in all mutate a
localStorage overlay (`src/lib/store.ts`) layered over the immutable seed. The
overlay is empty on a fresh visit, so the server render and the first client
render agree and hydration stays clean.

Because the overlay lives in the browser, changes are local to whoever made
them — they are not shared between people or devices, and they do not reach the
original database. To start over, clear the `ligasfrancesinha:overlay:v1` key in
localStorage (or call `resetOverlay()` from `src/lib/store.ts`).

**Styling.** The pages reuse the original project's compiled SCSS
(`public/static/style/styles_frontend.css`) and Bootstrap 4 verbatim, and the
components keep the original class names, so the port renders identically rather
than approximately. The images, SVGs and fonts are copied under `public/static/`
at the same paths Flask served them from.

### Tailwind

Tailwind is available but **prefixed** — write `tw:flex`, `tw:p-4`, not `flex`
and `p-4`. Its utility names collide with Bootstrap's class names (`collapse`,
`table`, `border`, `mt-2`, `mr-auto`, `my-1`), and an unprefixed build silently
restyles the ported pages; `collapse` in particular sets `visibility: collapse`
and hides the scores and player sub-navigation entirely. Preflight is also not
imported, because its reset restyles the headings, lists and images that the
ported markup relies on Bootstrap to style. See the comment at the top of
`src/styles.css`.

The shadcn components under `src/components/ui/` use unprefixed classes and are
not used by any ported page.

### Faithfully reproduced quirks

These are bugs in the original that the port keeps, so both apps behave the same:

- `/auth/register` returns 500. `modules/auth.py::register` renders
  `auth/register.html`, which does not exist in the Flask project, so the
  navbar's "Registar" link has always been broken.
- Players 50 and 51 have a doubled image path stored in the database
  (`images/Players/default_player.jpg`), which 404s in both apps.
- An unknown player or league id raises an error rather than returning 404,
  because Flask redirects to an `errors` blueprint that is never registered.
- **A rejected game submission silently wipes the form.** `modules/create.py`
  flashes an error and then falls through to the code that renders a fresh page,
  so the line-up returns to the last-team default, the goal boxes empty and the
  date resets. The message itself is never seen, because `layout.html` renders
  no flash block. The port does the same.

### Known differences

- **Sign-in.** Flask checks a Werkzeug password hash stored in SQLite. Those
  hashes are not shipped with this port, so `/auth/login` accepts the `admin`
  account that `sql_db.init_db` seeds in source and rejects everything else. A
  rejected sign-in re-renders the form, which is what Flask does too — its
  `flash(error)` is never displayed, because `layout.html` renders no flash block.
- **The `/editor` backend** (the admin CRUD, kanban and CSV import/export under
  `modules/editor.py` and `modules/api.py`) was out of scope and is not ported.
- **A game you create is only viewable in the browser that created it.** It
  lives in that browser's overlay, so the server render cannot see it. The game
  page waits for hydration before deciding an id is unknown, which means an id
  that genuinely does not exist renders an error page with a 200 rather than
  Flask's 500.
- **`npm run preview` does not work.** The build writes to `.output/` while the
  preview server looks for `dist/server/server.js`. This is a template issue —
  the untouched Lovable scaffold fails the same way — and does not affect
  `npm run dev` or `npm run build`.

## Verifying against the Flask app

Both apps can be run side by side and compared. To run the original:

```sh
cd ../ligasfrancesinha
python3 -m venv .venv311
.venv311/bin/pip install Flask==2.2.5 Werkzeug==2.2.3 Jinja2==3.1.2 MarkupSafe==2.1.3 \
  Flask-SQLAlchemy==2.5.1 SQLAlchemy==1.4.52 Flask-Login==0.6.2 Flask-Session==0.4.0 \
  cachelib==0.9.0 Flask-Assets==2.0 webassets==2.0 Flask-Mail==0.9.1 numpy Unidecode
```

`requirements.txt` pins versions that no longer build on current Python. pyScss
is not needed: `styles_frontend.css` is already compiled, so set
`ASSETS_AUTO_BUILD = False` on the app before serving.

The port was checked against the running Flask app on every page (all 573 URLs:
every player, edition, game and view) for identical rendered text, on sampled
pages for identical element geometry, and on the write paths — both deterministic
team-draw branches and creating a game — for identical results. The interaction
checks run at phone width as well as desktop, because two of the sub-navigations
are only reachable through a toggle below 768px.
