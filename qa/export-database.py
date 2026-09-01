"""Export the Flask app's SQLite database to the JSON seed files in src/data/.

Re-run this if the original database changes:

    python3 qa/export-database.py ../ligasfrancesinha/ligasfrancesinha/database.db

Rows are emitted ordered by id so that JavaScript's stable sort reproduces
Python's stable sort tie-breaking exactly — standings ties fall back to
insertion order in both.
"""

import json
import os
import sqlite3
import sys

DEFAULT_DB = "../ligasfrancesinha/ligasfrancesinha/database.db"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "data")

TABLES = {
    "leagues": "select id, name, picture from leagues order by id",
    "editions": (
        "select id, name, time, final_game, has_ended, goal_value, "
        "number_of_teams_made, league_id, last_team from editions order by id"
    ),
    "players": "select id, name, full_name, birthday, image_url from players order by id",
    "games": (
        "select id, goals_team1, goals_team2, date, winner, matchweek, played, "
        "edition_id from games order by id"
    ),
    "playersInGame": "select id, player_id, game_id, team, goals from players_in_game order by id",
    "playersInEdition": (
        "select id, player_id, edition_id, place, last_place, points, appearances, "
        "goals, percentage_of_appearances, wins, draws, losts, goals_scored_by_team, "
        "goals_suffered_by_team, matchweek from players_in_edition order by id"
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


def convert(column, value):
    return bool(value) if column in BOOL_COLUMNS else value


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DB
    if not os.path.exists(source):
        raise SystemExit(f"database not found: {source}")

    os.makedirs(OUT, exist_ok=True)
    conn = sqlite3.connect(source)
    conn.row_factory = sqlite3.Row

    for name, query in TABLES.items():
        rows = [
            {CAMEL.get(k, k): convert(k, row[k]) for k in row.keys()}
            for row in conn.execute(query)
        ]
        path = os.path.join(OUT, f"{name}.json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(rows, fh, ensure_ascii=False, indent=1)
        print(f"{name}: {len(rows)} rows -> {os.path.relpath(path)}")

    conn.close()


if __name__ == "__main__":
    main()
