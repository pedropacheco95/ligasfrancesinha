CREATE TABLE public.leagues (
  id integer PRIMARY KEY,
  name text NOT NULL,
  picture text
);

CREATE TABLE public.editions (
  id integer PRIMARY KEY,
  name text NOT NULL,
  time text,
  final_game text,
  has_ended boolean NOT NULL DEFAULT false,
  goal_value double precision,
  number_of_teams_made integer,
  league_id integer REFERENCES public.leagues(id) ON DELETE CASCADE,
  last_team text
);

CREATE TABLE public.players (
  id integer PRIMARY KEY,
  name text NOT NULL,
  full_name text,
  birthday text,
  image_url text
);

CREATE TABLE public.games (
  id integer PRIMARY KEY,
  goals_team1 integer,
  goals_team2 integer,
  date text,
  winner integer,
  matchweek integer NOT NULL DEFAULT 1,
  played boolean NOT NULL DEFAULT false,
  edition_id integer REFERENCES public.editions(id) ON DELETE CASCADE
);

CREATE TABLE public.players_in_game (
  id integer PRIMARY KEY,
  player_id integer REFERENCES public.players(id) ON DELETE CASCADE,
  game_id integer REFERENCES public.games(id) ON DELETE CASCADE,
  team text NOT NULL,
  goals integer
);

CREATE TABLE public.players_in_edition (
  id integer PRIMARY KEY,
  player_id integer REFERENCES public.players(id) ON DELETE CASCADE,
  edition_id integer REFERENCES public.editions(id) ON DELETE CASCADE,
  place integer,
  last_place integer,
  points double precision,
  appearances integer,
  goals integer,
  percentage_of_appearances double precision,
  wins integer,
  draws integer,
  losts integer,
  goals_scored_by_team integer,
  goals_suffered_by_team integer,
  matchweek integer
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leagues TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.editions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players_in_game TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players_in_edition TO anon, authenticated;
GRANT ALL ON public.leagues, public.editions, public.players, public.games, public.players_in_game, public.players_in_edition TO service_role;

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players_in_game ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players_in_edition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read leagues" ON public.leagues FOR SELECT USING (true);
CREATE POLICY "public write leagues" ON public.leagues FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read editions" ON public.editions FOR SELECT USING (true);
CREATE POLICY "public write editions" ON public.editions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read players" ON public.players FOR SELECT USING (true);
CREATE POLICY "public write players" ON public.players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read games" ON public.games FOR SELECT USING (true);
CREATE POLICY "public write games" ON public.games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read players_in_game" ON public.players_in_game FOR SELECT USING (true);
CREATE POLICY "public write players_in_game" ON public.players_in_game FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read players_in_edition" ON public.players_in_edition FOR SELECT USING (true);
CREATE POLICY "public write players_in_edition" ON public.players_in_edition FOR ALL USING (true) WITH CHECK (true);