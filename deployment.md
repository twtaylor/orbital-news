# Orbital News Deployment Guide

This guide explains how to deploy both the client and server components of the Orbital News application to production.

## Deployment Overview

The deployment consists of two main components:

1. **Client (Frontend)**: Static files served from `/var/www/localgrpnews`
2. **Server (API)**: Node.js application running on port 3000 at `/var/www/localgrpnewsapi`

The client will access the API through the same domain at `localgrp.news/api`, which will be proxied to the API server.

## Prerequisites

- SSH access to the production server (totmacher@totmacher.org)
- Node.js 18+ and pnpm installed on the production server
- MongoDB 6.0+ installed and running on the production server
- Nginx or similar web server for serving the static files and proxying API requests

## Step 1: Package Both Components

### Package the Client

```bash
# Navigate to the client directory
cd /Users/thomastaylor/dev/orbital-news/client

# Create the production package
pnpm package
# This creates orbital-news-client.tar.gz
```

### Package the Server

```bash
# Navigate to the server directory
cd /Users/thomastaylor/dev/orbital-news/server

# Create the production package
pnpm package
# This creates orbital-news-server.tar.gz with all production dependencies included
```

Note: The server package includes all production node_modules, so you won't need to install dependencies on the remote server.

## Step 2: Transfer Packages to Production Server

```bash
# Transfer the client package
scp /Users/thomastaylor/dev/orbital-news/client/orbital-news-client.tar.gz totmacher@totmacher.org:~

# Transfer the server package
scp /Users/thomastaylor/dev/orbital-news/server/orbital-news-server.tar.gz totmacher@totmacher.org:~
```

## Step 3: Deploy the Client

SSH into the server and deploy the client:

```bash
# SSH into the server
ssh totmacher@totmacher.org

# Create the client directory if it doesn't exist
mkdir -p /var/www/localgrpnews

# Extract the client package
tar -xzf ~/orbital-news-client.tar.gz -C /var/www/localgrpnews

# Set appropriate permissions
chmod -R 755 /var/www/localgrpnews
```

## Step 4: Deploy the Server

While still connected to the server, deploy the API server:

```bash
# Create the server directory if it doesn't exist
mkdir -p /var/www/localgrpnewsapi

# Extract the server package
tar -xzf ~/orbital-news-server.tar.gz -C /var/www/localgrpnewsapi

# Navigate to the server directory
cd /var/www/localgrpnewsapi

# Create and configure the environment file
cp .env.example .env
nano .env
```

Edit the `.env` file with the following configuration:

```
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orbital_news
DB_USER=postgres
DB_PASSWORD=your_secure_password

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/orbital_news

# API Keys (add your actual keys)
REDDIT_CLIENT_ID=your_client_id
REDDIT_CLIENT_SECRET=your_client_secret
```

## Step 5: Set Up MongoDB

Ensure MongoDB is properly configured:

```bash
# Check if MongoDB is running
systemctl status mongodb

# If not running, start it
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

## Step 6: Run the Server with Nodemon

Install nodemon globally if not already installed:

```bash
npm install -g nodemon
```

Set up a systemd service for the API server:

```bash
sudo nano /etc/systemd/system/orbital-news-api.service
```

Add the following content:

```
[Unit]
Description=Orbital News API Server
After=network.target mongodb.service

[Service]
Type=simple
User=totmacher
WorkingDirectory=/var/www/localgrpnewsapi
ExecStart=/usr/local/bin/nodemon dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable orbital-news-api.service
sudo systemctl start orbital-news-api.service
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
