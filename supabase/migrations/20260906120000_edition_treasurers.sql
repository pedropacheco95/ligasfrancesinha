-- One treasurer per edition, drawn once.
--
-- `edition_id` is the primary key, so a second draw for the same edition is a
-- unique violation rather than a second row. That is the point: the draw page
-- can be reloaded and the button pressed again, and it will keep showing the
-- same name because the database will not accept another one. Re-drawing means
-- deleting the row on purpose, which is a deliberate act and not a click.
--
-- The history the group already has is seeded here, so the page can work out
-- who is out of the hat instead of carrying a hand-written list.

CREATE TABLE public.edition_treasurers (
  edition_id INTEGER PRIMARY KEY REFERENCES public.editions(id) ON DELETE CASCADE,
  player_id INTEGER NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  drawn_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX edition_treasurers_player_idx ON public.edition_treasurers (player_id);

-- 1ª, 2ª and 3ª MasterLeague: Pacheco. 4ª: Bernardo Castro. 5ª: Fragoso.
-- 6ª: Kiko TM. Each one verified to have been in that edition's squad.
INSERT INTO public.edition_treasurers (edition_id, player_id) VALUES
  (1, 1),
  (5, 1),
  (7, 1),
  (8, 30),
  (10, 9),
  (12, 8);

-- The same open policies the rest of the schema carries. There is no auth to
-- attach anything stricter to; the guarantee here is the primary key, not RLS.
ALTER TABLE public.edition_treasurers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read edition_treasurers" ON public.edition_treasurers FOR SELECT USING (true);
CREATE POLICY "public write edition_treasurers" ON public.edition_treasurers FOR ALL USING (true) WITH CHECK (true);
