/**
 * The Flask app writes to SQLite; this port keeps the same seed data immutable
 * and layers every mutation (created games, team draws, login) into a
 * localStorage overlay. The overlay is empty on a fresh visit, so the server
 * render and the first client render agree and hydration stays clean.
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

const SEED: RawData = {
  leagues: leaguesJson as RawData["leagues"],
  editions: editionsJson as RawData["editions"],
  players: playersJson as RawData["players"],
  games: gamesJson as RawData["games"],
  playersInGame: playersInGameJson as RawData["playersInGame"],
  playersInEdition: playersInEditionJson as RawData["playersInEdition"],
};

export interface Overlay {
  games: GameRow[];
  playersInGame: PlayerGameRow[];
  editionPatches: Record<number, Partial<EditionRow>>;
  playerEditionPatches: Record<number, Partial<PlayerEditionRow>>;
  currentUser: string | null;
}

const EMPTY_OVERLAY: Overlay = {
  games: [],
  playersInGame: [],
  editionPatches: {},
  playerEditionPatches: {},
  currentUser: null,
};

const STORAGE_KEY = "ligasfrancesinha:overlay:v1";

let overlay: Overlay = EMPTY_OVERLAY;
let loadedFromStorage = false;
const listeners = new Set<() => void>();

/** Dataset with no overlay applied — the SSR snapshot and the pre-hydration view. */
const seedDataset = buildDataset(SEED);
let cachedDataset: Dataset = seedDataset;
let cachedOverlay: Overlay = EMPTY_OVERLAY;

function applyOverlay(current: Overlay): Dataset {
  if (current === EMPTY_OVERLAY) return seedDataset;

  const raw: RawData = {
    leagues: SEED.leagues,
    players: SEED.players,
    editions: SEED.editions.map((edition) => {
      const patch = current.editionPatches[edition.id];
      return patch ? { ...edition, ...patch } : edition;
    }),
    games: [...SEED.games, ...current.games],
    playersInGame: [...SEED.playersInGame, ...current.playersInGame],
    playersInEdition: SEED.playersInEdition.map((relation) => {
      const patch = current.playerEditionPatches[relation.id];
      return patch ? { ...relation, ...patch } : relation;
    }),
  };
  return buildDataset(raw);
}

function emit() {
  if (cachedOverlay !== overlay) {
    cachedOverlay = overlay;
    cachedDataset = applyOverlay(overlay);
  }
  for (const listener of listeners) listener();
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overlay));
  } catch {
    // Private browsing or a full quota: the session simply won't survive reload.
  }
}

function ensureLoaded() {
  if (loadedFromStorage || typeof window === "undefined") return;
  loadedFromStorage = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      overlay = { ...EMPTY_OVERLAY, ...(JSON.parse(raw) as Partial<Overlay>) };
      cachedOverlay = overlay;
      cachedDataset = applyOverlay(overlay);
    }
  } catch {
    overlay = EMPTY_OVERLAY;
  }
}

export function subscribe(listener: () => void): () => void {
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

function update(mutate: (draft: Overlay) => Overlay) {
  ensureLoaded();
  overlay = mutate(overlay);
  persist();
  emit();
}

/* --------------------------------------------------------------- Mutations */

export function nextGameId(): number {
  const dataset = getDataset();
  return dataset.games.reduce((max, game) => Math.max(max, game.id), 0) + 1;
}

export function nextPlayerGameId(): number {
  return (
    [...SEED.playersInGame, ...overlay.playersInGame].reduce((max, row) => Math.max(max, row.id), 0) +
    1
  );
}

export function addGame(game: GameRow, relations: PlayerGameRow[]) {
  update((current) => ({
    ...current,
    games: [...current.games, game],
    playersInGame: [...current.playersInGame, ...relations],
  }));
}

export function patchEdition(editionId: number, patch: Partial<EditionRow>) {
  update((current) => ({
    ...current,
    editionPatches: {
      ...current.editionPatches,
      [editionId]: { ...current.editionPatches[editionId], ...patch },
    },
  }));
}

export function patchPlayerEditions(patches: Array<{ id: number } & Partial<PlayerEditionRow>>) {
  update((current) => {
    const next = { ...current.playerEditionPatches };
    for (const { id, ...rest } of patches) {
      next[id] = { ...next[id], ...rest };
    }
    return { ...current, playerEditionPatches: next };
  });
}

export function login(username: string) {
  update((current) => ({ ...current, currentUser: username }));
}

export function logout() {
  update((current) => ({ ...current, currentUser: null }));
}

export function resetOverlay() {
  update(() => EMPTY_OVERLAY);
}
