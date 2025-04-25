#!/bin/bash
set -e

# Function to load environment variables from .env file
load_env() {
  ENV_FILE="$1"
  if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from $ENV_FILE"
    while IFS='=' read -r key value || [ -n "$key" ]; do
      # Skip comments and empty lines
      if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
      fi
      # Remove leading/trailing whitespace and quotes from value
      value=$(echo "$value" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/")
      # Export the variable
      export "$key=$value"
    done < "$ENV_FILE"
  else
    echo "No $ENV_FILE file found. Using default configuration."
  fi
}

# Try to load from project root .env first, then from server/.env
load_env "$(dirname "$0")/.env"
load_env "$(dirname "$0")/server/.env"

# Check required environment variables
check_required_vars() {
  local missing_vars=false
  
  if [ -z "$DEPLOY_REMOTE_USER" ]; then
    echo -e "${RED}ERROR: DEPLOY_REMOTE_USER is not set in .env file${NC}"
    missing_vars=true
  fi
  
  if [ -z "$DEPLOY_REMOTE_HOST" ]; then
    echo -e "${RED}ERROR: DEPLOY_REMOTE_HOST is not set in .env file${NC}"
    missing_vars=true
  fi
  
  if [ -z "$DEPLOY_CLIENT_REMOTE_PATH" ]; then
    echo -e "${RED}ERROR: DEPLOY_CLIENT_REMOTE_PATH is not set in .env file${NC}"
    missing_vars=true
  fi
  
  if [ -z "$DEPLOY_SERVER_REMOTE_PATH" ]; then
    echo -e "${RED}ERROR: DEPLOY_SERVER_REMOTE_PATH is not set in .env file${NC}"
    missing_vars=true
  fi
  
  if [ "$missing_vars" = true ]; then
    echo -e "${RED}Deployment configuration is incomplete. Please check your .env file.${NC}"
    echo -e "${YELLOW}See .env.deploy.example for required variables.${NC}"
    exit 1
  fi
}

# Set configuration from environment variables
REMOTE_USER="$DEPLOY_REMOTE_USER"
REMOTE_HOST="$DEPLOY_REMOTE_HOST"
CLIENT_REMOTE_PATH="$DEPLOY_CLIENT_REMOTE_PATH"
SERVER_REMOTE_PATH="$DEPLOY_SERVER_REMOTE_PATH"

# Command line options
LOCAL_ONLY=false
SETUP_LOGS=false

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --local)
      LOCAL_ONLY=true
      echo "Running in local-only mode. Will skip remote deployment."
      ;;
    --setup-logs)
      SETUP_LOGS=true
      echo "Will create logs directory on the remote server."
      ;;
    *)
      echo "Unknown option: $arg"
      echo "Available options:"
      echo "  --local       Run in local-only mode (skip remote deployment)"
      echo "  --setup-logs  Create logs directory on remote server (only needed for first deployment)"
      exit 1
      ;;
  esac
done

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check for required environment variables
check_required_vars

echo -e "${YELLOW}Starting Orbital News deployment...${NC}"

# Ensure we're in the project root
cd "$(dirname "$0")"

# Build and package client
echo -e "${YELLOW}Building client...${NC}"
cd client

# Clean client build directory
echo -e "${YELLOW}Cleaning client build directory...${NC}"
rm -rf dist

pnpm build:prod > /dev/null 2>&1 || { echo -e "${RED}Client build failed!${NC}"; exit 1; }
echo -e "${GREEN}Client build successful.${NC}"

echo -e "${YELLOW}Packaging client...${NC}"
# Create fresh package
rm -f orbital-news-client.tar.gz
pnpm package > /dev/null 2>&1 || { echo -e "${RED}Client packaging failed!${NC}"; exit 1; }
echo -e "${GREEN}Client packaged successfully.${NC}"

# Build and package server
echo -e "${YELLOW}Building server...${NC}"
cd ../server

# Clean server build directory
echo -e "${YELLOW}Cleaning server build directory...${NC}"
rm -rf dist

