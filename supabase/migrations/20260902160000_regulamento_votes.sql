-- Voting on the statutes, from the site instead of the group.
--
-- Three tables, one per thing a player can do on /regulamento: vote on an open
-- point, disagree with a rule that is already settled, and propose something.
-- The voter is a name, not an account -- the app has no real auth, the league
-- is fourteen people who know each other, and asking for a login is what kept
-- turnout down when the vote lived in WhatsApp.
--
-- `choice` stores the option's text rather than its index: the options are
-- edited in `src/data/regulamento.json` between rounds (B1 gained a third one),
-- and an index would silently relabel every vote already cast.

CREATE TABLE public.regulamento_votes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  point_id TEXT NOT NULL,
  voter TEXT NOT NULL,
  choice TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One vote per person per point; voting again replaces the previous answer.
  UNIQUE (point_id, voter)
);

CREATE TABLE public.regulamento_objections (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rule_id TEXT NOT NULL,
  voter TEXT NOT NULL,
  reason TEXT NOT NULL,
  proposal TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  -- Deliberately no uniqueness: one person may object to as many rules as they
  -- like, and may come back to the same rule with a second argument.
);

CREATE TABLE public.regulamento_proposals (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- The open point this answers, or NULL for an idea that is nobody's point yet.
  point_id TEXT,
  voter TEXT NOT NULL,
  proposal TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX regulamento_votes_point_idx ON public.regulamento_votes (point_id);
CREATE INDEX regulamento_objections_rule_idx ON public.regulamento_objections (rule_id);
CREATE INDEX regulamento_proposals_point_idx ON public.regulamento_proposals (point_id);

-- The same open policies the league tables already carry. There is no auth to
-- attach a stricter policy to, so this is access control in name only: anyone
-- with the publishable key can read and write these rows.
ALTER TABLE public.regulamento_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulamento_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulamento_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read regulamento_votes" ON public.regulamento_votes FOR SELECT USING (true);
CREATE POLICY "public write regulamento_votes" ON public.regulamento_votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read regulamento_objections" ON public.regulamento_objections FOR SELECT USING (true);
CREATE POLICY "public write regulamento_objections" ON public.regulamento_objections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public read regulamento_proposals" ON public.regulamento_proposals FOR SELECT USING (true);
CREATE POLICY "public write regulamento_proposals" ON public.regulamento_proposals FOR ALL USING (true) WITH CHECK (true);
