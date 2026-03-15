const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const cleanUrl = (url) => {
    if (!url) return "";
    return url.replace(/["']/g, "").trim();
};

const apiToken = cleanUrl(process.env.BOT_API_TOKEN);

console.log('--- Bot Env Verification ---');
console.log('API_URL:', process.env.API_URL);
console.log('BOT_API_TOKEN (raw):', process.env.BOT_API_TOKEN);
console.log('BOT_API_TOKEN (cleaned):', apiToken);
console.log('BOT_API_TOKEN length (cleaned):', apiToken.length);
console.log('--- End Verification ---');
