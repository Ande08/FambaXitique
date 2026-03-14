import axios from 'axios';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

// Safeguard: Force HTTPS if the page is loaded over HTTPS to avoid Mixed Content errors
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  baseURL = baseURL.replace('http://', 'https://');
}

const api = axios.create({
  baseURL,
  timeout: 15000, // Increased timeout for VPS
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