pnpm build > /dev/null 2>&1 || { echo -e "${RED}Server build failed!${NC}"; exit 1; }
echo -e "${GREEN}Server build successful.${NC}"

echo -e "${YELLOW}Packaging server...${NC}"
# Create fresh package
rm -f orbital-news-server.tar.gz
pnpm package > /dev/null 2>&1 || { echo -e "${RED}Server packaging failed!${NC}"; exit 1; }
echo -e "${GREEN}Server packaged successfully.${NC}"

cd ..

# Create temporary directories for extraction
echo -e "${YELLOW}Preparing deployment packages...${NC}"
rm -rf ./deploy-tmp
mkdir -p ./deploy-tmp/client
mkdir -p ./deploy-tmp/server

# Extract the packages
tar -xzf ./client/orbital-news-client.tar.gz -C ./deploy-tmp/client || { 
  echo -e "${RED}Error extracting client package. Make sure it exists at ./client/orbital-news-client.tar.gz${NC}"; 
  exit 1; 
}
tar -xzf ./server/orbital-news-server.tar.gz -C ./deploy-tmp/server || { 
  echo -e "${RED}Error extracting server package. Make sure it exists at ./server/orbital-news-server.tar.gz${NC}"; 
  exit 1; 
}

# Check for pause button in the client build
echo -e "${YELLOW}Checking for pause functionality in the build...${NC}"
grep -r "pause-button\|handlePauseToggle\|togglePause" ./deploy-tmp/client/ || {
  echo -e "${YELLOW}Warning: Could not find pause functionality in the build.${NC}"
  echo -e "${YELLOW}This might indicate that the pause feature is not being included in the production build.${NC}"
}

