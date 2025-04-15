# Orbital News Server

Backend API server for the Orbital News application. This server provides news articles from various sources and processes them with location extraction and geocoding.

## Production Deployment Guide

This guide explains how to deploy the Orbital News server in a production environment.

### Prerequisites

- Node.js 18+ and npm/pnpm
- MongoDB 6.0+ (required for article storage)
- nodemon (for running the server with auto-restart capability)

### Packaging the Server

To create a production-ready package of the server:

```bash
pnpm package
```

This will:
1. Build the server in production mode
2. Create a tarball named `orbital-news-server.tar.gz` containing:
   - Compiled JavaScript files (dist directory)
   - package.json and pnpm-lock.yaml for dependencies
   - .env.example for configuration
   - README.md with instructions

### Deployment Steps

1. **Transfer the package to your server**:
   ```bash
   scp orbital-news-server.tar.gz user@your-server:~/
   ```

2. **Extract the package on your server**:
   ```bash
   mkdir -p ~/orbital-news-server
   tar -xzf orbital-news-server.tar.gz -C ~/orbital-news-server
   cd ~/orbital-news-server
   ```

3. **Install dependencies**:
   ```bash
   pnpm install --prod
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your production settings
   nano .env
   ```

5. **Set up MongoDB**:
   - Ensure MongoDB is installed and running on your server
   - Update the `MONGODB_URI` in your `.env` file if needed

6. **Start the server with nodemon**:
   ```bash
   nodemon dist/index.js
   ```

### Production Configuration

The server is configured to run on port 3000 by default. Make sure to:

1. Set `NODE_ENV=production` in your `.env` file
2. Configure your MongoDB connection string
3. Set up any API keys needed for news sources

### Running as a Service

For a proper production setup, you should run the server as a service using a process manager like PM2 or systemd.

Example PM2 setup:

```bash
npm install -g pm2
pm2 start dist/index.js --name orbital-news-server
pm2 save
pm2 startup
```

### API Endpoints

The API will be available at `http://your-server:3000/api` with the following endpoints:

- `GET /api/health` - Check server status
- `GET /api/articles` - Get all articles
- `GET /api/articles/:id` - Get a specific article

### Notes for Production

1. The server requires MongoDB for article storage
2. The API is configured to be accessed at `https://localgrp.news:8080/api` from the client
3. Make sure to set up proper security measures (firewall, HTTPS, etc.)
4. Consider setting up a reverse proxy (nginx, Apache) to handle HTTPS and forward requests to the Node.js server

### Troubleshooting

If you encounter issues with the MongoDB connection:
1. Verify MongoDB is running: `systemctl status mongodb`
2. Check the connection string in your `.env` file
3. Ensure the MongoDB port (default: 27017) is accessible

For other issues, check the server logs for detailed error messages.
