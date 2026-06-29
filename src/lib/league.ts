export type Player = { id: string; name: string };

export type Match = {
  id: string;
  date: string; // ISO date
  teamA: string[]; // player ids
  teamB: string[];
  result: "A" | "B" | "D" | null;
};

export type Store = {
  players: Player[];
  matches: Match[];
};

const KEY = "ligasfrancesinha:v1";

const DEFAULT_PLAYERS = [
  "Player 1","Player 2","Player 3","Player 4","Player 5","Player 6","Player 7",
  "Player 8","Player 9","Player 10","Player 11","Player 12","Player 13","Player 14",
];

export function loadStore(): Store {
  if (typeof window === "undefined") return { players: [], matches: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const store: Store = {
    players: DEFAULT_PLAYERS.map((name, i) => ({ id: `p${i + 1}`, name })),
    matches: [],
  };
  saveStore(store);
  return store;
}

export function saveStore(s: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Standing = {
  player: Player;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
};

export function computeStandings(store: Store): Standing[] {
  const map = new Map<string, Standing>();
  for (const p of store.players) {
    map.set(p.id, { player: p, played: 0, wins: 0, draws: 0, losses: 0, points: 0 });
  }
  for (const m of store.matches) {
    if (!m.result) continue;
    const apply = (ids: string[], outcome: "W" | "L" | "D") => {
      for (const id of ids) {
        const s = map.get(id);
        if (!s) continue;
        s.played += 1;
        if (outcome === "W") { s.wins += 1; s.points += 3; }
        else if (outcome === "D") { s.draws += 1; s.points += 1; }
        else { s.losses += 1; s.points += 1; }
      }
    };
    if (m.result === "D") {
      apply(m.teamA, "D"); apply(m.teamB, "D");
    } else if (m.result === "A") {
      apply(m.teamA, "W"); apply(m.teamB, "L");
    } else {
      apply(m.teamB, "W"); apply(m.teamA, "L");
    }
  }
  return [...map.values()].sort((a, b) =>
    b.points - a.points || b.wins - a.wins || a.player.name.localeCompare(b.player.name)
  );
}
