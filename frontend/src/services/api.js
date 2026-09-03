import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:8000/api/v1` : 'http://192.168.1.8:8000/api/v1');

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartattend_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Token Expiration & Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('smartattend_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken
          });
          const { access_token, refresh_token: newRefresh } = res.data;
          localStorage.setItem('smartattend_token', access_token);
          localStorage.setItem('smartattend_refresh_token', newRefresh);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshErr) {
          console.error('Refresh token failed:', refreshErr);
          localStorage.removeItem('smartattend_token');
          localStorage.removeItem('smartattend_refresh_token');
          localStorage.removeItem('smartattend_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
