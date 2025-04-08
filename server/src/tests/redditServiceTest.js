// Simple test script for the Reddit service
// This script will compile and run with regular Node.js

// Import required modules
const https = require('https');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get Reddit API credentials from environment variables
const clientId = process.env.REDDIT_CLIENT_ID;
const clientSecret = process.env.REDDIT_CLIENT_SECRET;
const userAgent = 'orbital-news:v1.0.0 (by /u/orbital-news-app)';

console.log('Running Reddit API test...');
console.log(`Client ID available: ${Boolean(clientId)}`);
console.log(`Client Secret available: ${Boolean(clientSecret)}`);

if (!clientId || !clientSecret) {
  console.error('Error: Reddit API credentials not found in environment variables');
  process.exit(1);
}

// Function to get an OAuth access token
function getAccessToken() {
  return new Promise((resolve, reject) => {
    // Create auth string for Basic Auth
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const options = {
      hostname: 'www.reddit.com',
      path: '/api/v1/access_token',
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error) {
            reject(new Error(`Reddit API error: ${parsedData.error}`));
          } else {
            resolve(parsedData.access_token);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write('grant_type=client_credentials');
    req.end();
  });
}

// Function to fetch articles from Reddit
function fetchArticles(token, subreddit = 'news', limit = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'oauth.reddit.com',
      path: `/r/${subreddit}/top.json?limit=${limit}&t=day`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': userAgent
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          if (parsedData.error) {
            reject(new Error(`Reddit API error: ${parsedData.error}`));
          } else {
            resolve(parsedData.data.children);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Run the test
async function runTest() {
  try {
    console.log('Getting access token...');
    const token = await getAccessToken();
    console.log('✅ Successfully obtained access token');
    
    console.log('Fetching articles from Reddit...');
    const articles = await fetchArticles(token);
    console.log(`✅ Successfully fetched ${articles.length} articles from Reddit`);
    
    // Display the first article
    if (articles.length > 0) {
      const firstArticle = articles[0].data;
      console.log('\nSample article:');
      console.log(`Title: ${firstArticle.title.substring(0, 50)}${firstArticle.title.length > 50 ? '...' : ''}`);
      console.log(`Author: ${firstArticle.author}`);
      console.log(`Score: ${firstArticle.score}`);
      console.log(`Comments: ${firstArticle.num_comments}`);
      console.log(`URL: ${firstArticle.url}`);
    }
    
    console.log('\n✅ TEST PASSED: Reddit API is working correctly');
  } catch (error) {
    console.error(`❌ TEST FAILED: ${error.message}`);
    process.exit(1);
  }
}

// Execute the test
runTest();
