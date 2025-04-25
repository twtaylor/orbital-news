# Orbital News Deployment Guide

This guide explains how to configure and deploy both the client and server components of the Orbital News application to production.

## Deployment Overview

The deployment consists of two main components:

1. **Client (Frontend)**: Static files served from `/var/www/localgrpnews`
2. **Server (API)**: Node.js application running on port 3000 at `/var/www/localgrpnewsapi`

The client will access the API through the same domain at `localgrp.news/api`, which will be proxied to the API server.

## Prerequisites

- SSH access to the production server (configured in .env file)
- Node.js 18+ and pnpm installed on the production server
- MongoDB 6.0+ installed and running on the production server
- Nginx or similar web server for serving the static files and proxying API requests
- PM2 process manager installed globally on the server (`npm install -g pm2`)

## Configuration

### Environment Variables

The deployment process uses environment variables to configure deployment settings. These should be set in a `.env` file in the project root:

```bash
# Deployment Configuration
DEPLOY_REMOTE_USER="your-username"       # SSH username for the remote server
DEPLOY_REMOTE_HOST="your-domain.com"     # Domain or IP of the remote server
DEPLOY_CLIENT_REMOTE_PATH="/path/to/client" # Remote path for client files
DEPLOY_SERVER_REMOTE_PATH="/path/to/server" # Remote path for server files
```

A template file `.env.deploy.example` is provided in the project root. Copy this to `.env` and update with your specific values.

### Server Environment Variables

The server requires its own set of environment variables for operation. These should be stored on the remote server in `~/.server.env` and will be automatically copied to the server directory during deployment:

```bash
# MongoDB connection
MONGODB_URI="mongodb://localhost:27017/orbital_news"

# API keys for services
NEWS_API_KEY="your-newsapi-key"

# Geocoding configuration
GEOCODING_PROVIDER="opencage"  # or other provider
GEOCODING_API_KEY="your-geocoding-api-key"

# Server configuration
PORT=3000
NODE_ENV="production"
```

## Automated Deployment

The project includes a deployment script that automates the entire process:

```bash
# From the project root
./deploy.sh
```

This script will:
1. Load environment variables from your `.env` file
2. Build and package both client and server components
3. Extract the packages locally for verification
4. Deploy both components to the remote server
5. Preserve any existing `.env` file on the server
6. Deploy the PM2 ecosystem file and restart script

### Deployment Options

```bash
# Deploy locally only (for testing)
./deploy.sh --local

# Set up logs directory on first deployment
./deploy.sh --setup-logs
```

## PM2 Process Management

The server uses PM2 for process management in production. The configuration is defined in `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: "orbital-news-server",
    script: "dist/index.js",
    cwd: "/var/www/localgrpnewsapi",
    instances: 1,
    exec_mode: "fork",
    watch: false,
    env: {
      NODE_ENV: "production"
      // Additional environment variables loaded from .env file
    },
    max_memory_restart: "300M",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
    error_file: "/var/www/localgrpnewsapi/logs/err.log",
    out_file: "/var/www/localgrpnewsapi/logs/out.log",
    time: true,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 4000
  }]
};
```

### Server Restart Script

A restart script (`restart-pm2.sh`) is included to simplify server management:

```bash
# SSH to your server
ssh ${DEPLOY_REMOTE_USER}@${DEPLOY_REMOTE_HOST}

# Navigate to the server directory
cd ${DEPLOY_SERVER_REMOTE_PATH}

# Run the restart script
./restart-pm2.sh
```

This script will:
1. Copy the environment file from `~/.server.env` to `.env`
2. Set appropriate file permissions
3. Stop any existing PM2 instances of the server
4. Start the server using the PM2 ecosystem file
5. Save the PM2 process list
6. Display recent logs

## Manual Deployment Steps

If you prefer to deploy manually, follow these steps:

```bash
# SSH into the server
ssh ${DEPLOY_REMOTE_USER}@${DEPLOY_REMOTE_HOST}

# Create the client directory if it doesn't exist
mkdir -p ${DEPLOY_CLIENT_REMOTE_PATH}

# Extract the client package
tar -xzf ~/orbital-news-client.tar.gz -C ${DEPLOY_CLIENT_REMOTE_PATH}

# Set appropriate permissions
chmod -R 755 ${DEPLOY_CLIENT_REMOTE_PATH}
```

### Step 2: Deploy the Server

While still connected to the server, deploy the API server:

```bash
# Create the server directory if it doesn't exist
mkdir -p ${DEPLOY_SERVER_REMOTE_PATH}

# Extract the server package
tar -xzf ~/orbital-news-server.tar.gz -C ${DEPLOY_SERVER_REMOTE_PATH}

# Navigate to the server directory
cd ${DEPLOY_SERVER_REMOTE_PATH}
```

