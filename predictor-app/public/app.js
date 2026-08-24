// Client State Management
const state = {
  accessKey: localStorage.getItem('nova_key') || null,
  userDescription: localStorage.getItem('nova_user_desc') || null,
  isAdmin: localStorage.getItem('nova_admin_authed') === 'true',
  adminPassword: localStorage.getItem('nova_admin_pass') || '',
  history: JSON.parse(sessionStorage.getItem('nova_history') || '[]'),
};

// DOM Elements & Routing
const pages = {
  login: document.getElementById('page-login'),
  predictor: document.getElementById('page-predictor'),
  adminLogin: document.getElementById('page-admin-login'),
  admin: document.getElementById('page-admin'),
};

const navActions = document.getElementById('nav-actions');
const btnAdminNav = document.getElementById('btn-admin-nav');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayKey = document.getElementById('user-display-key');

// Routing Engine
function navigateTo(path) {
  // Hide all pages
  Object.values(pages).forEach(p => p.classList.remove('active'));

  // Routing actions
  if (path === '/admin') {
    if (state.isAdmin && state.adminPassword) {
      pages.admin.classList.add('active');
      loadAdminKeys();
    } else {
      pages.adminLogin.classList.add('active');
    }
    navActions.classList.remove('hidden');
    btnAdminNav.classList.add('hidden'); // Hide admin nav button when already in admin
  } else if (path === '/predictor' || (path === '/' && state.accessKey)) {
    pages.predictor.classList.add('active');
    userDisplayName.textContent = state.userDescription || 'Authorized User';
    userDisplayKey.textContent = state.accessKey.substring(0, 9) + '...';
    navActions.classList.remove('hidden');
    btnAdminNav.classList.remove('hidden');
    renderHistory();
  } else {
    // Default to login page
    pages.login.classList.add('active');
    navActions.classList.add('hidden');
  }

  // Update URL hash without reload for single-page app visual pathing
  window.history.pushState(null, '', path);
}

// Initial Navigation on Page Load
window.addEventListener('load', () => {
  const currentPath = window.location.pathname;
  if (currentPath === '/admin') {
    navigateTo('/admin');
  } else if (state.accessKey) {
    // Validate key with server best effort
    verifyAccessKey(state.accessKey).then(isValid => {
      if (isValid) {
        navigateTo('/predictor');
      } else {
        logout();
      }
    });
  } else {
    navigateTo('/login');
  }
});

// Sync browser back/forward buttons
window.addEventListener('popstate', () => {
  const currentPath = window.location.pathname;
  navigateTo(currentPath);
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.35s ease';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// ================= USER FLOWS =================

// Verify key API utility
async function verifyAccessKey(key) {
  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    return res.ok;
  } catch (err) {
    console.error('Failed to verify access key', err);
    return false;
  }
}

// Handle login form submission
async function handleLogin(e) {
  e.preventDefault();
  const inputKey = document.getElementById('login-key').value.trim();
  const submitBtn = document.getElementById('btn-login-submit');

  if (!inputKey) return;

  submitBtn.disabled = true;
  submitBtn.innerText = 'Verifying Authenticity...';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: inputKey }),
    });

    const data = await res.json();

    if (res.ok) {
      state.accessKey = data.key;
      state.userDescription = data.description || 'Authorized User';
      localStorage.setItem('nova_key', data.key);
      localStorage.setItem('nova_user_desc', data.description || 'Authorized User');
      
      showToast('Key authenticated successfully. Welcome!', 'success');
      navigateTo('/predictor');
    } else {
      showToast(data.error || 'Authentication failed', 'error');
    }
  } catch (err) {
    showToast('Failed to reach server. Try again.', 'error');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Authenticate Device';
  }
}

// Handle Logout
function logout() {
  state.accessKey = null;
  state.userDescription = null;
  localStorage.removeItem('nova_key');
  localStorage.removeItem('nova_user_desc');
  state.history = [];
  sessionStorage.removeItem('nova_history');
  
  showToast('Device connection terminated.', 'info');
  navigateTo('/login');
}

// Handle prediction analysis
async function handlePredict(e) {
  e.preventDefault();
  const number = document.getElementById('predict-number').value.trim();
  if (!number || !state.accessKey) return;

  // UI elements
  const scanContainer = document.getElementById('scanning-container');
  const resultContainer = document.getElementById('result-container');
  const statusMsg = document.getElementById('scanner-status');
  
  // Hide result and show scan
  resultContainer.classList.add('hidden');
  scanContainer.classList.remove('hidden');

  // Scanner status messages list
  const statusSteps = [
    { time: 0, text: 'Opening secure uplink to main frame...' },
    { time: 400, text: 'Fetching historical game sequence statistics...' },
    { time: 800, text: 'Applying vector variance weights...' },
    { time: 1200, text: 'Extracting deterministic block signature...' },
    { time: 1600, text: 'Finalizing color distribution outcome...' }
  ];

  statusSteps.forEach(step => {
    setTimeout(() => {
      if (!scanContainer.classList.contains('hidden')) {
        statusMsg.innerText = step.text;
      }
    }, step.time);
  });

  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, key: state.accessKey }),
    });

    const data = await res.json();

    // Ensure scanner runs for at least 2.0s for high-fidelity user experience
    setTimeout(() => {
      scanContainer.classList.add('hidden');
      if (res.ok) {
        renderPredictionResult(data.prediction, number);
      } else {
        showToast(data.error || 'Prediction process failed', 'error');
        if (res.status === 401 || res.status === 403) {
          logout();
        }
      }
    }, 2000);

  } catch (err) {
    setTimeout(() => {
      scanContainer.classList.add('hidden');
      showToast('Network error during computation.', 'error');
      console.error(err);
    }, 2000);
  }
}

