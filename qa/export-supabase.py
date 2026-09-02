"""Export the live cloud database to the JSON seed files in src/data/.

    python3 qa/export-supabase.py

The seed backs the server render and the first client render, so it has to hold
the same rows as the database — otherwise a page shows one thing for a moment
and another once the real rows arrive. Re-run this after any write that did not
come from the app itself (a game added with `npm run add-game`, an edition
edited by hand).

This is the counterpart to `export-database.py`, which reads the Flask app's
SQLite file. Same output, same ordering: rows come back ordered by id so that
JavaScript's stable sort reproduces Python's tie-breaking exactly.

Credentials are read from `.env` (`VITE_SUPABASE_URL`, and the publishable key).
"""

import json
import os
import urllib.parse
import urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "src", "data")

# PostgREST caps a response at 1000 rows, so every table is read in pages.
PAGE = 1000

TABLES = {
    "leagues": ("leagues", "id,name,picture"),
    "editions": (
        "editions",
        "id,name,time,final_game,has_ended,goal_value,number_of_teams_made,league_id,last_team",
    ),
    "players": ("players", "id,name,full_name,birthday,image_url"),
    "games": ("games", "id,goals_team1,goals_team2,date,winner,matchweek,played,edition_id"),
    "playersInGame": ("players_in_game", "id,player_id,game_id,team,goals"),
    "playersInEdition": (
        "players_in_edition",
        "id,player_id,edition_id,place,last_place,points,appearances,goals,"
        "percentage_of_appearances,wins,draws,losts,goals_scored_by_team,"
        "goals_suffered_by_team,matchweek",
    ),
}

CAMEL = {
    "full_name": "fullName",
    "image_url": "imageUrl",
    "final_game": "finalGame",
    "has_ended": "hasEnded",
    "goal_value": "goalValue",
    "number_of_teams_made": "numberOfTeamsMade",
    "league_id": "leagueId",
    "last_team": "lastTeam",
    "goals_team1": "goalsTeam1",
    "goals_team2": "goalsTeam2",
    "edition_id": "editionId",
    "player_id": "playerId",
    "game_id": "gameId",
    "last_place": "lastPlace",
    "percentage_of_appearances": "percentageOfAppearances",
    "goals_scored_by_team": "goalsScoredByTeam",
    "goals_suffered_by_team": "goalsSufferedByTeam",
}

BOOL_COLUMNS = {"has_ended", "played"}

# Float columns in the original SQLAlchemy models. JSON has one number type and
# PostgREST writes an integral float as `39`, but `format.ts` renders these as
# Python does — `39.0` — so they are written back as floats to keep this file
# comparable with what `export-database.py` produces.
FLOAT_COLUMNS = {"points", "percentage_of_appearances", "goal_value"}


def convert(column, value):
    if column in BOOL_COLUMNS:
        return bool(value)
    if column in FLOAT_COLUMNS and value is not None:
        return float(value)
    return value


def read_env():
    env = {}
    with open(os.path.join(ROOT, ".env"), encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip('"').strip("'")
    url = env.get("VITE_SUPABASE_URL") or env.get("SUPABASE_URL")
    key = env.get("VITE_SUPABASE_PUBLISHABLE_KEY") or env.get("SUPABASE_PUBLISHABLE_KEY")
    if not url or not key:
        raise SystemExit(".env is missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY")
    return url.rstrip("/"), key


def fetch(url, key, table, columns):
    rows = []
    while True:
        query = urllib.parse.urlencode({"select": columns, "order": "id"})
        request = urllib.request.Request(f"{url}/rest/v1/{table}?{query}")
        request.add_header("apikey", key)
        request.add_header("Authorization", f"Bearer {key}")
        request.add_header("Range", f"{len(rows)}-{len(rows) + PAGE - 1}")
        with urllib.request.urlopen(request) as response:
            page = json.load(response)
        rows.extend(page)
        if len(page) < PAGE:
            return rows


def main():
    url, key = read_env()
    os.makedirs(OUT, exist_ok=True)

    for name, (table, columns) in TABLES.items():
        rows = [
            {
                CAMEL.get(k, k): convert(k, v)
                for k, v in row.items()
            }
            for row in fetch(url, key, table, columns)
        ]
        path = os.path.join(OUT, f"{name}.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=1)
        print(f"{name}: {len(rows)} rows -> {os.path.relpath(path, ROOT)}")


if __name__ == "__main__":
    main()
