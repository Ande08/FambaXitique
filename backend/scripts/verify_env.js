const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('--- Env Verification ---');
console.log('PORT:', process.env.PORT);
console.log('BOT_API_TOKEN:', process.env.BOT_API_TOKEN);
console.log('BOT_API_TOKEN length:', process.env.BOT_API_TOKEN ? process.env.BOT_API_TOKEN.length : 'undefined');
console.log('--- End Verification ---');
