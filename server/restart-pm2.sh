#!/bin/bash
# restart-pm2.sh - Script to restart the Orbital News server with PM2

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Restarting Orbital News server with PM2...${NC}"

# Stop any existing instances
# Copy the .env file from the user's home directory
echo -e "${YELLOW}Checking for environment file...${NC}"
if [ -f ~/.server.env ]; then
  echo -e "${YELLOW}Copying environment file from ~/.server.env...${NC}"
  cp ~/.server.env ./.env
  echo -e "${GREEN}Environment file copied successfully.${NC}"
  # Make sure the file has the right permissions
  chmod 600 ./.env
else
  echo -e "${RED}Warning: ~/.server.env not found!${NC}"
  echo -e "${YELLOW}Checking if .env already exists in the current directory...${NC}"
  if [ ! -f ./.env ]; then
    echo -e "${RED}No .env file found! The server may not function correctly.${NC}"
    echo -e "${RED}Please create ~/.server.env with the required environment variables.${NC}"
    echo -e "${RED}Example: MONGODB_URI=mongodb://localhost:27017/orbital_news${NC}"
  else
    echo -e "${GREEN}Using existing .env file.${NC}"
  fi
fi

echo -e "${YELLOW}Stopping any existing instances...${NC}"
pm2 delete orbital-news-server > /dev/null 2>&1

# Start the server using the ecosystem file
echo -e "${YELLOW}Starting server with PM2...${NC}"
pm2 start ecosystem.config.js --env production

# Save the PM2 process list
echo -e "${YELLOW}Saving PM2 process list...${NC}"
pm2 save

# Display the PM2 status
echo -e "${YELLOW}Current PM2 status:${NC}"
pm2 list | grep orbital-news-server

# Show recent logs
echo -e "${YELLOW}Recent logs:${NC}"
pm2 logs orbital-news-server --lines 20 --nostream

echo -e "${GREEN}Server restart completed!${NC}"
echo -e "${YELLOW}To view streaming logs, run: pm2 logs orbital-news-server${NC}"
