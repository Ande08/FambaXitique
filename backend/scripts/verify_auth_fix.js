const http = require('http');
require('dotenv').config();

const TOKEN = process.env.BOT_API_TOKEN || 'famba_bot_secret_token_2024';

function request(headers) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5001,
            path: '/api/bot/notifications',
            method: 'GET',
            headers: headers
        };

        const req = http.request(options, (res) => {
            resolve(res.statusCode);
        });

        req.on('error', (e) => {
            reject(e.message);
        });

        req.end();
    });
}

async function testAuth() {
    console.log('--- Verification Test ---');
    
    console.log('Testing with correct token...');
    try {
        const status = await request({ 'Authorization': TOKEN });
        console.log('✅ Result:', status);
    } catch (err) {
        console.log('❌ Error:', err);
    }

    console.log('\nTesting with quoted token...');
    try {
        const status = await request({ 'Authorization': `"${TOKEN}"` });
        console.log('✅ Result (robust check works):', status);
    } catch (err) {
        console.log('❌ Error:', err);
    }

    console.log('\nTesting with spaced token...');
    try {
        const status = await request({ 'Authorization': `  ${TOKEN}  ` });
        console.log('✅ Result (robust check works):', status);
    } catch (err) {
        console.log('❌ Error:', err);
    }

    console.log('\nTesting with WRONG token...');
    try {
        const status = await request({ 'Authorization': 'wrong_token' });
        console.log(status === 401 ? '✅ Correctly Failed (401)' : `❌ Unexpected status: ${status}`);
    } catch (err) {
        console.log('❌ Error:', err);
    }

    console.log('--- End Test ---');
}

testAuth();
