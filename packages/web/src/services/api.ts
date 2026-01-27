import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on auth check endpoint - it's expected to return 401 when not authenticated
    const isAuthCheck = error.config?.url === '/auth/check';
    if (error.response?.status === 401 && !isAuthCheck) {
      // Redirect to login if not authenticated
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (password: string) => api.post('/auth/login', { password }),
  logout: () => api.post('/auth/logout'),
  check: () => api.get<{ authenticated: boolean; passwordRequired: boolean }>('/auth/check'),
};

// Settings
export const settingsApi = {
  get: () => api.get('/settings'),
  getPublic: () => api.get('/settings/public'),
  update: (data: Record<string, unknown>) => api.put('/settings', data),
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    return api.post('/settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Customers
export const customersApi = {
  getAll: () => api.get('/customers'),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: Record<string, unknown>) => api.post('/customers', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
};

// Entries
export const entriesApi = {
  getAll: (params?: Record<string, string>) => api.get('/entries', { params }),
  getById: (id: string) => api.get(`/entries/${id}`),
  getUnbilled: (customerId: string) => api.get(`/entries/unbilled/${customerId}`),
  create: (data: Record<string, unknown>) => api.post('/entries', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/entries/${id}`, data),
  delete: (id: string) => api.delete(`/entries/${id}`),
  previewImport: (file: File, customerId: string, hourlyRate: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('customerId', customerId);
    formData.append('hourlyRate', hourlyRate.toString());
    return api.post('/entries/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  import: (file: File, customerId: string, hourlyRate: number, filename: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('customerId', customerId);
    formData.append('hourlyRate', hourlyRate.toString());
    formData.append('filename', filename);
    return api.post('/entries/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Invoices
export const invoicesApi = {
  getAll: (params?: Record<string, string>) => api.get('/invoices', { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  getSummary: () => api.get('/invoices/summary'),
  create: (data: Record<string, unknown>) => api.post('/invoices', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  addEntries: (id: string, entryIds: string[]) => api.post(`/invoices/${id}/entries`, { entryIds }),
  removeEntry: (id: string, entryId: string) => api.delete(`/invoices/${id}/entries/${entryId}`),
  recalculate: (id: string) => api.post(`/invoices/${id}/recalculate`),
  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  send: (id: string, email?: string) => api.post(`/invoices/${id}/send`, { email }),
};
