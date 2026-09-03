/* =======================================================
   Community Platform - Shared App Utilities & Nav Handler
   ======================================================= */

// 1. Session Helpers
function getCurrentUser() {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('token');
}

function isLoggedIn() {
  return !!getToken() && !!getCurrentUser();
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('You have been logged out.', 'info');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 500);
}

// 2. Client-Side Route Protection
function checkAuth(requiredRoles = []) {
  const user = getCurrentUser();
  const token = getToken();

  if (!token || !user) {
    // Current page filename for redirect
    const pageName = window.location.pathname.split('/').pop() || 'index.html';
    window.location.href = `login.html?redirect=${encodeURIComponent(pageName)}`;
    return false;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.role)) {
    alert(`Access Restricted! This section requires ${requiredRoles.join(' or ')} privileges. Your current role is: ${user.role}`);
    window.location.href = 'index.html';
    return false;
  }

  return true;
}

// 3. Dynamic Navbar Renderer
function renderNavbar() {
  const navContainer = document.getElementById('mainNavbar');
  if (!navContainer) return;

  const user = getCurrentUser();
  const currentPath = window.location.pathname;

  const isHome = currentPath === '/' || currentPath.endsWith('index.html') || currentPath === '';
  const isActivities = currentPath.includes('activities.html');
  const isRequests = currentPath.includes('requests.html');
  const isAdmin = currentPath.includes('admin.html');

  let userNavHTML = '';

  if (user) {
    const roleBadgeClass = {
      'ADMIN': 'badge-role-admin',
      'NGO': 'badge-role-ngo',
      'ORG': 'badge-role-org',
      'USER': 'badge-role-user'
    }[user.role] || 'badge-secondary';

    userNavHTML = `
      <div class="d-flex align-items-center gap-2">
        ${user.role === 'ADMIN' ? `
          <a href="admin.html" class="btn btn-sm btn-outline-danger fw-semibold d-flex align-items-center gap-1 ${isAdmin ? 'active' : ''}">
            <i class="bi bi-shield-lock-fill"></i> Admin Panel
          </a>
        ` : ''}
        <div class="dropdown">
          <button class="btn btn-light btn-sm dropdown-toggle d-flex align-items-center gap-2 border" type="button" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle text-primary"></i>
            <span class="fw-semibold">${(user.name || 'User').split(' ')[0]}</span>
            <span class="badge ${roleBadgeClass} rounded-pill">${user.role}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li class="dropdown-header">
              <div class="fw-bold text-dark">${user.name || 'User'}</div>
              <small class="text-muted">${user.email || ''}</small>
            </li>
            ${user.organization_name ? `<li><span class="dropdown-item-text text-muted small"><i class="bi bi-building"></i> ${user.organization_name}</span></li>` : ''}
            <li><hr class="dropdown-divider"></li>
            ${user.role === 'ADMIN' ? `
              <li><a class="dropdown-item text-danger fw-semibold" href="admin.html"><i class="bi bi-speedometer2 me-2"></i>Admin Dashboard</a></li>
              <li><hr class="dropdown-divider"></li>
            ` : ''}
            <li><a class="dropdown-item" href="activities.html"><i class="bi bi-calendar-event me-2"></i>Activities & Events</a></li>
            <li><a class="dropdown-item" href="requests.html"><i class="bi bi-chat-heart me-2"></i>Help Requests</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="logout()"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
          </ul>
        </div>
      </div>
    `;
  } else {
    userNavHTML = `
      <div class="d-flex align-items-center gap-2">
        <a href="login.html" class="btn btn-outline-primary btn-sm px-3 fw-medium">Log In</a>
        <div class="dropdown">
          <button class="btn btn-primary btn-sm px-3 fw-semibold dropdown-toggle" type="button" data-bs-toggle="dropdown">
            Sign Up
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm">
            <li><a class="dropdown-item" href="register.html?role=USER"><i class="bi bi-person me-2"></i>Join as Volunteer / User</a></li>
            <li><a class="dropdown-item" href="register.html?role=NGO"><i class="bi bi-heart me-2"></i>Register as NGO</a></li>
            <li><a class="dropdown-item" href="register.html?role=ORG"><i class="bi bi-building me-2"></i>Register as Organization</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item text-danger small fw-semibold" href="admin-register.html"><i class="bi bi-shield-lock me-2"></i>Admin Sign Up</a></li>
          </ul>
        </div>
      </div>
    `;
  }

  navContainer.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-custom sticky-top">
      <div class="container">
        <a class="navbar-brand" href="index.html">
          <i class="bi bi-globe-americas text-primary fs-4"></i>
          <span>Civi</span>link
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navContent">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navContent">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-3">
            <li class="nav-item">
              <a class="nav-link ${isHome ? 'active' : ''}" href="index.html">
                <i class="bi bi-house-door me-1"></i> Home
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${isActivities ? 'active' : ''}" href="activities.html">
                <i class="bi bi-calendar-event me-1"></i> Activities & Events
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${isRequests ? 'active' : ''}" href="requests.html">
                <i class="bi bi-chat-heart me-1"></i> Help Requests
              </a>
            </li>
          </ul>
          
          <div class="d-flex align-items-center">
            ${userNavHTML}
          </div>
        </div>
      </div>
    </nav>
  `;
}

// 4. Toast Notification Utility
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toastId = 'toast-' + Date.now();
  const bgClass = {
    success: 'text-bg-success',
    error: 'text-bg-danger',
    danger: 'text-bg-danger',
    warning: 'text-bg-warning',
    info: 'text-bg-primary'
  }[type] || 'text-bg-dark';

  const iconClass = {
    success: 'bi-check-circle-fill',
    error: 'bi-exclamation-triangle-fill',
    danger: 'bi-exclamation-triangle-fill',
    warning: 'bi-exclamation-circle-fill',
    info: 'bi-info-circle-fill'
  }[type] || 'bi-bell-fill';

  const toastHTML = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${iconClass} fs-5"></i>
          <div>${message}</div>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHTML);
  const toastEl = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();

  toastEl.addEventListener('hidden.bs.toast', () => {
    toastEl.remove();
  });
}

// 5. Date Formatter Helper
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
});
