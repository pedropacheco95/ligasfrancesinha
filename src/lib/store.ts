/**
 * Client-side cache over the cloud database.
 *
 * The JSON files in `src/data` are still used for the server render and the
 * first client render (they mirror the seeded database), so hydration stays
 * clean. As soon as the app mounts, the real rows are fetched from the
 * database and every mutation is written back to it.
 *
 * The login session is cosmetic (there is no real auth yet), so it stays in
 * localStorage.
 */

import leaguesJson from "@/data/leagues.json";
import editionsJson from "@/data/editions.json";
import playersJson from "@/data/players.json";
import gamesJson from "@/data/games.json";
import playersInGameJson from "@/data/playersInGame.json";
import playersInEditionJson from "@/data/playersInEdition.json";

import {
  buildDataset,
  type Dataset,
  type EditionRow,
  type GameRow,
  type PlayerEditionRow,
  type PlayerGameRow,
  type RawData,
} from "./domain";
import { fetchAllData, insertGame, updateEdition, updatePlayerEditions } from "./db";

const SEED: RawData = {
  leagues: leaguesJson as RawData["leagues"],
  editions: editionsJson as RawData["editions"],
  players: playersJson as RawData["players"],
  games: gamesJson as RawData["games"],
  playersInGame: playersInGameJson as RawData["playersInGame"],
  playersInEdition: playersInEditionJson as RawData["playersInEdition"],
};

export interface Overlay {
  currentUser: string | null;
}

const EMPTY_OVERLAY: Overlay = { currentUser: null };

const STORAGE_KEY = "ligasfrancesinha:session:v1";

let overlay: Overlay = EMPTY_OVERLAY;
let loadedFromStorage = false;
const listeners = new Set<() => void>();

/** The seeded snapshot — the SSR render and the pre-hydration view. */
const seedDataset = buildDataset(SEED);
let raw: RawData = SEED;
let cachedDataset: Dataset = seedDataset;

let loading = false;
let loaded = false;

function emit() {
  for (const listener of listeners) listener();
}

function rebuild() {
  cachedDataset = buildDataset(raw);
  emit();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // Private browsing or a full quota: the session won't survive a reload.
  }
}

function ensureSession() {
  if (loadedFromStorage || typeof window === "undefined") return;
  loadedFromStorage = true;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) overlay = { ...EMPTY_OVERLAY, ...(JSON.parse(stored) as Partial<Overlay>) };
  } catch {
    overlay = EMPTY_OVERLAY;
  }
}

/** Pull every table once, then keep the cache in sync through the mutations below. */
export function ensureLoaded() {
  if (loading || loaded || typeof window === "undefined") return;
  loading = true;
  fetchAllData()
    .then((data) => {
      raw = data;
      loaded = true;
      rebuild();
    })
    .catch((error) => {
      console.error("Failed to load league data", error);
    })
    .finally(() => {
      loading = false;
    });
}

export function refresh(): Promise<void> {
  return fetchAllData()
    .then((data) => {
      raw = data;
      loaded = true;
      rebuild();
    })
    .catch((error) => {
      console.error("Failed to refresh league data", error);
    });
}

export function subscribe(listener: () => void): () => void {
  ensureSession();
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDataset(): Dataset {
  return cachedDataset;
}

export function getServerDataset(): Dataset {
  return seedDataset;
}

export function getOverlay(): Overlay {
  return overlay;
}

export function getServerOverlay(): Overlay {
  return EMPTY_OVERLAY;
}

/* --------------------------------------------------------------- Mutations */

export function nextGameId(): number {
  return raw.games.reduce((max, game) => Math.max(max, game.id), 0) + 1;
}

export function nextPlayerGameId(): number {
  return raw.playersInGame.reduce((max, row) => Math.max(max, row.id), 0) + 1;
}

export function addGame(game: GameRow, relations: PlayerGameRow[]) {
  raw = {
    ...raw,
    games: [...raw.games, game],
    playersInGame: [...raw.playersInGame, ...relations],
  };
  rebuild();
  void insertGame(game, relations).catch((error) => {
    console.error("Failed to save game", error);
    void refresh();
  });
}

export function patchEdition(editionId: number, patch: Partial<EditionRow>) {
  raw = {
    ...raw,
    editions: raw.editions.map((edition) =>
      edition.id === editionId ? { ...edition, ...patch } : edition,
    ),
  };
  rebuild();
  void updateEdition(editionId, patch).catch((error) => {
    console.error("Failed to save edition", error);
    void refresh();
  });
}

export function patchPlayerEditions(patches: Array<{ id: number } & Partial<PlayerEditionRow>>) {
  const byId = new Map(patches.map((patch) => [patch.id, patch]));
  raw = {
    ...raw,
    playersInEdition: raw.playersInEdition.map((relation) => {
      const patch = byId.get(relation.id);
      if (!patch) return relation;
      const { id: _id, ...columns } = patch;
      return { ...relation, ...columns };
    }),
  };
  rebuild();
  void updatePlayerEditions(patches).catch((error) => {
    console.error("Failed to save standings", error);
    void refresh();
  });
}

export function login(username: string) {
  ensureSession();
  overlay = { ...overlay, currentUser: username };
  persist();
  emit();
}

export function logout() {
  ensureSession();
  overlay = { ...overlay, currentUser: null };
  persist();
  emit();
}