// Display Prediction Outcomes
function renderPredictionResult(pred, period) {
  const resultContainer = document.getElementById('result-container');
  
  // Predict outcomes fields
  const predColor = document.getElementById('pred-color');
  const predColorChips = document.getElementById('pred-color-chips');
  const predSize = document.getElementById('pred-size');
  const predNum = document.getElementById('pred-number');
  const predConf = document.getElementById('pred-confidence');
  
  const cardColor = document.getElementById('outcome-card-color');

  // Set color value and glow classes
  const colorName = pred.color.toUpperCase();
  predColor.textContent = colorName;
  
  // Clear classes
  predColor.className = 'outcome-value';
  cardColor.className = 'outcome-card';

  // Apply colors and glow styling
  if (colorName === 'RED') {
    predColor.classList.add('color-RED');
    cardColor.classList.add('glow-red');
    predColorChips.innerHTML = '<span class="chip chip-red">Red</span>';
  } else if (colorName === 'GREEN') {
    predColor.classList.add('color-GREEN');
    cardColor.classList.add('glow-green');
    predColorChips.innerHTML = '<span class="chip chip-green">Green</span>';
  } else if (colorName === 'RED-VIOLET') {
    predColor.classList.add('color-RED-VIOLET');
    cardColor.classList.add('glow-violet');
    predColorChips.innerHTML = '<span class="chip chip-red">Red</span> <span class="chip chip-violet">Violet</span>';
  } else if (colorName === 'GREEN-VIOLET') {
    predColor.classList.add('color-GREEN-VIOLET');
    cardColor.classList.add('glow-violet');
    predColorChips.innerHTML = '<span class="chip chip-green">Green</span> <span class="chip chip-violet">Violet</span>';
  }

  // Set Size
  predSize.textContent = pred.size.toUpperCase();

  // Set Suggested Number Ball
  predNum.textContent = pred.number;
  predNum.className = 'number-ball';
  
  // Apply visual style on predicted ball
  if (colorName === 'RED') predNum.classList.add('red');
  else if (colorName === 'GREEN') predNum.classList.add('green');
  else if (colorName === 'RED-VIOLET') predNum.classList.add('red-violet');
  else if (colorName === 'GREEN-VIOLET') predNum.classList.add('green-violet');

  // Confidence Meter Circular SVG Animation
  predConf.textContent = `${pred.confidence}%`;
  const circle = document.querySelector('.progress-bar');
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pred.confidence / 100);
  circle.style.strokeDashoffset = offset;

  // Reveal Container
  resultContainer.classList.remove('hidden');

  // Add round to history
  const historyEntry = {
    period,
    color: pred.color,
    size: pred.size,
    number: pred.number,
    confidence: pred.confidence
  };

  // Prevent duplicates of the exact period sequentially
  state.history = state.history.filter(h => h.period !== period);
  state.history.unshift(historyEntry);
  if (state.history.length > 10) state.history.pop();
  sessionStorage.setItem('nova_history', JSON.stringify(state.history));

  renderHistory();
}

// Display past predictions table
function renderHistory() {
  const rowsContainer = document.getElementById('history-rows');
  
  if (state.history.length === 0) {
    rowsContainer.innerHTML = `
      <tr id="no-history-row">
        <td colspan="5" class="text-center text-muted">No rounds analyzed yet in this session.</td>
      </tr>
    `;
    return;
  }

  rowsContainer.innerHTML = '';
  state.history.forEach(item => {
    const row = document.createElement('tr');
    
    // Color cell chips formatting
    let colorChipsHtml = '';
    const colorName = item.color.toUpperCase();
    if (colorName === 'RED') colorChipsHtml = '<span class="chip chip-red">Red</span>';
    else if (colorName === 'GREEN') colorChipsHtml = '<span class="chip chip-green">Green</span>';
    else if (colorName === 'RED-VIOLET') colorChipsHtml = '<span class="chip chip-red">Red</span> <span class="chip chip-violet">Violet</span>';
    else if (colorName === 'GREEN-VIOLET') colorChipsHtml = '<span class="chip chip-green">Green</span> <span class="chip chip-violet">Violet</span>';

    // Digit ball formatting
    let numBallClass = 'number-ball text-sm';
    if (colorName === 'RED') numBallClass += ' red';
    else if (colorName === 'GREEN') numBallClass += ' green';
    else if (colorName === 'RED-VIOLET') numBallClass += ' red-violet';
    else if (colorName === 'GREEN-VIOLET') numBallClass += ' green-violet';

    row.innerHTML = `
      <td><strong>${item.period}</strong></td>
      <td>${colorChipsHtml}</td>
      <td><span class="text-muted">${item.size}</span></td>
      <td><div class="${numBallClass}" style="width: 28px; height: 28px; font-size: 0.9rem; margin-bottom: 0;">${item.number}</div></td>
      <td class="text-gold">${item.confidence}%</td>
    `;
    rowsContainer.appendChild(row);
  });
}

