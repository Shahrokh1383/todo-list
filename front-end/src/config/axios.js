import axios from 'axios';
import axiosRetry from 'axios-retry';

const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const API_BASE_URL = `${BACKEND_BASE_URL}/api/user`;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

axiosRetry(apiClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.response?.status === 429 ||
           error.response?.status === 503;
  },
});

// ✅ CSRF PROTECTION: Ensure CSRF cookie is set before state-changing requests
let csrfInitialized = false;

const initializeCSRF = async () => {
  if (!csrfInitialized) {
    try {
      await axios.get(`${BACKEND_BASE_URL}/sanctum/csrf-cookie`, {
        withCredentials: true,
      });
      csrfInitialized = true;
    } catch (error) {
      console.error('CSRF cookie initialization failed:', error);
    }
  }
};

// Request Interceptor - Add Auth Token & CSRF
apiClient.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ Ensure CSRF for FormData uploads and state-changing requests
    if (config.method !== 'get' && config.method !== 'head') {
      await initializeCSRF();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor - Handle Errors & Token Expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      
      // Avoid redirect loop
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;