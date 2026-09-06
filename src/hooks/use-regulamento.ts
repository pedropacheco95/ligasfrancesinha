import { useCallback, useEffect, useState } from "react";

import { useDataset } from "@/hooks/use-app-data";
import { fetchRegulamentoActivity, type RegulamentoActivity } from "@/lib/db";
import type { Edition, Player } from "@/lib/domain";

/** The MasterLeague, which is the league whose statutes these are. */
const MASTER_LEAGUE_ID = 1;

const EMPTY: RegulamentoActivity = {
  votes: [],
  objections: [],
  proposals: [],
  available: false,
};

/**
 * Votes, objections and proposals, fetched once the page has mounted.
 *
 * The server render has no database, and `store.ts` already established that
 * the seeded JSON carries the first paint while the real rows arrive after
 * hydration. Nothing here is seeded, so the tallies simply appear.
 */
export function useRegulamentoActivity() {
  const [activity, setActivity] = useState<RegulamentoActivity>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchRegulamentoActivity();
    setActivity(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { activity, loading, refresh };
}

const VOTER_KEY = "regulamento.voter";

/**
 * Who is voting, remembered between visits.
 *
 * There is no auth in this app and adding one for fourteen people who know
 * each other would cost more turnout than it buys honesty — the vote used to
 * live in WhatsApp precisely because everybody was already there. So the voter
 * picks their own name and the browser remembers it.
 */
export function useVoter(): [string, (name: string) => void] {
  const [voter, setVoter] = useState("");

  useEffect(() => {
    try {
      setVoter(window.localStorage.getItem(VOTER_KEY) ?? "");
    } catch {
      // Storage can be refused outright; the picker just starts empty.
    }
  }, []);

  const choose = useCallback((name: string) => {
    setVoter(name);
    try {
      window.localStorage.setItem(VOTER_KEY, name);
    } catch {
      // Not remembering the name is survivable; voting still works.
    }
  }, []);

  return [voter, choose];
}

/**
 * The MasterLeague edition currently being played, or the most recent one.
 *
 * Editions are closed by hand when a season ends, so "the one running" is the
 * last open one; falling back to the newest keeps the pages working in the gap
 * between closing a season and opening the next.
 */
export function useEdicaoAtual(): Edition | null {
  const dataset = useDataset();

  const edicoes = dataset.editions
    .filter((edition) => edition.leagueId === MASTER_LEAGUE_ID)
    .sort((a, b) => a.id - b.id);

  return [...edicoes].reverse().find((edition) => !edition.hasEnded) ?? edicoes.at(-1) ?? null;
}

/** The current squad as players, in the order the edition lists them. */
export function usePlantel(): Player[] {
  const edicao = useEdicaoAtual();

  return (edicao?.playersRelations ?? [])
    .map((relation) => relation.player)
    .filter((player): player is Player => player !== null);
}

/**
 * The squad that can vote: the players signed up to the MasterLeague edition
 * currently running, rather than everyone who ever played.
 */
export function useSquad(): string[] {
  const names = usePlantel().map((player) => player.name);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, "pt"));
}