### Step 3: Configure Environment Variables

Create the server environment file:

```bash
# Create the environment file in your home directory (if it doesn't exist)
nano ~/.server.env
```

Add the following configuration (adjust values as needed):

```bash
# MongoDB Connection (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/orbital_news

# API Keys
NEWS_API_KEY=your_newsapi_key

# Geocoding Configuration (REQUIRED)
GEOCODING_PROVIDER=opencage
GEOCODING_API_KEY=your_geocoding_api_key

# Server Configuration
PORT=3000
NODE_ENV=production
```

Make sure the file has appropriate permissions:

```bash
chmod 600 ~/.server.env
```

### Step 4: Set Up MongoDB

The application requires MongoDB for article storage and location data. The server will not start if MongoDB is unavailable, as it's used for storing articles and caching location data.

```bash
# Check if MongoDB is running
sudo systemctl status mongod

# If not running, start it
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify MongoDB connection
mongosh --eval "db.adminCommand('ping')"
```

### Step 5: Configure PM2 for Process Management

The application uses PM2 for process management in production. Install PM2 globally if not already installed:

```bash
sudo npm install -g pm2
```

Copy the ecosystem file to the server directory (this is done automatically by the deploy script):

```bash
# Navigate to the server directory
cd ${DEPLOY_SERVER_REMOTE_PATH}

# Make the restart script executable
chmod +x restart-pm2.sh

# Start the server using PM2
./restart-pm2.sh
```

Verify the server is running:

```bash
pm2 list
pm2 logs orbital-news-server --lines 20
```

### Step 6: Set Up Systemd Service (Alternative to PM2)

For a more robust setup, you can use a systemd service that includes MongoDB dependency:

```bash
sudo nano /etc/systemd/system/orbital-news-api.service
```

Add the following content:

```
[Unit]
Description=Orbital News API Server
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=${DEPLOY_REMOTE_USER}
WorkingDirectory=${DEPLOY_SERVER_REMOTE_PATH}
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=orbital-news
Environment=NODE_ENV=production
Environment=PORT=3000

# Security enhancements
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
LimitNOFILE=4096

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable orbital-news-api.service
sudo systemctl start orbital-news-api.service
sudo systemctl status orbital-news-api.service
```

## Step 7: Configure Nginx

Set up Nginx to serve the static client files and proxy API requests:

```bash
sudo nano /etc/nginx/sites-available/localgrp.news
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name localgrp.news;
    
    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name localgrp.news;
    
    # SSL configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    
    # Client files
    root /var/www/localgrpnews;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
}


```

Enable the site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/localgrp.news /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 8: Set Up SSL Certificates

If you don't already have SSL certificates, you can obtain them using Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d localgrp.news
```

## Step 9: Verify Deployment

1. Check if the client is accessible at https://localgrp.news
2. Verify the API is working at https://localgrp.news/api/health
3. Monitor the server logs:
   ```bash
   sudo journalctl -u orbital-news-api.service -f
   ```

## Troubleshooting

### Client Issues

- If the client shows a blank page, check the browser console for errors
- Verify that the API URL in the client is correctly set to https://localgrp.news/api
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`

### Server Issues

- Check the server logs: `sudo journalctl -u orbital-news-api.service -f`
- Verify MongoDB is running: `systemctl status mongodb`
- Check if the server is listening on port 3000: `netstat -tulpn | grep 3000`
- Verify environment variables are correctly set in the .env file

### MongoDB Issues

- Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongodb.log`
- Verify the database connection string in the .env file
- Ensure MongoDB is running and accessible: `mongo --eval "db.adminCommand('ping')"`

## Maintenance

### Updating the Deployment

To update the deployment with new changes:

1. Package the updated components
2. Transfer the new packages to the server
3. Extract and replace the existing files
4. Restart the API server: `sudo systemctl restart orbital-news-api.service`

### Backup

Regularly backup the MongoDB database:

```bash
mongodump --out /path/to/backup/directory
```

## Security Considerations

1. Keep all dependencies updated
2. Regularly apply security patches to the server
3. Use strong passwords for all services
4. Consider implementing rate limiting for the API
5. Set up proper firewall rules to restrict access to necessary ports only

## Monitoring

Consider setting up monitoring for your deployment:

1. Use a service like Uptime Robot to monitor the website and API availability
2. Set up log monitoring to detect errors and issues
3. Monitor server resources (CPU, memory, disk) to ensure optimal performance
