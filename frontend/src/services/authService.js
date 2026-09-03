import { api } from './api';

export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },

  registerTeacher: async (data) => {
    const response = await api.post('/auth/register/teacher', data);
    return response.data;
  },

  registerStudent: async (data) => {
    const response = await api.post('/auth/register/student', data);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.warn('Logout server notification failed:', e);
    } finally {
      localStorage.removeItem('smartattend_token');
      localStorage.removeItem('smartattend_refresh_token');
      localStorage.removeItem('smartattend_user');
    }
  }
};
