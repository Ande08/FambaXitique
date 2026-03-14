const axios = require('axios');
require('dotenv').config();

// Helper to clean URL from potential quotes
const cleanUrl = (url) => {
    if (!url) return "";
    return url.replace(/["']/g, "").trim();
};

const baseURL = cleanUrl(process.env.API_URL || 'http://localhost:5001');
const apiToken = cleanUrl(process.env.BOT_API_TOKEN);

console.log(`📡 [API] Base URL: ${baseURL}`);

const api = axios.create({
    baseURL,
    headers: {
        'Authorization': apiToken,
        'Content-Type': 'application/json'
    }
});

// Helper for bot endpoints
const botApi = {
    getUserInfo: (phone) => api.get(`/api/bot/user/${phone}`),
    getStatus: (phone) => api.get(`/api/bot/status/${phone}`),
    submitPayment: (data) => api.post('/api/bot/payment', data),
    submitLoan: (data) => api.post('/api/bot/loan-request', data),
    getNotifications: () => api.get('/api/bot/notifications'),
    markNotificationSent: (id) => api.post(`/api/bot/notifications/${id}/sent`, { status: 'sent' }),
    getPlans: () => api.get('/api/bot/plans')
};

module.exports = botApi;
