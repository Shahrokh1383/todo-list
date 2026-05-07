import apiClient from './axios';

export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (data) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  uploadAvatar: (formData) => 
    apiClient.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteAvatar: () => apiClient.delete('/auth/avatar'),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (data) => apiClient.post('/auth/reset-password', data),
};

export const taskAPI = {
  getAll: (params, signal) => apiClient.get('/tasks', { params, signal }),
  getById: (id, signal) => apiClient.get(`/tasks/${id}`, { signal }),
  create: (data) => apiClient.post('/tasks', data),
  update: (id, data) => apiClient.put(`/tasks/${id}`, data),
  delete: (id) => apiClient.delete(`/tasks/${id}`),
  restore: (id) => apiClient.post(`/tasks/${id}/restore`),
  forceDelete: (id) => apiClient.delete(`/tasks/${id}/force`),
  getStats: () => apiClient.get('/tasks/stats'),
};

export const folderAPI = {
  getAll: (signal) => apiClient.get('/folders', { signal }),
  getById: (id, signal) => apiClient.get(`/folders/${id}`, { signal }),
  create: (data) => apiClient.post('/folders', data),
  update: (id, data) => apiClient.put(`/folders/${id}`, data),
  delete: (id) => apiClient.delete(`/folders/${id}`),
  forceDelete: (id) => apiClient.delete(`/folders/${id}/force`),
};