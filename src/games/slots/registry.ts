import type { SlotConfig } from "@/engine/slots/types";
import { CAT_MEOW } from "./cat-meow/config";
import { NEKO_NIGHTS } from "./neko-nights/config";

/** All registered slot configs, keyed by id. Adding a slot = add an entry. */
export const SLOT_CONFIGS: Record<string, SlotConfig> = {
  [CAT_MEOW.id]: CAT_MEOW,
  [NEKO_NIGHTS.id]: NEKO_NIGHTS,
};

export function getSlotConfig(id: string): SlotConfig | undefined {
  return SLOT_CONFIGS[id];
}

export function listSlotConfigs(): SlotConfig[] {
  return Object.values(SLOT_CONFIGS);
}
