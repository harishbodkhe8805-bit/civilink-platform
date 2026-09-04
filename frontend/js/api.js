/* =======================================================
   Centralized API Client
   Manages REST API communication, JWT headers & errors
   ======================================================= */

// Automatically detect the correct API URL (Works on Render, Mobile Phones, LAN IP, and Localhost)
const API_BASE_URL = (window.location.port === '5500')
  ? 'http://localhost:5000/api'
  : (window.location.origin.startsWith('http') ? '/api' : 'http://localhost:5000/api');

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401 && !endpoint.includes('/login') && !endpoint.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('login.html') && !window.location.pathname.includes('register.html') && !window.location.pathname.endsWith('index.html')) {
          window.location.href = 'login.html?expired=1';
        }
      }
      throw new Error(data.error || 'Request failed with status ' + response.status);
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
    if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
      throw new Error('Cannot connect to backend server at http://localhost:5000. Make sure the Node server is running via `npm start`.');
    }
    throw err;
  }
}

// 1. Auth API
const AuthAPI = {
  login: (email, password) => 
    apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  register: (userData) => 
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ ...userData }) }),

  registerAdmin: (adminData) => 
    apiRequest('/auth/admin/register', { method: 'POST', body: JSON.stringify({ ...adminData }) }),

  getCurrentUser: () => 
    apiRequest('/auth/me')
};

// 2. Activities API
const ActivitiesAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/activities${params ? '?' + params : ''}`);
  },

  getById: (id) => 
    apiRequest(`/activities/${id}`),

  create: (activityData) => 
    apiRequest('/activities', { method: 'POST', body: JSON.stringify(activityData) }),

  join: (id) => 
    apiRequest(`/activities/${id}/join`, { method: 'POST' }),

  leave: (id) => 
    apiRequest(`/activities/${id}/leave`, { method: 'POST' }),

  delete: (id) => 
    apiRequest(`/activities/${id}`, { method: 'DELETE' })
};

// 3. Requests API
const RequestsAPI = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/requests${params ? '?' + params : ''}`);
  },

  getMy: () => 
    apiRequest('/requests/my'),

  create: (requestData) => 
    apiRequest('/requests', { method: 'POST', body: JSON.stringify(requestData) }),

  delete: (id) => 
    apiRequest(`/requests/${id}`, { method: 'DELETE' })
};

// 4. Admin API (Strictly protected)
const AdminAPI = {
  getStats: () => 
    apiRequest('/admin/stats'),

  getUsers: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/admin/users${params ? '?' + params : ''}`);
  },

  updateUserStatus: (id, status) => 
    apiRequest(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),

  deleteUser: (id) => 
    apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),

  getRequests: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return apiRequest(`/admin/requests${params ? '?' + params : ''}`);
  },

  moderateRequest: (id, status, admin_notes) => 
    apiRequest(`/admin/requests/${id}/moderate`, { method: 'PUT', body: JSON.stringify({ status, admin_notes }) })
};

// Global Exposure
window.AuthAPI = AuthAPI;
window.ActivitiesAPI = ActivitiesAPI;
window.RequestsAPI = RequestsAPI;
window.AdminAPI = AdminAPI;
