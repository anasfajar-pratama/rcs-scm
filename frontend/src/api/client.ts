import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

const TOKEN_KEY = 'rcs_access_token';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1',
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const { token, expiresAt, clear } = useAuthStore.getState();

  // Session expired -> bersihkan auth, ProtectedRoute akan redirect ke /login
  if (expiresAt && Date.now() >= expiresAt) {
    localStorage.removeItem(TOKEN_KEY);
    clear();
    return config;
  }

  const activeToken = token ?? localStorage.getItem(TOKEN_KEY);
  if (activeToken) {
    config.headers.Authorization = `Bearer ${activeToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  },
);

export { TOKEN_KEY };
