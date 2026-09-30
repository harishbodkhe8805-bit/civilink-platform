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
            <li class="nav-item ms-lg-2 my-1 my-lg-0">
              <button type="button" class="btn btn-sm btn-sos d-flex align-items-center gap-1 px-3 py-1 shadow-sm" onclick="openSOSModal()">
                <i class="bi bi-exclamation-octagon-fill"></i> SOS Emergency
              </button>
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

// =======================================================
// 6. SOS Emergency System Controller
// =======================================================
function injectSOSComponents() {
  // 1. Inject Floating SOS Button
  if (!document.getElementById('floatingSosButton')) {
    const floatBtn = document.createElement('div');
    floatBtn.id = 'floatingSosButton';
    floatBtn.className = 'floating-sos-btn btn-sos shadow-lg';
    floatBtn.innerHTML = `
      <i class="bi bi-exclamation-octagon-fill fs-5"></i>
      <span class="d-none d-sm-inline">SOS Emergency</span>
    `;
    floatBtn.onclick = openSOSModal;
    document.body.appendChild(floatBtn);
  }

  // 2. Inject SOS Modal
  if (!document.getElementById('sosEmergencyModal')) {
    const modalHTML = `
      <div class="modal fade" id="sosEmergencyModal" tabindex="-1" aria-labelledby="sosModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
          <div class="modal-content border-0 shadow-lg" style="border-top: 6px solid #dc2626 !important;">
            
            <div class="modal-header bg-danger text-white py-3">
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-exclamation-triangle-fill fs-3"></i>
                <div>
                  <h5 class="modal-title fw-bold mb-0" id="sosModalLabel">🚨 EMERGENCY SOS DISPATCH</h5>
                  <small class="opacity-90">Instant Crisis Alert to Disaster Response Teams & Admin</small>
                </div>
              </div>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div class="modal-body p-4">
              <!-- Direct Helplines Bar -->
              <div class="p-3 bg-danger-subtle rounded-3 border border-danger-subtle mb-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <span class="fw-bold text-danger small"><i class="bi bi-telephone-fill me-1"></i> National Helplines:</span>
                  <div class="d-flex flex-wrap gap-2">
                    <a href="tel:112" class="helpline-chip"><i class="bi bi-shield-fill text-danger"></i> 112 (National)</a>
                    <a href="tel:108" class="helpline-chip"><i class="bi bi-hospital-fill text-danger"></i> 108 (Ambulance)</a>
                    <a href="tel:101" class="helpline-chip"><i class="bi bi-fire text-danger"></i> 101 (Fire)</a>
                    <a href="tel:1091" class="helpline-chip"><i class="bi bi-person-heart text-danger"></i> 1091 (Women)</a>
                  </div>
                </div>
              </div>

              <form id="sosEmergencyForm" onsubmit="submitSOSAlert(event)">
                
                <!-- Emergency Type Selector -->
                <div class="mb-3">
                  <label class="form-label fw-bold small text-uppercase text-danger mb-2">1. Select Emergency Type *</label>
                  <div class="row g-2" id="sosTypeGrid">
                    <div class="col-4 col-md-2">
                      <div class="sos-type-card active" onclick="selectSOSType('Medical Emergency', this)">
                        <i class="bi bi-hospital fs-3 d-block mb-1"></i>
                        <span class="small fw-semibold">Medical</span>
                      </div>
                    </div>
                    <div class="col-4 col-md-2">
                      <div class="sos-type-card" onclick="selectSOSType('Flood / Water Disaster', this)">
                        <i class="bi bi-water fs-3 d-block mb-1"></i>
                        <span class="small fw-semibold">Flood/Rain</span>
                      </div>
                    </div>
                    <div class="col-4 col-md-2">
                      <div class="sos-type-card" onclick="selectSOSType('Fire Outbreak', this)">
                        <i class="bi bi-fire fs-3 d-block mb-1"></i>
                        <span class="small fw-semibold">Fire</span>
                      </div>
                    </div>
                    <div class="col-4 col-md-2">
                      <div class="sos-type-card" onclick="selectSOSType('Accident / Rescue Trapped', this)">
                        <i class="bi bi-shield-exclamation fs-3 d-block mb-1"></i>
                        <span class="small fw-semibold">Rescue</span>
                      </div>
                    </div>
                    <div class="col-4 col-md-2">
                      <div class="sos-type-card" onclick="selectSOSType('Critical Food / Water Need', this)">
                        <i class="bi bi-box-seam fs-3 d-block mb-1"></i>
                        <span class="small fw-semibold">Food/Water</span>
                      </div>
                    </div>
                    <div class="col-4 col-md-2">
                      <div class="sos-type-card" onclick="selectSOSType('Other Critical Crisis', this)">
                        <i class="bi bi-exclamation-diamond fs-3 d-block mb-1"></i>
                        <span class="small fw-semibold">Other</span>
                      </div>
                    </div>
                  </div>
                  <input type="hidden" id="sosEmergencyType" value="Medical Emergency" required>
                </div>

                <!-- Live GPS Status & Location -->
                <div class="mb-3 p-3 bg-light rounded-3 border">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <label class="form-label fw-bold small text-dark mb-0">
                      <i class="bi bi-crosshair text-danger me-1"></i>2. Emergency GPS Location *
                    </label>
                    <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 small" onclick="fetchSOSGPS()">
                      <i class="bi bi-arrow-repeat"></i> Refresh GPS
                    </button>
                  </div>
                  
                  <div class="input-group input-group-sm mb-2">
                    <span class="input-group-text bg-white"><i class="bi bi-geo-alt-fill text-danger"></i></span>
                    <input type="text" class="form-control" id="sosLocationText" placeholder="Acquiring live location..." required>
                  </div>

                  <input type="hidden" id="sosLatitude">
                  <input type="hidden" id="sosLongitude">

                  <div id="sosGpsStatus" class="small text-muted d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-info-circle me-1"></i>Acquiring satellite GPS...</span>
                    <span id="sosCoordsBadge" class="badge bg-secondary">No GPS</span>
                  </div>
                </div>

                <!-- Contact & People Information -->
                <div class="row g-3 mb-3">
                  <div class="col-md-6">
                    <label class="form-label fw-semibold small">Victim / Caller Name *</label>
                    <input type="text" class="form-control" id="sosVictimName" placeholder="e.g. Rahul Sharma" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold small">Emergency Contact Number *</label>
                    <input type="tel" class="form-control" id="sosVictimPhone" placeholder="e.g. +91 9876543210" required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold small">Estimated People In Danger</label>
                    <select class="form-select" id="sosPeopleCount">
                      <option value="1 Person (Individual)" selected>1 Person (Individual)</option>
                      <option value="2-5 Persons (Family)">2-5 Persons (Family)</option>
                      <option value="5-15 Persons (Small Group)">5-15 Persons (Small Group)</option>
                      <option value="15-50+ Persons (Community)">15-50+ Persons (Community)</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label fw-semibold small">Brief Crisis Details / Landmark</label>
                    <input type="text" class="form-control" id="sosDescription" placeholder="e.g. Water rising rapidly on ground floor near temple">
                  </div>
                </div>

                <div class="alert alert-warning small py-2 mb-0 d-flex align-items-center gap-2">
                  <i class="bi bi-exclamation-triangle-fill fs-5 text-warning flex-shrink-0"></i>
                  <div>
                    Submitting dispatches an <strong>Immediate Critical Broadcast</strong> to Civilink Disaster Coordinators & Admin with live GPS.
                  </div>
                </div>

                <div class="mt-4 d-flex justify-content-between align-items-center">
                  <button type="button" class="btn btn-secondary px-4" data-bs-dismiss="modal">Cancel</button>
                  <button type="submit" class="btn btn-danger btn-lg fw-bold px-4 shadow" id="sosSubmitBtn" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);">
                    <span id="sosSpinner" class="spinner-border spinner-border-sm d-none me-2"></span>
                    <i class="bi bi-broadcast me-1"></i> DISPATCH SOS SIGNAL NOW
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  }
}

function selectSOSType(type, element) {
  document.getElementById('sosEmergencyType').value = type;
  document.querySelectorAll('.sos-type-card').forEach(card => card.classList.remove('active'));
  element.classList.add('active');
}

function openSOSModal() {
  injectSOSComponents();

  // Prefill victim details if user is logged in
  const user = getCurrentUser();
  if (user) {
    const nameInput = document.getElementById('sosVictimName');
    const phoneInput = document.getElementById('sosVictimPhone');
    if (nameInput && !nameInput.value) nameInput.value = user.name || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = user.phone || '';
  }

  // Fetch live GPS immediately
  fetchSOSGPS();

  const modalEl = document.getElementById('sosEmergencyModal');
  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

function fetchSOSGPS() {
  const statusEl = document.getElementById('sosGpsStatus');
  const locInput = document.getElementById('sosLocationText');
  const latInput = document.getElementById('sosLatitude');
  const lngInput = document.getElementById('sosLongitude');
  const badgeEl = document.getElementById('sosCoordsBadge');

  if (!navigator.geolocation) {
    if (statusEl) statusEl.innerHTML = '<span class="text-danger small">Geolocation not supported on this device.</span>';
    return;
  }

  if (statusEl) statusEl.innerHTML = '<span class="text-danger small"><span class="spinner-border spinner-border-sm me-1"></span> Fetching high-accuracy GPS...</span>';

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = Math.round(position.coords.accuracy);

      if (latInput) latInput.value = lat;
      if (lngInput) lngInput.value = lng;

      if (badgeEl) {
        badgeEl.className = 'badge bg-success';
        badgeEl.textContent = `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

      if (statusEl) {
        statusEl.innerHTML = `
          <span class="text-success small fw-semibold">
            <i class="bi bi-check-circle-fill"></i> GPS Locked (±${accuracy}m)
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" class="ms-1 text-primary text-decoration-none">
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
          </span>
          <span class="badge bg-success-subtle text-success border border-success-subtle">📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
        `;
      }

      // Reverse geocode to auto-fill human readable location
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name && locInput && (!locInput.value || locInput.dataset.auto === 'true')) {
          const parts = data.display_name.split(',');
          locInput.value = parts.slice(0, 3).join(',').trim();
          locInput.dataset.auto = 'true';
        }
      } catch (e) {
        if (locInput && !locInput.value) {
          locInput.value = `GPS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
      }
    },
    (err) => {
      if (statusEl) {
        statusEl.innerHTML = '<span class="text-warning small"><i class="bi bi-exclamation-triangle"></i> Location permission denied. Please enter address manually.</span>';
      }
    },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
  );
}

async function submitSOSAlert(e) {
  e.preventDefault();

  const emergency_type = document.getElementById('sosEmergencyType').value;
  const location = document.getElementById('sosLocationText').value.trim();
  const latitude = document.getElementById('sosLatitude').value;
  const longitude = document.getElementById('sosLongitude').value;
  const name = document.getElementById('sosVictimName').value.trim();
  const phone = document.getElementById('sosVictimPhone').value.trim();
  const people_count = document.getElementById('sosPeopleCount').value;
  const description = document.getElementById('sosDescription').value.trim();

  const spinner = document.getElementById('sosSpinner');
  const btn = document.getElementById('sosSubmitBtn');

  if (spinner) spinner.classList.remove('d-none');
  if (btn) btn.disabled = true;

  try {
    const res = await apiRequest('/requests/sos', {
      method: 'POST',
      body: JSON.stringify({
        emergency_type,
        location,
        latitude,
        longitude,
        name,
        phone,
        people_count,
        description
      })
    });

    // Close Modal
    const modalEl = document.getElementById('sosEmergencyModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Show High Visibility Success Alert
    alert(`🚨 EMERGENCY SOS DISPATCHED SUCCESSFULLY!\n\nYour emergency signal has been broadcasted to Civilink Disaster Coordinators and Admin.\n\nHelpline numbers for immediate phone call:\n📞 112 (National)\n📞 108 (Ambulance)\n📞 101 (Fire)`);

    showToast('🚨 SOS Emergency Signal Broadcasted Successfully!', 'danger');

    // Reset Form
    document.getElementById('sosEmergencyForm').reset();

    // If on requests page, reload list
    if (typeof loadRequests === 'function') {
      loadRequests();
    }
  } catch (err) {
    alert(`Failed to dispatch SOS: ${err.message}`);
    showToast(err.message || 'Failed to dispatch SOS.', 'danger');
  } finally {
    if (spinner) spinner.classList.add('d-none');
    if (btn) btn.disabled = false;
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  renderNavbar();
  injectSOSComponents();
});
