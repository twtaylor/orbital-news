# Orbital News

A personalized news aggregator that uses a solar system metaphor to organize content based on relevance and location.

## Project Overview

Orbital News creates a personalized news solar system where users orbit their own feed, prioritizing what's close and meaningful. By leveraging an inverse-square model tied to real-world location, the system balances local relevance with global exposure, empowering users to curate news on their terms.

### Key Features

- **3D Solar System Visualization**: Interactive visualization of news articles as planets orbiting a central sun
- **Location-Based Relevance**: Articles positioned at specific orbital distances based on geographic relevance
- **True 3D Orbits**: Planets orbit with significant y-axis variation (±30° from ecliptic plane)
- **Interactive Controls**: Camera rotation, zooming, and article selection
- **Multiple News Sources**: Integration with Reddit and NewsAPI for diverse content
- **Geocoding**: Automatic extraction and geocoding of locations mentioned in articles
- **MongoDB Storage**: Persistent storage of articles and location data

## Project Structure

```
orbital-news/
├── client/                  # Frontend React + Three.js application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client services
│   │   └── utils/           # Utility functions including orbital mechanics
│   ├── dist/                # Compiled application
│   └── tsconfig.json        # TypeScript configuration
│
├── server/                  # Backend Node.js + Express API
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── models/          # MongoDB data models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic (article fetching, location, geocoding)
│   │   ├── types/           # TypeScript type definitions
│   │   └── utils/           # Utility functions
│   ├── dist/                # Compiled TypeScript
│   └── tsconfig.json        # TypeScript configuration
│
├── deploy.sh                # Deployment automation script
├── ecosystem.config.js      # PM2 process management configuration
└── .env                     # Environment configuration
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- MongoDB (v6.0 or higher)

If you don't have pnpm installed, you can install it with:
```
npm install -g pnpm
```

**Important**: MongoDB is required for the server to run. The application will not start if MongoDB is unavailable, as it's used for article storage and location data caching.

### MongoDB Setup

1. Start MongoDB:
   ```
   pnpm mongo:start
   ```

2. Check MongoDB status:
   ```
   pnpm mongo:status
   ```

### Backend Setup

1. Install dependencies:
   ```
   pnpm install
   ```

2. Set up environment variables:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file with your configuration. Make sure to set the following required variables:
   
   - `MONGODB_URI`: MongoDB connection string (default: mongodb://localhost:27017/orbital_news)
   - `GEOCODING_PROVIDER`: The geocoding service provider (e.g., 'opencage')
   - `GEOCODING_API_KEY`: Your API key for the geocoding service
   - `NEWS_API_KEY`: Your API key for NewsAPI integration
   
   You can get a free API key from [OpenCage](https://opencagedata.com/) for geocoding and [NewsAPI](https://newsapi.org/) for news content.

3. Start the development server (requires MongoDB to be running):
   ```
   pnpm dev
   ```
   
   Or with auto-reload on file changes:
   ```
   pnpm dev:watch
   ```

4. Running tests:
   ```
   # Run all tests
   pnpm test
   
   # Run specific tests
   pnpm test:reddit         # Run Jest tests for Reddit service
   pnpm test:location       # Test location extraction functionality
   pnpm test:newsapi        # Test NewsAPI integration
   ```
   
   Note: To enable console logging during tests, set the DEBUG_TESTS environment variable:
   ```
   DEBUG_TESTS=true pnpm test -- [test-file-path]
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Start the development server:
   ```
   pnpm dev
   ```

4. The frontend will be available at http://localhost:5173

## Data Sources

The application integrates with the following data sources:
- Reddit (using node-fetch for API requests)
- NewsAPI (for top headlines and categorized news)
- Additional sources can be added through the modular service architecture

## Deployment

The project includes a comprehensive deployment system. For detailed deployment instructions, see [DEPLOYMENT.md](./deployment.md).

### Quick Deployment

1. Configure deployment settings in `.env` file:
   ```
   # Copy the example file
   cp .env.deploy.example .env
   
   # Edit with your server details
   nano .env
   ```

2. Run the deployment script:
   ```
   ./deploy.sh
   ```

3. For local testing only (no remote deployment):
   ```
   ./deploy.sh --local
   ```

## Command Reference

### Development Commands

```bash
# Start MongoDB
pnpm mongo:start

# Check MongoDB status
pnpm mongo:status

# Start the server in development mode
pnpm dev

# Start the server with auto-reload on file changes
pnpm dev:watch

# Build the TypeScript project
pnpm build

# Start the production server (after building)
pnpm start

# Run ESLint
pnpm lint
```

### Test Commands

```bash
# Run all tests
pnpm test

# Run specific tests
pnpm test:reddit         # Test Reddit service
pnpm test:location       # Test location extraction
pnpm test:newsapi        # Test NewsAPI integration

# Enable console logging during tests
DEBUG_TESTS=true pnpm test -- [test-file-path]
```

### Deployment Commands

```bash
# Package the client for deployment
cd client && pnpm package

# Package the server for deployment
cd server && pnpm package

# Full deployment (builds, packages, and deploys)
./deploy.sh

# Local-only deployment (for testing)
./deploy.sh --local
```

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
