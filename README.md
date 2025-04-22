# Orbital News

A personalized news aggregator that uses a solar system metaphor to organize content based on relevance and location.

## Project Overview

Orbital News creates a personalized news solar system where users orbit their own feed, prioritizing what's close and meaningful. By leveraging an inverse-square model tied to real-world location, the system balances local relevance with global exposure, empowering users to curate news on their terms.

## Project Structure

```
orbital-news/
├── client/                  # Frontend React + Three.js application (not yet implemented)
└── server/                  # Backend Node.js + Express API
    ├── src/
    │   ├── controllers/     # Request handlers
    │   ├── models/          # Data models
    │   ├── routes/          # API routes
    │   ├── services/        # Business logic
    │   └── utils/           # Utility functions
    ├── dist/                # Compiled TypeScript
    └── tsconfig.json        # TypeScript configuration
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- pnpm (v7 or higher)

If you don't have pnpm installed, you can install it with:
```
npm install -g pnpm
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
   
   - `GEOCODING_PROVIDER`: The geocoding service provider (e.g., 'opencage')
   - `GEOCODING_API_KEY`: Your API key for the geocoding service
   
   You can get a free API key from [OpenCage](https://opencagedata.com/) or use another supported provider.

3. Start the development server:
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
   
   # Run specific Reddit service tests
   pnpm test:reddit         # Run Jest tests for Reddit service
   pnpm test:reddit:jest    # Run comprehensive Reddit service tests
   pnpm test:reddit:js      # Run simple JavaScript test for Reddit API
   ```
   
   The tests verify that the Reddit service can properly fetch and transform articles from Reddit, and that the tier calculation logic works correctly for positioning articles in the orbital system.

### Frontend Setup (Future)

The frontend will be implemented in a future phase using React and Three.js.

## Data Sources

The application integrates with the following data sources:
- Reddit (using node-fetch for API requests)
- Twitter
- Washington Post

## Key Features

- Solar system visualization of news articles
- Articles positioned based on geographical relevance
- Article "mass" based on source credibility and length
- Read/unread article tracking

## Command Reference

### Development Commands

```bash
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

# Run specific Reddit service tests
pnpm test:reddit         # Run Jest tests for Reddit service
pnpm test:reddit:jest    # Run comprehensive Reddit service tests
pnpm test:reddit:js      # Run simple JavaScript test for Reddit API
```
