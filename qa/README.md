# Parity checks against the Flask app

These scripts compare this React port against the original Flask application
page by page. Use them after changing anything that affects rendering, to
confirm the port still behaves like the app it replaces.

## Setup

Run both apps first — the Flask one on **:5001**, this one on **:5173**:

```sh
# in ../ligasfrancesinha, with the venv described in the root README
.venv311/bin/python run_flask.py     # ASSETS_AUTO_BUILD = False, port 5001

# here
npm run dev
```

The browser-driven scripts need Playwright, which is deliberately not a project
dependency (Lovable would install it on every build):

```sh
npm i --no-save playwright pixelmatch pngjs
```

## The checks

| Script | What it compares |
| --- | --- |
| `compare-text.py` | Rendered text of every page, token by token |
| `compare-geometry.mjs` | Every element's tag, classes and layout box |
| `compare-pixels.mjs` | Full-page screenshots, at desktop and mobile widths |
| `check-interactions.mjs` | Team draws, sign-in, tabs, dropdowns, the create-game form, and the mobile sub-navigations |
| `compare-create-game.mjs` | Creates the same game in both apps and diffs the recalculated standings |
| `check-rounding.mjs` | `pyRound` against Python's `round()`, directly |
| `compare-live-data.mjs` | Flask against the app **after** it swaps the seed for live database rows |

```sh
python3 qa/compare-text.py qa/urls-all.txt        # all 677 pages
node qa/compare-geometry.mjs qa/urls-sample.txt
node qa/compare-pixels.mjs qa/urls-sample.txt
node qa/check-interactions.mjs
node --experimental-strip-types qa/check-rounding.mjs   # needs no servers
node qa/compare-live-data.mjs qa/urls-sample.txt        # exercises Supabase
```

`compare-live-data.mjs` is the only check that exercises the database. The other
comparisons read the server-rendered HTML, which is built from the JSON seed —
so a bug that only affects rows fetched at runtime is invisible to them. It
should report **30/30**.

`urls-all.txt` covers every player, edition, game and view. `urls-sample.txt` is
a 30-page subset for the slower browser-driven checks, chosen for edge cases:
accented and single-word player names, players with no `full_name` or
`birthday`, a historical edition, and both leagues.

## Reading the results

`compare-text.py` should report **676/677**, `compare-geometry.mjs` **29/30**,
and `check-interactions.mjs` **29/29**. The one page that no longer matches is
`/`: it carries a news block below the standings that the Flask app never had.
Every other page is still expected to be identical. `check-rounding.mjs` should report
**59990/59990** — it is the one check that needs neither app running.

Rounding gets its own script because the page comparison cannot catch a
regression there: the values that expose the difference between Python's
`round()` and a naive implementation (goals per appearance at 40 or 80
appearances) are not in the current data, so every page would still match while
the helper was quietly wrong.

`compare-pixels.mjs` reports about 53/60 identical — the home page is two of
those, at both widths, for the news block. The handful that differ are
the longest pages — the games and "jogos realizados" listings — where React's server rendering splits
interpolated text into several nodes; each run is then shaped and rounded
independently, which shifts glyphs by a fraction of a pixel. Geometry comparison
ignores anything under half a pixel for the same reason. If a page jumps well
above 0.2%, that is a real regression — the script writes a `.diff.png` next to
the screenshots in `qa/shots/` showing exactly which pixels moved.

## Caution

`compare-create-game.mjs` **writes to the Flask database**. Back it up first and
restore it afterwards:

```sh
cp ../ligasfrancesinha/ligasfrancesinha/database.db /tmp/database.backup.db
node qa/compare-create-game.mjs
cp /tmp/database.backup.db ../ligasfrancesinha/ligasfrancesinha/database.db
```

Posting the team-draw form (`/scores/create_teams`) also writes: it bumps
`number_of_teams_made` and rewrites `last_team`, which changes the starting
line-up on the create-game page. `check-interactions.mjs` only draws teams in
the React app, so it is safe to re-run.

## Regenerating the seed data

If the Flask database changes, re-export it:

```sh
python3 qa/export-database.py
```

The Flask app must be pointed at the same `database.db` for the comparisons to
mean anything — copy it over `../ligasfrancesinha/ligasfrancesinha/database.db`
(keep a backup) before running them.
