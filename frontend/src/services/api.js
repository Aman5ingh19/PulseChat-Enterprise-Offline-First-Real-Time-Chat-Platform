import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor to inject JWT Bearer token into all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('chat_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for centralized 401 unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect if checking /auth/login or /auth/register
      const url = error.config.url;
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        console.warn('Authentication expired or unauthorized. Logging out.');
        localStorage.removeItem('chat_token');
        localStorage.removeItem('chat_user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (usernameOrEmail, password) => {
    const res = await api.post('/auth/login', { usernameOrEmail, password });
    return res.data;
  },
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const conversationApi = {
  list: async () => {
    const res = await api.get('/conversations');
    return res.data;
  },
  getOrCreateDirect: async (recipientId) => {
    const res = await api.post('/conversations/direct', { recipientId });
    return res.data;
  },
  getMessages: async (conversationId, page = 0, size = 50) => {
    const res = await api.get(`/conversations/${conversationId}/messages`, {
      params: { page, size },
    });
    return res.data;
  },
  sendMessage: async (conversationId, payload) => {
    const res = await api.post(`/conversations/${conversationId}/messages`, payload);
    return res.data;
  },
  markAsRead: async (conversationId) => {
    const res = await api.post(`/conversations/${conversationId}/read`);
    return res.data;
  },
};

export const userApi = {
  search: async (query = '') => {
    const res = await api.get('/users/search', { params: { query } });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },
};

export const syncApi = {
  sync: async (payload) => {
    const res = await api.post('/sync', payload);
    return res.data;
  },
};

export default api;
