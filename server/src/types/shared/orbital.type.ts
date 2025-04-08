/**
 * Types and constants for orbital mechanics
 * Used by both frontend and backend
 */

/**
 * Orbital distance tiers in units from the sun
 * - Close articles at 10 units
 * - Medium articles at 20 units
 * - Far articles at 30 units
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

/**
 * Orbital physics constants
 */
export const ORBITAL_CONSTANTS = {
  // Gravitational constant (reduced for stable orbits)
  G: 2.0e-11,
  
  // Sun mass (moderate gravitational pull)
  SUN_MASS: 50000000,
  
  // Maximum velocity for planets
  MAX_VELOCITY: 0.03,
  
  // Ecliptic force (minimal to allow true 3D orbits)
  ECLIPTIC_FORCE: 0.0002,
  
  // Y-velocity dampening factor (very gentle)
  Y_DAMPENING: 0.995,
  
  // Maximum elevation angle (degrees from ecliptic plane)
  MAX_ELEVATION_ANGLE: 30,
  
  // Time scaling factor for faster orbital movement
  TIME_SCALE: 1.2,
  
  // Elliptical orbit factors (between 0.3-0.5 of circular velocity)
  ELLIPTICAL_FACTOR_MIN: 0.3,
  ELLIPTICAL_FACTOR_MAX: 0.5,
  
  // Distance variation percentage for tiers (±5%)
  DISTANCE_VARIATION: 0.05
};
