import { useSyncExternalStore } from "react";

import type { Dataset } from "@/lib/domain";
import {
  getDataset,
  getOverlay,
  getServerDataset,
  getServerOverlay,
  subscribe,
  type Overlay,
} from "@/lib/store";

/** The league data with any local mutations applied. */
export function useDataset(): Dataset {
  return useSyncExternalStore(subscribe, getDataset, getServerDataset);
}

export function useOverlay(): Overlay {
  return useSyncExternalStore(subscribe, getOverlay, getServerOverlay);
}

/** `current_user.is_authenticated` in the Jinja templates. */
export function useCurrentUser(): string | null {
  return useOverlay().currentUser;
}

/**
 * False while rendering on the server and during hydration, true afterwards.
 *
 * Anything created locally lives in the browser's overlay, which the server
 * render cannot see. A page that looks such a record up has to wait for
 * hydration before deciding it does not exist.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
