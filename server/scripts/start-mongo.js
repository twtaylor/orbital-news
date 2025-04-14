/**
 * Script to start MongoDB for Orbital News development
 * 
 * This script will:
 * 1. Check if Docker is running
 * 2. Check if MongoDB container exists
 * 3. Start existing container or create a new one if needed
 */
const { exec, execSync } = require('child_process');

// Check if MongoDB container is running
function isMongoRunning() {
  try {
    const output = execSync('docker ps --filter "name=orbital-mongo" --format "{{.Names}}"').toString().trim();
    return output === 'orbital-mongo';
  } catch (error) {
    return false;
  }
}

// Check if MongoDB container exists but is stopped
function doesMongoContainerExist() {
  try {
    const output = execSync('docker ps -a --filter "name=orbital-mongo" --format "{{.Names}}"').toString().trim();
    return output === 'orbital-mongo';
  } catch (error) {
    return false;
  }
}

// Start MongoDB container
function startMongoContainer() {
  return new Promise((resolve, reject) => {
    if (isMongoRunning()) {
      console.log('✅ MongoDB container is already running');
      resolve();
      return;
    }

    if (doesMongoContainerExist()) {
      console.log('🔄 Starting existing MongoDB container...');
      exec('docker start orbital-mongo', (error) => {
        if (error) {
          console.error('❌ Failed to start MongoDB container:', error);
          reject(error);
        } else {
          console.log('✅ MongoDB container started successfully');
          resolve();
        }
      });
    } else {
      console.log('🔄 Creating and starting new MongoDB container...');
      exec('docker run -d -p 27017:27017 --name orbital-mongo mongo:6.0', (error) => {
        if (error) {
          console.error('❌ Failed to create MongoDB container:', error);
          reject(error);
        } else {
          console.log('✅ MongoDB container created and started successfully');
          resolve();
        }
      });
    }
  });
}

// Check if Docker is running
function isDockerRunning() {
  try {
    execSync('docker info');
    return true;
  } catch (error) {
    return false;
  }
}

// Main function
async function main() {
  try {
    // Check if Docker is running
    if (!isDockerRunning()) {
      console.error('❌ Docker is not running. Please start Docker and try again.');
      console.log('💡 Tip: Start Docker Desktop or run the Docker daemon');
      process.exit(1);
    }

    // Start MongoDB container
    await startMongoContainer();
    
    console.log('🔌 MongoDB is now available at mongodb://localhost:27017/orbital_news');
    console.log('📊 This will enable caching for Reddit articles, improving performance and reducing API calls');
    console.log('\n💡 Next steps:');
    console.log('  1. Run `pnpm mongo:status` to verify MongoDB is working properly');
    console.log('  2. Start the server with `pnpm dev` or `pnpm dev:watch`');
    
    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n⚠️ Failed to start MongoDB. The server will still work but caching will be disabled.');
    process.exit(1);
  }
}

// Run the main function
main();
