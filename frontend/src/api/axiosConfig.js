import axios from 'axios';

let baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api';

// Robust Fix: Use relative path if on production domain.
// This ensures protocol (HTTPS) and domain always match exactly.
if (typeof window !== 'undefined' && window.location.hostname === 'xitique.famba.online') {
  baseURL = '/api';
} else if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  // Fallback safeguard for other HTTPS environments
  baseURL = baseURL.replace('http://', 'https://');
}

const api = axios.create({
  baseURL,
  timeout: 15000, 
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
