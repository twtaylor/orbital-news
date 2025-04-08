/**
 * Shared constants for the Orbital News application
 * Used by both frontend and backend
 */

/**
 * Orbital distance tiers in units from the sun
 */
export enum OrbitalTier {
  CLOSE = 10,
  MEDIUM = 20,
  FAR = 30
}

/**
 * Maps tier names to their numerical values
 */
export const TIER_VALUES = {
  close: OrbitalTier.CLOSE,
  medium: OrbitalTier.MEDIUM,
  far: OrbitalTier.FAR
};

/**
 * Default tier if none is specified
 */
export const DEFAULT_TIER = 'medium';