// ================= ADMIN FLOWS =================

// Handle admin authentication
async function handleAdminLogin(e) {
  e.preventDefault();
  const passwordInput = document.getElementById('admin-password').value;
  if (!passwordInput) return;

  try {
    const res = await fetch('/api/admin/keys', {
      method: 'GET',
      headers: {
        'x-admin-password': passwordInput
      }
    });

    if (res.ok) {
      state.isAdmin = true;
      state.adminPassword = passwordInput;
      localStorage.setItem('nova_admin_authed', 'true');
      localStorage.setItem('nova_admin_pass', passwordInput);
      
      showToast('Vault unlocked. Loading interface...', 'success');
      navigateTo('/admin');
    } else {
      showToast('Master password validation failed.', 'error');
    }
  } catch (err) {
    showToast('Vault system link down.', 'error');
    console.error(err);
  }
}

// Fetch access keys list
async function loadAdminKeys() {
  const rowsContainer = document.getElementById('keys-rows');
  if (!state.adminPassword) return;

  try {
    const res = await fetch('/api/admin/keys', {
      method: 'GET',
      headers: {
        'x-admin-password': state.adminPassword
      }
    });

    if (!res.ok) {
      if (res.status === 401) {
        state.isAdmin = false;
        state.adminPassword = '';
        localStorage.removeItem('nova_admin_authed');
        localStorage.removeItem('nova_admin_pass');
        navigateTo('/admin');
      }
      return;
    }

    const data = await res.json();
    
    if (data.keys.length === 0) {
      rowsContainer.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">No predictor access keys generated in this vault.</td>
        </tr>
      `;
      return;
    }

    rowsContainer.innerHTML = '';
    data.keys.forEach(k => {
      const row = document.createElement('tr');
      const formattedDate = new Date(k.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      row.innerHTML = `
        <td><strong class="text-gold">${k.key}</strong></td>
        <td>${k.description}</td>
        <td>
          <label class="switch">
            <input type="checkbox" ${k.isActive ? 'checked' : ''} onchange="toggleKeyStatus('${k.id}')">
            <span class="slider"></span>
          </label>
        </td>
        <td><span class="text-muted text-sm">${formattedDate}</span></td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="deleteKey('${k.id}')">
            Delete
          </button>
        </td>
      `;
      rowsContainer.appendChild(row);
    });

  } catch (err) {
    showToast('Failed to fetch keys from vault database.', 'error');
    console.error(err);
  }
}

// Create new secure key
async function handleCreateKey(e) {
  e.preventDefault();
  const desc = document.getElementById('key-description').value.trim();
  if (!desc) return;

  try {
    const res = await fetch('/api/admin/keys', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': state.adminPassword
      },
      body: JSON.stringify({ description: desc })
    });

    if (res.ok) {
      showToast('Secure access key issued successfully!', 'success');
      document.getElementById('key-description').value = '';
      loadAdminKeys();
    } else {
      const errData = await res.json();
      showToast(errData.error || 'Failed to issue key', 'error');
    }
  } catch (err) {
    showToast('Failed to connect to key generator.', 'error');
    console.error(err);
  }
}

// Toggle key active/suspended status
async function toggleKeyStatus(id) {
  try {
    const res = await fetch('/api/admin/keys/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': state.adminPassword
      },
      body: JSON.stringify({ id })
    });

    if (res.ok) {
      showToast('Key state synchronized.', 'success');
      loadAdminKeys();
    } else {
      showToast('Failed to alter key state.', 'error');
    }
  } catch (err) {
    showToast('Network error while toggling key state.', 'error');
    console.error(err);
  }
}

// Delete key
async function deleteKey(id) {
  if (!confirm('Are you sure you want to permanently delete this access key? This user will be immediately disconnected.')) return;

  try {
    const res = await fetch('/api/admin/keys', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': state.adminPassword
      },
      body: JSON.stringify({ id })
    });

    if (res.ok) {
      showToast('Key deleted permanently.', 'success');
      loadAdminKeys();
    } else {
      showToast('Failed to delete key from vault.', 'error');
    }
  } catch (err) {
    showToast('Network error during deletion.', 'error');
    console.error(err);
  }
}
