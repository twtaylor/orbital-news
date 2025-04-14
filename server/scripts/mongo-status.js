/**
 * Script to check MongoDB status for Orbital News development
 */
const { execSync } = require('child_process');
const { MongoClient } = require('mongodb');

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/orbital_news';

// Check if Docker is running
function isDockerRunning() {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// Check if MongoDB container is running
function isMongoContainerRunning() {
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

// Check if MongoDB is accessible
async function isMongoAccessible() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
  try {
    await client.connect();
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    // Check for articles collection
    const hasArticlesCollection = collections.some(col => col.name === 'articles');
    
    await client.close();
    return { 
      accessible: true, 
      collections: collections.map(c => c.name),
      hasArticlesCollection
    };
  } catch (error) {
    try {
      await client.close();
    } catch (e) {
      // Ignore close errors
    }
    return { 
      accessible: false, 
      error: error.message 
    };
  }
}

// Main function
async function main() {
  console.log('🔍 Checking MongoDB status for Orbital News...\n');
  
  // Check Docker status
  const dockerRunning = isDockerRunning();
  console.log(`Docker: ${dockerRunning ? '✅ Running' : '❌ Not running'}`);
  
  if (!dockerRunning) {
    console.log('\n⚠️ Docker is not running. Please start Docker to use MongoDB.');
    console.log('💡 Tip: Start Docker Desktop or run the Docker daemon');
    process.exit(1);
  }
  
  // Check MongoDB container status
  const mongoRunning = isMongoContainerRunning();
  const mongoExists = doesMongoContainerExist();
  
  console.log(`MongoDB Container: ${
    mongoRunning ? '✅ Running' : 
    mongoExists ? '⚠️ Exists but stopped' : 
    '❌ Not created'
  }`);
  
  if (mongoExists && !mongoRunning) {
    console.log('💡 Tip: Start the container with `pnpm mongo:start` or `docker start orbital-mongo`');
  } else if (!mongoExists) {
    console.log('💡 Tip: Create and start the container with `pnpm mongo:start`');
  }
  
  // Check MongoDB connection
  console.log('\nTesting MongoDB connection...');
  const mongoStatus = await isMongoAccessible();
  
  if (mongoStatus.accessible) {
    console.log('✅ MongoDB is accessible at', MONGODB_URI);
    console.log(`📊 Collections: ${mongoStatus.collections.join(', ') || 'None'}`);
    
    if (mongoStatus.hasArticlesCollection) {
      console.log('✅ Articles collection exists');
    } else {
      console.log('⚠️ Articles collection does not exist yet (will be created when articles are cached)');
    }
    
    console.log('\n🟢 MongoDB is ready for caching!');
  } else {
    console.log('❌ Cannot connect to MongoDB:', mongoStatus.error);
    console.log('\n⚠️ Caching will not be available until MongoDB is accessible.');
    console.log('💡 Tip: The server will still work but will use API calls instead of cached data');
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
