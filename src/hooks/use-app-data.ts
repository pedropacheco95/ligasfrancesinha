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
