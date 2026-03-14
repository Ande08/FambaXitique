const axios = require('axios');

async function testEndpoints() {
  const token = 'YOUR_JWT_TOKEN'; // I don't have a valid token here, but I can check if it returns 401/403 instead of 500
  const baseUrl = 'http://localhost:5000/api';
  
  const endpoints = ['/groups', '/loans/pending'];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const res = await axios.get(baseUrl + endpoint);
      console.log(`${endpoint}: ${res.status}`);
    } catch (err) {
      console.log(`${endpoint}: ${err.response?.status} - ${JSON.stringify(err.response?.data)}`);
    }
  }
}

// testEndpoints();
// Instead of running, I'll just check if the server is up and logs are clean.
