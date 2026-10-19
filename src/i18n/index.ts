import type { Dictionary } from "./dictionary";
import { fr } from "./fr";

/**
 * All UI copy lives in the single French dictionary for now. `getDictionary`
 * takes no arguments — the parameter and `MenuLanguage` abstraction buy
 * nothing until a second language actually exists.
 */
export function getDictionary(): Dictionary {
  return fr;
}

export type { Dictionary };
