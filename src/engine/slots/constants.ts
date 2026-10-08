/**
 * Shared slot-engine constants.
 *
 * Kept in a standalone module so pure engine files can reference them without
 * importing the server layer.
 */

/** Minimum symbols on a payline for a win. */
export const MIN_MATCH = 3;

/** Extra percentage added to the next free-spin retrigger's multiplier. */
export const RETRIGGER_MULTIPLIER_STEP = 1;
