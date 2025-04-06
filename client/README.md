# Orbital News Frontend

A Three.js-based interactive news visualization that displays news articles as planets orbiting in a solar system.

## Features

- Interactive 3D solar system visualization using Three.js
- Articles represented as planets with orbital mechanics
- Gravitational interactions between planets
- Camera controls for navigating the solar system
- Search functionality for finding specific news
- Article details panel for reading content

## Technology Stack

- TypeScript
- React
- Three.js for 3D visualization
- Vite for build tooling
- Axios for API requests

## Getting Started

### Prerequisites

- Node.js 16+
- pnpm (recommended)

### Installation

The project uses pnpm workspaces. From the root directory:

```bash
pnpm install
```

### Development

To start the development server:

```bash
# From the client directory
pnpm dev
```

### Building

To build for production:

```bash
# From the client directory
pnpm build
```

## Project Structure

- `src/components/` - React components
- `src/utils/` - Utility functions and classes
  - `OrbitalSystem.ts` - Main Three.js scene management
  - `Planet.ts` - Planet class for article representation
  - `Vector.ts` - Vector math utilities
- `src/services/` - API services
- `src/types/` - TypeScript type definitions
- `src/assets/` - Static assets

## Implementation Details

The frontend uses Three.js to create an interactive solar system where news articles are represented as planets. The size, color, and orbital characteristics of each planet are determined by the article's properties:

- Mass: Based on article length and source credibility
- Color: Based on the article source
- Position: Based on article relevance and publication date

The system implements simplified orbital mechanics with gravitational interactions between planets, creating a dynamic and engaging visualization of the news ecosystem.
