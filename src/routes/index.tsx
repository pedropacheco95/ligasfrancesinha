import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  loadStore,
  saveStore,
  shuffle,
  uid,
  computeStandings,
  type Store,
  type Match,
} from "@/lib/league";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ligas Francesinha" },
      { name: "description", content: "Weekly 7v7 football league with friends — random teams, results and standings." },
      { property: "og:title", content: "Ligas Francesinha" },
      { property: "og:description", content: "Weekly 7v7 football league with friends." },
    ],
  }),
  component: App,
});

type Tab = "match" | "standings" | "players" | "history";

function App() {
  const [store, setStore] = useState<Store>({ players: [], matches: [] });
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>("match");

  useEffect(() => {
    setStore(loadStore());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveStore(store);
  }, [store, hydrated]);

  if (!hydrated) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-[var(--color-pitch)] text-white">
        <div className="mx-auto max-w-5xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ball />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ligas Francesinha</h1>
              <p className="text-xs opacity-80">Weekly 7v7 with the lads</p>
            </div>
          </div>
          <div className="text-right text-xs opacity-80">
            <div>{store.players.length} players</div>
            <div>{store.matches.filter(m => m.result).length} matches played</div>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl px-4 flex gap-1 text-sm">
          {([
            ["match", "This week"],
            ["standings", "Standings"],
            ["history", "History"],
            ["players", "Players"],
          ] as [Tab, string][]).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 rounded-t-md font-medium transition-colors ${
                tab === k ? "bg-background text-foreground" : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {tab === "match" && <MatchTab store={store} setStore={setStore} />}
        {tab === "standings" && <StandingsTab store={store} />}
        {tab === "history" && <HistoryTab store={store} setStore={setStore} />}
        {tab === "players" && <PlayersTab store={store} setStore={setStore} />}
      </main>

      <footer className="text-center text-xs text-muted-foreground py-6">
        Win = 3 pts · Draw / Played = 1 pt
      </footer>
    </div>
  );
}

function Ball() {
  return (
    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-xl">
      ⚽
    </div>
  );
}

/* ---------------- Match Tab ---------------- */

function MatchTab({ store, setStore }: { store: Store; setStore: (s: Store) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(store.players.map(p => p.id)));
  const [draft, setDraft] = useState<{ teamA: string[]; teamB: string[] } | null>(null);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
    setDraft(null);
  };

  const generate = () => {
    const ids = shuffle([...selected]);
    const half = Math.ceil(ids.length / 2);
    setDraft({ teamA: ids.slice(0, half), teamB: ids.slice(half) });
  };

  const swap = (id: string) => {
    if (!draft) return;
    if (draft.teamA.includes(id)) {
      setDraft({ teamA: draft.teamA.filter(x => x !== id), teamB: [...draft.teamB, id] });
    } else {
      setDraft({ teamA: [...draft.teamA, id], teamB: draft.teamB.filter(x => x !== id) });
    }
  };

  const save = (result: Match["result"]) => {
    if (!draft) return;
    const match: Match = {
      id: uid(),
      date,
      teamA: draft.teamA,
      teamB: draft.teamB,
      result,
    };
    setStore({ ...store, matches: [match, ...store.matches] });
    setDraft(null);
  };

  const nameOf = (id: string) => store.players.find(p => p.id === id)?.name ?? "?";

  return (
    <div className="space-y-6">
      <section className="bg-card border rounded-xl p-5">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-semibold">Who's playing this week?</h2>
            <p className="text-sm text-muted-foreground">
              {selected.size} selected · pick at least 2
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border rounded-md px-3 py-1.5 text-sm bg-background"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {store.players.map(p => {
            const on = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent"
                }`}
              >
                <span className="opacity-60 mr-1">{on ? "✓" : "○"}</span>
                {p.name}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={generate}
            disabled={selected.size < 2}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 hover:opacity-90"
          >
            🎲 Generate random teams
          </button>
          <button
            onClick={() => setSelected(new Set(store.players.map(p => p.id)))}
            className="px-4 py-2.5 rounded-lg border hover:bg-accent text-sm"
          >
            Select all
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-4 py-2.5 rounded-lg border hover:bg-accent text-sm"
          >
            Clear
          </button>
        </div>
      </section>

      {draft && (
        <section className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <TeamCard
              label="Team A"
              color="var(--color-team-a)"
              ids={draft.teamA}
              nameOf={nameOf}
              onSwap={swap}
            />
            <TeamCard
              label="Team B"
              color="var(--color-team-b)"
              ids={draft.teamB}
              nameOf={nameOf}
              onSwap={swap}
            />
          </div>

          <div className="bg-card border rounded-xl p-5">
            <h3 className="font-semibold mb-3">Record result</h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => save("A")}
                className="px-4 py-3 rounded-lg font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: "var(--color-team-a)" }}
              >
                Team A wins
              </button>
              <button
                onClick={() => save("D")}
                className="px-4 py-3 rounded-lg font-semibold border hover:bg-accent"
              >
                Draw
              </button>
              <button
                onClick={() => save("B")}
                className="px-4 py-3 rounded-lg font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: "var(--color-team-b)" }}
              >
                Team B wins
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={generate}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent"
              >
                Re-shuffle
              </button>
              <button
                onClick={() => save(null)}
                className="text-sm px-3 py-1.5 rounded-md border hover:bg-accent"
              >
                Save without result
              </button>
              <button
                onClick={() => setDraft(null)}
                className="text-sm px-3 py-1.5 rounded-md text-muted-foreground hover:bg-accent ml-auto"
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function TeamCard({
  label, color, ids, nameOf, onSwap,
}: {
  label: string; color: string; ids: string[]; nameOf: (id: string) => string; onSwap: (id: string) => void;
}) {
  return (
    <div className="rounded-xl overflow-hidden border bg-card">
      <div className="px-4 py-3 text-white font-bold flex items-center justify-between" style={{ backgroundColor: color }}>
        <span>{label}</span>
        <span className="text-sm opacity-80">{ids.length} players</span>
      </div>
      <ul className="divide-y">
        {ids.map(id => (
          <li key={id} className="flex items-center justify-between px-4 py-2.5">
            <span>{nameOf(id)}</span>
            <button
              onClick={() => onSwap(id)}
              className="text-xs px-2 py-1 rounded border text-muted-foreground hover:bg-accent"
              title="Swap to other team"
            >
              ⇄
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Standings Tab ---------------- */

function StandingsTab({ store }: { store: Store }) {
  const rows = useMemo(() => computeStandings(store), [store]);
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left">
          <tr>
            <th className="px-4 py-3 w-10">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-3 py-3 text-center">P</th>
            <th className="px-3 py-3 text-center">W</th>
            <th className="px-3 py-3 text-center">D</th>
            <th className="px-3 py-3 text-center">L</th>
            <th className="px-4 py-3 text-right">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.player.id} className="border-t">
              <td className="px-4 py-3">
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0 ? "bg-[var(--color-gold)] text-black" :
                  i < 3 ? "bg-accent" : "text-muted-foreground"
                }`}>{i + 1}</span>
              </td>
              <td className="px-4 py-3 font-medium">{r.player.name}</td>
              <td className="px-3 py-3 text-center">{r.played}</td>
              <td className="px-3 py-3 text-center">{r.wins}</td>
              <td className="px-3 py-3 text-center">{r.draws}</td>
              <td className="px-3 py-3 text-center">{r.losses}</td>
              <td className="px-4 py-3 text-right font-bold">{r.points}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No players yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- History Tab ---------------- */