if [ "$LOCAL_ONLY" = false ]; then
  # Deploy to remote server
  echo -e "${YELLOW}Deploying to remote server...${NC}"

  # Deploy client
  echo -e "${YELLOW}Deploying client to ${REMOTE_USER}@${REMOTE_HOST}:${CLIENT_REMOTE_PATH}...${NC}"
  echo -e "${YELLOW}Files being transferred:${NC}"
  find ./deploy-tmp/client -type f | sort | head -n 20
  echo -e "${YELLOW}(showing first 20 files only)${NC}"

  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for rsync operation ⚠️${NC}"
  rsync -avz --delete ./deploy-tmp/client/ ${REMOTE_USER}@${REMOTE_HOST}:${CLIENT_REMOTE_PATH}/ || { 
    echo -e "${RED}Client deployment failed!${NC}"
    exit 1
  }
  echo -e "${GREEN}Client deployed successfully.${NC}"

  # Deploy server
  echo -e "${YELLOW}Deploying server to ${REMOTE_USER}@${REMOTE_HOST}:${SERVER_REMOTE_PATH}...${NC}"
  # First, backup the .env file if it exists
  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for SSH operation ⚠️${NC}"
  ssh ${REMOTE_USER}@${REMOTE_HOST} "if [ -f ${SERVER_REMOTE_PATH}/.env ]; then cp ${SERVER_REMOTE_PATH}/.env ${SERVER_REMOTE_PATH}/.env.backup; fi" > /dev/null 2>&1
  
  # Deploy the server files
  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for rsync operation ⚠️${NC}"
  rsync -avz --delete --exclude='.env' --exclude='.env.backup' ./deploy-tmp/server/ ${REMOTE_USER}@${REMOTE_HOST}:${SERVER_REMOTE_PATH}/ > /dev/null 2>&1 || {
    echo -e "${RED}Server deployment failed!${NC}"
    exit 1
  }
  
  # Restore the .env file
  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for SSH operation ⚠️${NC}"
  ssh ${REMOTE_USER}@${REMOTE_HOST} "if [ -f ${SERVER_REMOTE_PATH}/.env.backup ]; then mv ${SERVER_REMOTE_PATH}/.env.backup ${SERVER_REMOTE_PATH}/.env; fi" > /dev/null 2>&1
  
  echo -e "${GREEN}Server deployed successfully.${NC}"
  echo -e "${YELLOW}Note: The .env file has been preserved during deployment.${NC}"

  # Always deploy PM2 ecosystem file
  echo -e "${YELLOW}Deploying PM2 ecosystem file...${NC}"
  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for rsync operation ⚠️${NC}"
  rsync -avz ./server/ecosystem.config.js ${REMOTE_USER}@${REMOTE_HOST}:${SERVER_REMOTE_PATH}/ecosystem.config.js > /dev/null 2>&1 || {
    echo -e "${YELLOW}Warning: Could not deploy PM2 ecosystem file.${NC}"
  }
  
  # Create logs directory on the remote server only if explicitly requested
  if [ "$SETUP_LOGS" = true ]; then
    echo -e "${YELLOW}Creating logs directory on remote server...${NC}"
    echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for SSH operation ⚠️${NC}"
    ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p ${SERVER_REMOTE_PATH}/logs" > /dev/null 2>&1
    echo -e "${GREEN}Logs directory created.${NC}"
  else
    echo -e "${YELLOW}Skipping logs directory creation (use --setup-logs if needed).${NC}"
  fi
  
  # Deploy the restart script
  echo -e "${YELLOW}Deploying PM2 restart script...${NC}"
  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for rsync operation ⚠️${NC}"
  rsync -avz ./server/restart-pm2.sh ${REMOTE_USER}@${REMOTE_HOST}:${SERVER_REMOTE_PATH}/restart-pm2.sh > /dev/null 2>&1 || {
    echo -e "${YELLOW}Warning: Could not deploy PM2 restart script.${NC}"
  }
  
  # Make the restart script executable on the remote server
  echo -e "${YELLOW}Making restart script executable...${NC}"
  echo -e "${RED}⚠️  AUTHENTICATION REQUIRED: Prepare to tap your OTP for SSH operation ⚠️${NC}"
  ssh ${REMOTE_USER}@${REMOTE_HOST} "chmod +x ${SERVER_REMOTE_PATH}/restart-pm2.sh" > /dev/null 2>&1
  
  # Print instructions for manually restarting the server
  echo -e "${YELLOW}Deployment completed. To restart the server:${NC}"
  echo -e "${GREEN}=== Manual Server Restart Instructions ===${NC}"
  echo -e "${YELLOW}1. SSH to your server:${NC}"
  echo -e "${YELLOW}   ssh ${REMOTE_USER}@${REMOTE_HOST}${NC}"
  echo -e "${YELLOW}2. Navigate to the server directory:${NC}"
  echo -e "${YELLOW}   cd ${SERVER_REMOTE_PATH}${NC}"
  echo -e "${YELLOW}3. Run the restart script:${NC}"
  echo -e "${YELLOW}   ./restart-pm2.sh${NC}"
  echo -e "${YELLOW}   or manually restart with:${NC}"
  echo -e "${YELLOW}   pm2 delete orbital-news-server > /dev/null 2>&1${NC}"
  echo -e "${YELLOW}   pm2 start ecosystem.config.js --env production${NC}"
  echo -e "${YELLOW}   pm2 save${NC}"
  echo -e "${YELLOW}4. View application logs (optional):${NC}"
  echo -e "${YELLOW}   pm2 logs orbital-news-server --lines 20${NC}"
  echo -e "${GREEN}=======================================${NC}"
else
  echo -e "${YELLOW}Skipping remote deployment (local-only mode).${NC}"
  echo -e "${YELLOW}You can find the built files in ./deploy-tmp/client/ and ./deploy-tmp/server/${NC}"
  echo -e "${YELLOW}To test the client locally, you can run:${NC}"
  echo -e "${YELLOW}  cd ./deploy-tmp/client && python -m http.server 8080${NC}"
  echo -e "${YELLOW}Then visit http://localhost:8080 in your browser.${NC}"
fi

# Don't clean up in local-only mode
if [ "$LOCAL_ONLY" = false ]; then
  echo -e "${YELLOW}Cleaning up temporary files...${NC}"
  rm -rf ./deploy-tmp
fi

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${YELLOW}Note: Make sure Nginx is properly configured on the remote server to proxy requests to the client and server.${NC}"
