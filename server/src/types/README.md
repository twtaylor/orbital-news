# Types Directory

This directory contains TypeScript type definitions for the Orbital News application.

## Directory Structure

- **models/** - Type definitions for data models
  - `article.type.ts` - Article model types
  
- **services/** - Type definitions for service responses and requests
  - `reddit.type.ts` - Reddit API response types
  
- **shared/** - Shared types and constants used across the application
  - `orbital.type.ts` - Orbital mechanics constants and types

## Naming Convention

All type files follow the naming convention: `<name>.type.ts`

## Usage Guidelines

1. **Importing Types**
   
   Always import types directly from the types directory:
   ```typescript
   import { Article, TierType } from '../types/models/article.type';
   ```

2. **Creating New Types**
   
   When creating new types:
   - Place them in the appropriate subdirectory
   - Follow the naming convention
   - Document the types with JSDoc comments

3. **Re-exporting Types**
   
   For backward compatibility, original files re-export their types:
   ```typescript
   // In models/Article.ts
   export { Article, TierType } from '../types/models/article.type';
   ```

## Orbital Constants

The `orbital.type.ts` file contains constants for the orbital mechanics simulation with the following settings:

- Fixed orbital distance tiers:
  - Close articles: 10 units
  - Medium articles: 20 units
  - Far articles: 30 units
- Reduced gravitational constant (2.0e-11) for stable orbits
- Moderate sun mass (50,000,000)
- Time scaling factor (1.2x) for faster orbital movement
- True 3D orbits with elevation angles up to ±30°
- Elliptical orbit factors between 0.3-0.5 of circular velocity
- Minimal ecliptic force (0.0002) to allow for true 3D orbits