function HistoryTab({ store, setStore }: { store: Store; setStore: (s: Store) => void }) {
  const nameOf = (id: string) => store.players.find(p => p.id === id)?.name ?? "?";

  const remove = (id: string) => {
    if (!confirm("Delete this match?")) return;
    setStore({ ...store, matches: store.matches.filter(m => m.id !== id) });
  };

  const setResult = (id: string, result: Match["result"]) => {
    setStore({ ...store, matches: store.matches.map(m => m.id === id ? { ...m, result } : m) });
  };

  if (store.matches.length === 0) {
    return <p className="text-center text-muted-foreground py-10">No matches yet. Generate teams in "This week".</p>;
  }

  return (
    <div className="space-y-3">
      {store.matches.map(m => (
        <div key={m.id} className="bg-card border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium">{new Date(m.date).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
            <button onClick={() => remove(m.id)} className="text-xs text-destructive hover:underline">Delete</button>
          </div>
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className={`rounded-lg p-3 ${m.result === "A" ? "ring-2 ring-[var(--color-team-a)]" : ""}`} style={{ backgroundColor: "var(--color-team-a)", color: "white" }}>
              <div className="text-xs uppercase opacity-80 mb-1">Team A</div>
              <ul className="text-sm">{m.teamA.map(id => <li key={id}>{nameOf(id)}</li>)}</ul>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {m.result === "A" ? "A" : m.result === "B" ? "B" : m.result === "D" ? "=" : "—"}
              </div>
              <div className="flex gap-1 mt-2 justify-center">
                {(["A","D","B",null] as Match["result"][]).map(r => (
                  <button
                    key={String(r)}
                    onClick={() => setResult(m.id, r)}
                    className={`text-xs px-2 py-1 rounded border ${m.result === r ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
                  >
                    {r === "A" ? "A" : r === "B" ? "B" : r === "D" ? "Draw" : "—"}
                  </button>
                ))}
              </div>
            </div>
            <div className={`rounded-lg p-3 ${m.result === "B" ? "ring-2 ring-[var(--color-team-b)]" : ""}`} style={{ backgroundColor: "var(--color-team-b)", color: "white" }}>
              <div className="text-xs uppercase opacity-80 mb-1">Team B</div>
              <ul className="text-sm">{m.teamB.map(id => <li key={id}>{nameOf(id)}</li>)}</ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Players Tab ---------------- */

function PlayersTab({ store, setStore }: { store: Store; setStore: (s: Store) => void }) {
  const [name, setName] = useState("");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    setStore({ ...store, players: [...store.players, { id: uid(), name: n }] });
    setName("");
  };

  const rename = (id: string, newName: string) => {
    setStore({ ...store, players: store.players.map(p => p.id === id ? { ...p, name: newName } : p) });
  };

  const remove = (id: string) => {
    if (!confirm("Remove this player? Their past matches remain in history.")) return;
    setStore({ ...store, players: store.players.filter(p => p.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border rounded-xl p-4 flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add a player..."
          className="flex-1 border rounded-md px-3 py-2 bg-background"
        />
        <button onClick={add} className="px-4 py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90">
          Add
        </button>
      </div>
      <div className="bg-card border rounded-xl divide-y">
        {store.players.map(p => (
          <div key={p.id} className="flex items-center gap-2 px-4 py-2.5">
            <input
              value={p.name}
              onChange={e => rename(p.id, e.target.value)}
              className="flex-1 bg-transparent outline-none focus:bg-accent rounded px-2 py-1"
            />
            <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:underline">Remove</button>
          </div>
        ))}
        {store.players.length === 0 && (
          <p className="px-4 py-8 text-center text-muted-foreground">No players yet</p>
        )}
      </div>
    </div>
  );
}
