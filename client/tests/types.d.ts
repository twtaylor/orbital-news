// Type definitions for Playwright tests

interface Window {
  frameRates?: number[];
  Planet?: {
    planets: Array<{
      tier: string;
      mass: number;
      pos: { x: number; y: number; z: number };
      vel: { x: number; y: number; z: number };
    }>;
  };
}

// Extend Element interface to include custom properties
interface Element {
  __orbitalSystem?: {
    isPaused: boolean;
    camera: {
      position: { x: number; y: number; z: number };
    };
  };
}
