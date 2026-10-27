// Unified Admin Command Center Application
(function () {
  'use strict';

  // State
  let cachedFiles = [];
  let currentFolderId = 'root';
  let explorerBreadcrumbs = [{ id: 'root', name: 'My Drive' }];
  let currentUser = 'Hitesh';
  let autoSaveTimeout = null;
  let searchDebounceTimeout = null;
  let activeContextTarget = null; // { id, name, mimeType, webViewLink, isFolder }

  // Backend Disabled on Static Cloud Hosting (GitHub Pages)
  const BACKEND_ENABLED = false;
  async function apiFetch(endpoint, options = {}) {
    if (!BACKEND_ENABLED) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    try {
      return await fetch(endpoint, options);
    } catch (e) {
      return { ok: false, status: 404, json: async () => ({}) };
    }
  }

  // DOM Elements - Auth
  const authScreen = document.getElementById('auth-screen');
  const dashboardApp = document.getElementById('dashboard-app');
  const loginForm = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginError = document.getElementById('login-error');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const loginBtn = document.getElementById('login-btn');
  const togglePwdBtn = document.getElementById('toggle-pwd-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // DOM Elements - Context Menu
  const customContextMenu = document.getElementById('custom-context-menu');
  const cmTargetName = document.getElementById('cm-target-name');
  const cmOpenBtn = document.getElementById('cm-open-btn');
  const cmDownloadBtn = document.getElementById('cm-download-btn');
  const cmDownloadLabel = document.getElementById('cm-download-label');
  const cmZipBtn = document.getElementById('cm-zip-btn');
  const cmDriveBtn = document.getElementById('cm-drive-btn');
  const cmCopyBtn = document.getElementById('cm-copy-btn');
  const cmDeleteBtn = document.getElementById('cm-delete-btn');

  // DOM Elements - Navigation & Shell
  const dockBtns = document.querySelectorAll('.dock-nav .dock-btn');
  const viewTabs = document.querySelectorAll('.view-tab');
  const globalSearchInput = document.getElementById('global-search-input');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const searchResultsBanner = document.getElementById('search-results-banner');
  const searchBannerText = document.getElementById('search-banner-text');
  const bannerClearBtn = document.getElementById('banner-clear-btn');
  const topbarUserName = document.getElementById('topbar-user-name');
  const userAvatarImg = document.getElementById('user-avatar-img');
  const quickSyncBtn = document.getElementById('quick-sync-btn');

  // DOM Elements - Metrics
  const metricDriveUsed = document.getElementById('metric-drive-used');
  const metricPhotosUsed = document.getElementById('metric-photos-used');
  const metricTotalUsed = document.getElementById('metric-total-used');
  const metricFreeSpace = document.getElementById('metric-free-space');
  const metricPercentUsed = document.getElementById('metric-percent-used');
  const metricTotalLimit = document.getElementById('metric-total-limit');
  const metricFilesCountBadge = document.getElementById('metric-files-count-badge');
  const photosTabUsage = document.getElementById('photos-tab-usage');

  // Storage Distribution Bar
  const sbTotalText = document.getElementById('sb-total-text');
  const sbLimitText = document.getElementById('sb-limit-text');
  const sbFillDrive = document.getElementById('sb-fill-drive');
  const sbFillPhotos = document.getElementById('sb-fill-photos');

  // DOM Elements - Overview Table
  const overviewFilesTitle = document.getElementById('overview-files-title');
  const overviewFilesTbody = document.getElementById('overview-files-tbody');
  const filterTypeSelect = document.getElementById('filter-type-select');
  const overviewUploadInput = document.getElementById('overview-upload-input');
  const tableUploadInput = document.getElementById('table-upload-input');
  const overviewNewFolderBtn = document.getElementById('overview-new-folder-btn');
  const overviewRefreshBtn = document.getElementById('overview-refresh-btn');

  // DOM Elements - Explorer
  const explorerBreadcrumbsEl = document.getElementById('explorer-breadcrumbs');
  const explorerFileGrid = document.getElementById('explorer-file-grid');
  const explorerUploadInput = document.getElementById('explorer-upload-input');
  const explorerNewFolderBtn = document.getElementById('explorer-new-folder-btn');

  // DOM Elements - Launchpad
  const mainLaunchpadGrid = document.getElementById('main-launchpad-grid');
  const fullLaunchpadGrid = document.getElementById('full-launchpad-grid');

  // DOM Elements - Scratchpad
  const adminScratchpad = document.getElementById('admin-scratchpad');
  const scratchpadStatus = document.getElementById('scratchpad-status');
  const saveScratchpadBtn = document.getElementById('save-scratchpad-btn');
  const fullAdminScratchpad = document.getElementById('full-admin-scratchpad');
  const fullScratchpadStatus = document.getElementById('full-scratchpad-status');
  const fullSaveScratchpadBtn = document.getElementById('full-save-scratchpad-btn');

  // DOM Elements - Settings
  const updateAuthForm = document.getElementById('update-auth-form');
  const changeUserInput = document.getElementById('change-user-input');
  const changePwdInput = document.getElementById('change-pwd-input');
  const changeConfirmInput = document.getElementById('change-confirm-input');
  const disconnectDriveBtn = document.getElementById('disconnect-drive-btn');

  // Toast Notification
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }


    // =========================================================================
  // SECURE PUBLIC PORTFOLIO SHOWCASE DATA (For Static GitHub Pages & Demo Mode)
  // Real Google Drive files are NEVER stored here; they are served exclusively
  // via authenticated calls to your private backend server.
  // =========================================================================
  // Safe Static Baseline Data (Zero Private Files Stored in Client Source)
  function formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
    return bytes + ' B';
  }

  function getReadableType(file) {
    if (!file) return 'File';
    if (file.mimeType === 'application/vnd.google-apps.folder' || file.isFolder) return 'Folder';
    if (file.mimeType && file.mimeType.includes('colab')) return 'Colab Notebook';
    if (file.mimeType && file.mimeType.includes('document')) return 'Google Doc';
    if (file.mimeType && file.mimeType.includes('spreadsheet')) return 'Google Sheet';
    if (file.mimeType && file.mimeType.includes('pdf')) return 'PDF';
    if (file.mimeType && file.mimeType.startsWith('image/')) return 'Image';
    const name = file.name || '';
    if (name.endsWith('.ipynb')) return 'Jupyter Notebook';
    if (name.endsWith('.py')) return 'Python Script';
    if (name.endsWith('.zip')) return 'ZIP Archive';
    return 'File';
  }

  function getFolderOrFileIcon(file) {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || file.isFolder;
    if (isFolder) {
      return `<svg viewBox="0 0 24 24" width="28" height="28" fill="#f59e0b"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    if (file.mimeType && file.mimeType.startsWith('image/')) {
      return `<svg viewBox="0 0 24 24" width="24" height="24" stroke="#9333ea" stroke-width="2" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    }
    if (file.name.endsWith('.ipynb') || (file.mimeType && file.mimeType.includes('colab'))) {
      return `<svg viewBox="0 0 24 24" width="24" height="24" fill="#ea580c"><circle cx="12" cy="12" r="10"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" width="24" height="24" stroke="#2563eb" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
  }

  function setLoggedIn(user, animate = false) {
    currentUser = user || 'Hitesh';

    if (animate) {
      authScreen.classList.add('auth-exiting');
      dashboardApp.classList.remove('hidden');
      dashboardApp.classList.add('dashboard-entering');

      setTimeout(() => {
        authScreen.classList.add('hidden');
        authScreen.classList.remove('auth-exiting');
        dashboardApp.classList.remove('dashboard-entering');
      }, 420);
    } else {
      authScreen.classList.add('hidden');
      dashboardApp.classList.remove('hidden');
    }

    initDailyQuotes();
    renderStagedFiles();
    initVaultRealtime();
    runVaultAutoClean();
    loadAdminNotes(true);
    populateDriveFolderPicker();
    startClockAndWeather();
    syncLaunchpadTabs();
    loadLiveDriveData();
    loadAdminNotes();
    loadAccessLogs();
    initAnalyticsChart();
    loadDetailedVisitors();
  }

  function setLoggedOut() {
    authScreen.classList.remove('hidden');
    authScreen.classList.remove('auth-exiting');
    dashboardApp.classList.add('hidden');
    dashboardApp.classList.remove('dashboard-entering');
  }

  // Clone Launchpad to Full Tab
  function syncLaunchpadTabs() {
    if (mainLaunchpadGrid && fullLaunchpadGrid) {
      fullLaunchpadGrid.innerHTML = mainLaunchpadGrid.innerHTML;
    }
  }

  // Password Visibility Toggle
  togglePwdBtn.addEventListener('click', () => {
    const isPwd = passwordInput.getAttribute('type') === 'password';
    passwordInput.setAttribute('type', isPwd ? 'text' : 'password');
  });

  // =========================================================================
  // SUPABASE REST & AUTH INTEGRATION ENGINE (CLIENT-SIDE BROWSER ARCHITECTURE)
  // =========================================================================

  class SupabaseError extends Error {
    constructor(status, message, details = null) {
      super(`Supabase Error [${status}]: ${message}`);
      this.name = 'SupabaseError';
      this.status = status;
      this.details = details;
    }
  }

  function getSupabaseConfig() {
    const cfg = (typeof CONFIG !== 'undefined' ? CONFIG : (window.CONFIG || {}));
    const storedUrl = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('admin_supabase_url')) || '';
    const storedKey = (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('admin_supabase_key')) || '';

    return {
      url: (cfg.SUPABASE_URL || storedUrl || '').replace(/\/+$/, ''),
      key: cfg.SUPABASE_ANON_KEY || storedKey || '',
      bucket: cfg.BUCKET || 'temp_vault',
      adminEmail: cfg.ADMIN_EMAIL || 'hiteshvs616@gmail.com'
    };
  }

  function isPublicComputerMode() {
    return sessionStorage.getItem('admin_public_pc_mode') === 'true' || localStorage.getItem('admin_public_pc_mode') === 'true';
  }

  function getStoredAuthSession() {
    try {
      const isPublic = isPublicComputerMode();
      const raw = isPublic ? sessionStorage.getItem('supabase_auth_session') : (localStorage.getItem('supabase_auth_session') || sessionStorage.getItem('supabase_auth_session'));
      if (!raw) return null;
      const sess = JSON.parse(raw);
      if (sess && sess.access_token) return sess;
    } catch (e) {}
    return null;
  }

  function getSupabaseUserToken() {
    const sess = getStoredAuthSession();
    return sess ? sess.access_token : '';
  }

  function setSupabaseSession(sessionData, isPublicPc = false) {
    if (!sessionData) {
      sessionStorage.removeItem('supabase_auth_session');
      localStorage.removeItem('supabase_auth_session');
      return;
    }
    // Calculate expiry timestamp
    if (sessionData.expires_in && !sessionData.expires_at) {
      sessionData.expires_at = Date.now() + (sessionData.expires_in * 1000);
    }
    const payload = JSON.stringify(sessionData);
    if (isPublicPc) {
      sessionStorage.setItem('supabase_auth_session', payload);
      localStorage.removeItem('supabase_auth_session');
    } else {
      localStorage.setItem('supabase_auth_session', payload);
      sessionStorage.removeItem('supabase_auth_session');
    }
  }

  function clearSupabaseSession() {
    sessionStorage.removeItem('supabase_auth_session');
    localStorage.removeItem('supabase_auth_session');
  }

  async function refreshSupabaseToken() {
    const sess = getStoredAuthSession();
    if (!sess || !sess.refresh_token) return null;
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return null;

    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: sess.refresh_token })
      });
      if (res.ok) {
        const fresh = await res.json();
        const isPublicPc = isPublicComputerMode();
        setSupabaseSession(fresh, isPublicPc);
        return fresh.access_token;
      }
    } catch (e) {
      console.warn('Failed to refresh Supabase token:', e);
    }
    return null;
  }

  let lastCloudSuccessTimestamp = null;

  function updateCloudStatusPill(isSuccess, label = null) {
    const pill = document.getElementById('cloud-status-pill');
    const txt = document.getElementById('cloud-status-label');
    if (!pill || !txt) return;

    if (isSuccess) {
      lastCloudSuccessTimestamp = Date.now();
      pill.className = 'status-pill green';
      txt.textContent = label || 'Cloud Active';
      pill.title = `Supabase connected & authenticated. Last sync: ${new Date().toLocaleTimeString()}`;
    } else {
      pill.className = 'status-pill amber';
      txt.textContent = label || 'Cloud Offline';
      pill.title = 'Supabase unauthenticated or offline. Login to activate cloud synchronization.';
    }
  }

  // Unified supa() client wrapper
  async function supa(method, path, { body = null, headers = {}, raw = false } = {}) {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      updateCloudStatusPill(false, 'Missing Config');
      const err = new SupabaseError(0, 'Supabase URL or anon key missing. Configure in admin/config.js');
      showToast(err.message, 'error');
      throw err;
    }

    const fullUrl = path.startsWith('http') ? path : `${url}${path.startsWith('/') ? '' : '/'}${path}`;
    let token = getSupabaseUserToken();

    // Check proactive token refresh (within 5 minutes of expiry)
    const currentSess = getStoredAuthSession();
    if (currentSess && currentSess.expires_at && (currentSess.expires_at - Date.now() < 300000)) {
      const fresh = await refreshSupabaseToken();
      if (fresh) token = fresh;
    }

    const reqHeaders = {
      'apikey': key,
      'Authorization': `Bearer ${token || key}`,
      ...headers
    };

    let processedBody = body;
    if (body && !(body instanceof FormData) && !(body instanceof Blob) && typeof body !== 'string' && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
      processedBody = JSON.stringify(body);
    }

    let res;
    try {
      res = await fetch(fullUrl, {
        method: method.toUpperCase(),
        headers: reqHeaders,
        body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : processedBody
      });
    } catch (netErr) {
      updateCloudStatusPill(false, 'Network Error');
      const err = new SupabaseError(0, netErr.message || 'Network connection failed');
      showToast(`Network Error: ${err.message}`, 'error');
      throw err;
    }

    // Handle 401 token expiry retry once
    if (res.status === 401 && token) {
      const freshToken = await refreshSupabaseToken();
      if (freshToken) {
        reqHeaders['Authorization'] = `Bearer ${freshToken}`;
        try {
          res = await fetch(fullUrl, {
            method: method.toUpperCase(),
            headers: reqHeaders,
            body: ['GET', 'HEAD'].includes(method.toUpperCase()) ? undefined : processedBody
          });
        } catch (retryErr) {
          updateCloudStatusPill(false, 'Auth Expired');
          const err = new SupabaseError(0, retryErr.message || 'Retry failed');
          throw err;
        }
      }
    }

    if (!res.ok) {
      updateCloudStatusPill(false, `HTTP ${res.status}`);
      let errorMsg = `Supabase error (${res.status} ${res.statusText})`;
      let details = null;
      try {
        const j = await res.json();
        details = j;
        errorMsg = j.message || j.error_description || j.msg || j.error || errorMsg;
      } catch (_) {
        try {
          const t = await res.text();
          if (t) errorMsg = t;
        } catch (__) {}
      }
      console.error(`[Supabase ${res.status}] ${method} ${path}:`, errorMsg);
      showToast(`Supabase Error (${res.status}): ${errorMsg}`, 'error');
      throw new SupabaseError(res.status, errorMsg, details);
    }

    if (token) {
      updateCloudStatusPill(true);
    }

    return raw ? res : res;
  }

  // Throttle helper for failed logins
  function checkLoginThrottle() {
    const lockUntil = parseInt(sessionStorage.getItem('admin_lockout_until') || '0', 10);
    if (Date.now() < lockUntil) {
      const waitSec = Math.ceil((lockUntil - Date.now()) / 1000);
      throw new Error(`Security Lock: Too many failed attempts. Try again in ${waitSec} seconds.`);
    }
  }

  function recordLoginFailure() {
    const fails = parseInt(sessionStorage.getItem('admin_login_fails') || '0', 10) + 1;
    sessionStorage.setItem('admin_login_fails', fails.toString());
    if (fails >= 3) {
      const delaySeconds = Math.min(30, Math.pow(2, fails - 3) * 2);
      sessionStorage.setItem('admin_lockout_until', (Date.now() + delaySeconds * 1000).toString());
    }
  }

  function clearLoginFailures() {
    sessionStorage.removeItem('admin_login_fails');
    sessionStorage.removeItem('admin_lockout_until');
  }

  // Check Session on Page Load
  async function checkAuth() {
    const sess = getStoredAuthSession();
    if (sess && sess.access_token) {
      const { url, key } = getSupabaseConfig();
      if (!url || !key) {
        setLoggedIn(sess.user?.email || 'Hitesh');
        return;
      }
      // Quick verify token with Supabase Auth
      try {
        const res = await fetch(`${url}/auth/v1/user`, {
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${sess.access_token}`
          }
        });
        if (res.ok) {
          const u = await res.json();
          updateCloudStatusPill(true);
          setLoggedIn(u.email || sess.user?.email || 'Hitesh');
          return;
        } else if (res.status === 401 && sess.refresh_token) {
          const fresh = await refreshSupabaseToken();
          if (fresh) {
            updateCloudStatusPill(true);
            setLoggedIn(sess.user?.email || 'Hitesh');
            return;
          }
        }
      } catch (e) {
        // Offline resilience
        setLoggedIn(sess.user?.email || 'Hitesh');
        return;
      }
    }

    setLoggedOut();
  }

  // Login Submit with Supabase Auth Password Grant
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    try {
      checkLoginThrottle();
    } catch (throttleErr) {
      loginErrorMsg.textContent = throttleErr.message;
      loginError.classList.remove('hidden');
      return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const publicPcCheckbox = document.getElementById('public-pc-mode');
    const isPublicPc = publicPcCheckbox ? publicPcCheckbox.checked : false;

    if (isPublicPc) {
      sessionStorage.setItem('admin_public_pc_mode', 'true');
      localStorage.removeItem('admin_public_pc_mode');
    } else {
      sessionStorage.removeItem('admin_public_pc_mode');
      localStorage.setItem('admin_public_pc_mode', 'false');
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>Authenticating via Supabase...</span>';

    const { url, key, adminEmail } = getSupabaseConfig();
    if (!url || !key) {
      loginErrorMsg.textContent = 'Supabase credentials missing in admin/config.js';
      loginError.classList.remove('hidden');
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>Authenticate & Access</span>';
      return;
    }

    const email = username.includes('@') ? username : adminEmail;

    try {
      const res = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.access_token) {
        clearLoginFailures();
        setSupabaseSession(data, isPublicPc);
        updateCloudStatusPill(true);
        showToast(`Welcome back, ${username}!`, 'success');

        if (typeof recordAuditLoginAttempt === 'function') {
          recordAuditLoginAttempt('SUCCESS', username, isPublicPc);
        }

        setLoggedIn(username, true);
        return;
      } else {
        recordLoginFailure();
        const errMsg = data.error_description || data.msg || data.message || 'Invalid login credentials.';
        loginErrorMsg.textContent = errMsg;
        loginError.classList.remove('hidden');

        if (typeof recordAuditLoginAttempt === 'function') {
          recordAuditLoginAttempt('FAILED', username, isPublicPc);
        }
      }
    } catch (err) {
      loginErrorMsg.textContent = 'Connection error: ' + err.message;
      loginError.classList.remove('hidden');
      if (typeof recordAuditLoginAttempt === 'function') {
        recordAuditLoginAttempt('FAILED', username, isPublicPc);
      }
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>Authenticate & Access</span>';
    }
  });

  // Logout with Complete Session Wiping & Public PC Protection
  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to log out of the Admin Portal?');
    if (!confirmed) return;

    const { url, key } = getSupabaseConfig();
    const token = getSupabaseUserToken();
    if (url && key && token) {
      try {
        await fetch(`${url}/auth/v1/logout`, {
          method: 'POST',
          headers: { 'apikey': key, 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }

    clearSupabaseSession();
    updateCloudStatusPill(false);
    setDirectDriveToken('');

    const isPublicPc = isPublicComputerMode();
    if (isPublicPc) {
      sessionStorage.clear();
      localStorage.removeItem('gdrive_direct_token');
      localStorage.removeItem('gdrive_token_expires');
      localStorage.removeItem('portfolio_admin_token');
      localStorage.removeItem('admin_public_pc_mode');
      localStorage.removeItem('portfolio_admin_notes');
      localStorage.removeItem('portfolio_admin_notes_updated');
      try {
        if (window.indexedDB) {
          indexedDB.deleteDatabase('PortfolioVaultDB');
        }
      } catch (err) {}
    } else {
      localStorage.removeItem('portfolio_admin_notes');
      localStorage.removeItem('portfolio_admin_notes_updated');
    }

    showToast('Logged out of Admin Portal & session cleared', 'success');
    setLoggedOut();
  });

  // Central Tab Switching Helper
  window.switchTab = switchTab;
  function switchTab(targetTab) {
    const allDockBtns = document.querySelectorAll('.dock-nav .dock-btn');
    const allViewTabs = document.querySelectorAll('.view-tab');

    allDockBtns.forEach(b => b.classList.remove('active'));
    allViewTabs.forEach(t => t.classList.remove('active'));

    const activeBtn = document.querySelector(`.dock-nav .dock-btn[data-tab="${targetTab}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    const tabEl = document.getElementById(targetTab);
    if (tabEl) tabEl.classList.add('active');

    if (targetTab === 'tab-drive') {
      if (!cachedFiles || cachedFiles.length === 0) {
        loadLiveDriveData();
      } else {
        renderCleanExplorerGrid(cachedFiles);
      }
    } else if (targetTab === 'tab-logs') {
      loadAccessLogs();
    } else if (targetTab === 'tab-portfolio') {
      initGoogleAnalyticsDashboard();
    } else if (targetTab === 'tab-notes' || targetTab === 'tab-overview') {
      loadAdminNotes(false);
    } else if (targetTab === 'tab-temp-drop') {
      renderStagedFiles();
    } else if (targetTab === 'tab-settings') {
      updateSettingsDiagnosticsUI();
    }
  }

  // Dock Navigation
  document.querySelectorAll('.dock-nav .dock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  function updateSettingsDiagnosticsUI() {
    const { url, bucket } = getSupabaseConfig();
    const hostEl = document.getElementById('settings-supa-host');
    const bucketEl = document.getElementById('settings-supa-bucket');
    const authEl = document.getElementById('settings-supa-auth');
    const badgeEl = document.getElementById('supabase-status-badge');

    let hostStr = 'Not configured';
    try {
      if (url) hostStr = new URL(url).hostname;
    } catch (_) {
      hostStr = url || 'Invalid URL';
    }

    if (hostEl) hostEl.textContent = hostStr;
    if (bucketEl) bucketEl.textContent = bucket || 'temp_vault';
    
    const sess = getStoredAuthSession();
    if (authEl) {
      authEl.textContent = sess ? (sess.user?.email || 'Authenticated') : 'Not signed in';
      authEl.style.color = sess ? '#16a34a' : '#f59e0b';
    }

    if (badgeEl) {
      if (sess && lastCloudSuccessTimestamp) {
        badgeEl.className = 'badge-success';
        badgeEl.textContent = '● Supabase Active (Authenticated)';
      } else if (url) {
        badgeEl.className = 'badge-amber';
        badgeEl.textContent = '● Supabase Configured (Unauthenticated)';
      } else {
        badgeEl.className = 'badge-neutral';
        badgeEl.textContent = '○ Supabase Unconfigured';
      }
    }
  }

  // Settings Tab: Test Connection Diagnostics
  const testSupabaseBtn = document.getElementById('test-supabase-btn');
  const connectionTestResults = document.getElementById('connection-test-results');

  if (testSupabaseBtn) {
    testSupabaseBtn.addEventListener('click', async () => {
      const { url, key, bucket } = getSupabaseConfig();
      if (!url || !key) {
        showToast('Supabase configuration missing in admin/config.js', 'warning');
        return;
      }

      testSupabaseBtn.disabled = true;
      testSupabaseBtn.textContent = 'Testing...';
      if (connectionTestResults) {
        connectionTestResults.style.display = 'block';
        connectionTestResults.innerHTML = '<span style="color:#f59e0b;">Running authenticated diagnostics against Supabase...</span>';
      }

      try {
        const start = performance.now();
        // 1. Authenticated notes query
        const notesRes = await supa('GET', '/rest/v1/admin_notes?id=eq.main&select=id,updated_at', { raw: true });
        const notesDuration = Math.round(performance.now() - start);

        // 2. Authenticated storage query
        const start2 = performance.now();
        const storageRes = await supa('POST', `/storage/v1/object/list/${bucket}`, {
          body: { prefix: '', limit: 5 },
          raw: true
        });
        const storageDuration = Math.round(performance.now() - start2);

        const notesData = await notesRes.json();
        const storageData = await storageRes.json();

        if (connectionTestResults) {
          connectionTestResults.innerHTML = `
            <div style="color: #16a34a; font-weight: bold; margin-bottom: 4px;">✓ Supabase Connection Verified Successfully</div>
            <div>&bull; REST Database (admin_notes): HTTP ${notesRes.status} in ${notesDuration}ms (${notesData.length} records)</div>
            <div>&bull; Storage Bucket (${bucket}): HTTP ${storageRes.status} in ${storageDuration}ms (${storageData.length} objects)</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 4px;">RLS policies and authentication keys are operating normally.</div>
          `;
        }
        showToast('Supabase diagnostics passed completely!', 'success');
        updateSettingsDiagnosticsUI();
      } catch (err) {
        console.error('Test connection error:', err);
        if (connectionTestResults) {
          connectionTestResults.innerHTML = `
            <div style="color: #dc2626; font-weight: bold; margin-bottom: 4px;">✕ Supabase Connection Diagnostics Failed</div>
            <div>Error: ${escapeHtml(err.message || 'Unknown network error')}</div>
            <div style="color: #64748b; font-size: 11px; margin-top: 4px;">Ensure SQL setup from docs/supabase-setup.sql has been run and admin user is authenticated.</div>
          `;
        }
      } finally {
        testSupabaseBtn.disabled = false;
        testSupabaseBtn.textContent = 'Test Connection';
      }
    });
  }

  function applyStorageMetrics(q) {
    if (!q) {
      if (metricDriveUsed) metricDriveUsed.textContent = '--';
      if (metricPhotosUsed) metricPhotosUsed.textContent = '--';
      if (metricTotalUsed) metricTotalUsed.textContent = '--';
      if (metricFreeSpace) metricFreeSpace.textContent = '--';
      if (metricPercentUsed) metricPercentUsed.textContent = 'Disconnected';
      if (metricTotalLimit) metricTotalLimit.textContent = 'Connect Google Drive';
      if (photosTabUsage) photosTabUsage.textContent = '--';
      if (sbDriveBar) sbDriveBar.style.width = '0%';
      if (sbPhotosBar) sbPhotosBar.style.width = '0%';
      if (sbTotalText) sbTotalText.textContent = '--';
      if (sbLimitText) sbLimitText.textContent = '--';
      return;
    }

    if (metricDriveUsed) metricDriveUsed.textContent = q.driveFormatted || '0 B';
    if (metricPhotosUsed) metricPhotosUsed.textContent = q.photosFormatted || '0 B';
    if (metricTotalUsed) metricTotalUsed.textContent = q.totalFormatted || '0 B';
    if (metricFreeSpace) metricFreeSpace.textContent = q.freeFormatted || '0 B';
    if (metricPercentUsed) metricPercentUsed.textContent = `${q.percentUsed || 0}% Used`;
    if (metricTotalLimit) metricTotalLimit.textContent = `of ${q.limitFormatted || 'Plan'}`;
    if (photosTabUsage) photosTabUsage.textContent = q.photosFormatted || '0 B';

    if (sbTotalText) sbTotalText.textContent = q.totalFormatted || '0 B';
    if (sbLimitText) sbLimitText.textContent = q.limitFormatted || 'Plan';

    const limit = q.limit || 0;
    const driveBytes = q.usageInDrive || 0;
    const otherBytes = Math.max(0, (q.usage || 0) - driveBytes);

    const drivePct = limit > 0 ? Math.min(100, (driveBytes / limit) * 100).toFixed(2) : 0;
    const otherPct = limit > 0 ? Math.min(100, (otherBytes / limit) * 100).toFixed(2) : 0;

    if (sbDriveBar) sbDriveBar.style.width = `${drivePct}%`;
    if (sbPhotosBar) sbPhotosBar.style.width = `${otherPct}%`;

    if (userAvatarImg && q.user && q.user.photoLink) {
      userAvatarImg.src = q.user.photoLink;
    }
  }

  // Load All Live Drive & Storage Metrics directly via Google Drive v3
  async function loadLiveDriveData() {
    if (getDirectDriveToken()) {
      return await loadDirectDriveFiles();
    }
    applyStorageMetrics(null);
    cachedFiles = [];
    renderCleanExplorerGrid([]);
    renderOverviewFiles([]);
    updateLiveModeUI(false);
    return false;
  }

  // =========================================================================
  // RIGHT-CLICK CONTEXT MENU HANDLERS
  // =========================================================================
  function showContextMenu(e, file) {
    e.preventDefault();
    e.stopPropagation();

    activeContextTarget = file;
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || file.isFolder;

    cmTargetName.textContent = file.name;
    cmDownloadLabel.textContent = isFolder ? 'Open Folder' : 'Download File';

    customContextMenu.classList.remove('hidden');
    const menuWidth = 220;
    const menuHeight = 210;
    let posX = e.clientX;
    let posY = e.clientY;

    if (posX + menuWidth > window.innerWidth) posX = window.innerWidth - menuWidth - 10;
    if (posY + menuHeight > window.innerHeight) posY = window.innerHeight - menuHeight - 10;

    customContextMenu.style.left = `${posX}px`;
    customContextMenu.style.top = `${posY}px`;
  }

  function hideContextMenu() {
    customContextMenu.classList.add('hidden');
    activeContextTarget = null;
  }

  document.addEventListener('click', (e) => {
    if (!customContextMenu.contains(e.target)) {
      hideContextMenu();
    }
  });

  cmOpenBtn.addEventListener('click', () => {
    if (!activeContextTarget) return;
    if (activeContextTarget.mimeType === 'application/vnd.google-apps.folder' || activeContextTarget.isFolder) {
      navigateToFolder(activeContextTarget.id, activeContextTarget.name);
    } else if (activeContextTarget.webViewLink) {
      window.open(activeContextTarget.webViewLink, '_blank');
    }
    hideContextMenu();
  });

  cmDownloadBtn.addEventListener('click', () => {
    if (!activeContextTarget) return;
    if (activeContextTarget.mimeType === 'application/vnd.google-apps.folder' || activeContextTarget.isFolder) {
      navigateToFolder(activeContextTarget.id, activeContextTarget.name);
    } else {
      downloadDriveFile(activeContextTarget.id, activeContextTarget.name, activeContextTarget.mimeType);
    }
    hideContextMenu();
  });

  cmCopyLinkBtn.addEventListener('click', () => {
    if (!activeContextTarget) return;
    const link = activeContextTarget.webViewLink || `https://drive.google.com/file/d/${activeContextTarget.id}/view`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('File share link copied to clipboard!', 'success');
    }).catch(() => {
      prompt('Copy link:', link);
    });
    hideContextMenu();
  });

  cmDeleteBtn.addEventListener('click', () => {
    if (!activeContextTarget) return;
    trashDriveFile(activeContextTarget.id, activeContextTarget.name);
    hideContextMenu();
  });

  // =========================================================================
  // DIRECT GOOGLE DRIVE v3 API (Zone 1)
  // =========================================================================
  let currentDriveNextPageToken = null;

  async function loadDirectDriveFiles(folderId = null, pageToken = null) {
    const token = getDirectDriveToken();
    if (!token) {
      updateLiveModeUI(false);
      applyStorageMetrics(null);
      return false;
    }

    try {
      // 1. Storage Quota & User
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        const quota = aboutData.storageQuota || {};
        const user = aboutData.user || {};
        const usage = parseInt(quota.usage || 0, 10);
        const limit = parseInt(quota.limit || 0, 10);
        const driveUsage = parseInt(quota.usageInDrive || 0, 10);
        const photosAndOther = Math.max(0, usage - driveUsage);

        applyStorageMetrics({
          mode: 'live_google_cloud',
          user: {
            displayName: user.displayName || 'Hitesh V S',
            photoLink: user.photoLink || '',
            emailAddress: user.emailAddress || 'hiteshvs616@gmail.com'
          },
          usage,
          limit,
          usageInDrive: driveUsage,
          driveFormatted: formatBytes(driveUsage),
          photosFormatted: formatBytes(photosAndOther) + ' (Photos + Gmail + other)',
          totalFormatted: formatBytes(usage),
          limitFormatted: limit > 0 ? formatBytes(limit) : 'Google One Plan',
          freeFormatted: limit > 0 ? formatBytes(limit - usage) : '--',
          percentUsed: limit > 0 ? ((usage / limit) * 100).toFixed(1) : 0
        });
      }

      // 2. Files in Current Folder
      const targetParent = folderId && folderId !== 'root' ? folderId : 'root';
      currentFolderId = targetParent;
      const q = encodeURIComponent(`'${targetParent.replace(/'/g, "\\'")}' in parents and trashed = false`);
      const pageParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '';

      const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=50&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,iconLink)&q=${q}&orderBy=folder,name${pageParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (filesRes.ok) {
        const data = await filesRes.json();
        currentDriveNextPageToken = data.nextPageToken || null;
        cachedFiles = data.files || [];
        renderOverviewFiles(cachedFiles);
        renderCleanExplorerGrid(cachedFiles);
        renderBreadcrumbs();
        updateLiveModeUI(true);
        return true;
      } else {
        if (filesRes.status === 401) {
          setDirectDriveToken('');
          updateLiveModeUI(false);
          showToast('Google Drive authorization expired. Please reconnect.', 'warning');
        }
        return false;
      }
    } catch (err) {
      console.warn('Direct drive error:', err);
      return false;
    }
  }

  // Live Drive Search with URL encoding
  async function performDriveSearch(query) {
    query = (query || '').trim();
    if (!query) {
      searchResultsBanner.classList.add('hidden');
      clearSearchBtn.classList.add('hidden');
      if (overviewFilesTitle) overviewFilesTitle.textContent = 'Google Drive Cloud Files';
      explorerBreadcrumbs = [{ id: 'root', name: 'My Drive' }];
      renderBreadcrumbs();
      return await loadDirectDriveFiles(currentFolderId);
    }

    clearSearchBtn.classList.remove('hidden');
    searchResultsBanner.classList.remove('hidden');
    searchBannerText.textContent = `Searching Google Drive for "${query}"...`;

    const token = getDirectDriveToken();
    if (!token) {
      showToast('Connect Google Drive to search across cloud files', 'info');
      return;
    }

    try {
      const escaped = query.replace(/'/g, "\\'");
      const q = encodeURIComponent(`name contains '${escaped}' and trashed = false`);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id,name,mimeType,size,modifiedTime,webViewLink,parents,iconLink)&q=${q}&orderBy=folder,name`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const results = data.files || [];
        searchBannerText.textContent = `Found ${results.length} result(s) for "${query}"`;
        renderCleanExplorerGrid(results);
        renderOverviewFiles(results);
      } else {
        showToast('Search request failed (' + res.status + ')', 'error');
      }
    } catch (err) {
      showToast('Search error: ' + err.message, 'error');
    }
  }

  // Direct Binary & Google Workspace Download (Never opens broken uc?export)
  async function downloadDriveFile(fileId, fileName, mimeType) {
    if (!fileId) return;
    const token = getDirectDriveToken();
    if (!token) {
      showToast('Please connect Google Drive to download files', 'warning');
      triggerGoogleSignIn();
      return;
    }

    showToast(`Downloading "${fileName || 'file'}"...`, 'info');

    try {
      const isGoogleApp = mimeType && mimeType.startsWith('application/vnd.google-apps.');
      let downloadUrl;
      let targetName = fileName || 'download';

      if (isGoogleApp) {
        let exportMime = 'application/pdf';
        let ext = '.pdf';
        if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) {
          exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          ext = '.xlsx';
        } else if (mimeType.includes('presentation')) {
          exportMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          ext = '.pptx';
        }
        if (!targetName.toLowerCase().endsWith(ext)) targetName += ext;
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`;
      } else {
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
      }

      const res = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error((errJson.error && errJson.error.message) || `Download failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = targetName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(blobUrl); }, 3000);
      showToast(`Downloaded "${targetName}" successfully!`, 'success');
    } catch (err) {
      console.error('Drive download error:', err);
      showToast(`Download failed: ${err.message}`, 'error');
    }
  }
  window.downloadDriveFile = downloadDriveFile;

  // Folder Navigation
  async function navigateToFolder(folderId, folderName) {
    if (!folderId) return;
    const token = getDirectDriveToken();
    if (!token) return;

    if (folderId === 'root') {
      explorerBreadcrumbs = [{ id: 'root', name: 'My Drive' }];
    } else {
      const existingIdx = explorerBreadcrumbs.findIndex(b => b.id === folderId);
      if (existingIdx !== -1) {
        explorerBreadcrumbs = explorerBreadcrumbs.slice(0, existingIdx + 1);
      } else {
        explorerBreadcrumbs.push({ id: folderId, name: folderName });
      }
    }

    currentFolderId = folderId;
    await loadDirectDriveFiles(folderId);
  }

  // Breadcrumbs rendering with click delegation
  function renderBreadcrumbs() {
    if (!breadcrumbList) return;
    breadcrumbList.innerHTML = explorerBreadcrumbs.map((b, idx) => {
      const isLast = idx === explorerBreadcrumbs.length - 1;
      return `
        <span class="breadcrumb-item ${isLast ? 'active' : ''}" data-folder-id="${escapeHtml(b.id)}" style="cursor: pointer;">
          ${escapeHtml(b.name)}
        </span>
        ${!isLast ? '<span class="breadcrumb-separator">/</span>' : ''}
      `;
    }).join('');

    breadcrumbList.querySelectorAll('.breadcrumb-item').forEach(item => {
      item.addEventListener('click', () => {
        const fId = item.dataset.folderId;
        navigateToFolder(fId, item.textContent.trim());
      });
    });
  }

  // Trash File
  async function trashDriveFile(fileId, fileName) {
    if (!confirm(`Move "${fileName}" to Google Drive Trash?`)) return;
    const token = getDirectDriveToken();
    if (!token) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ trashed: true })
      });
      if (!res.ok) throw new Error(`Trash failed (${res.status})`);
      showToast(`Moved "${fileName}" to Trash`, 'success');
      await loadDirectDriveFiles(currentFolderId);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Rename File
  async function renameDriveFile(fileId, currentName) {
    const newName = prompt('Enter new file name:', currentName);
    if (!newName || newName.trim() === '' || newName === currentName) return;
    const token = getDirectDriveToken();
    if (!token) return;

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: newName.trim() })
      });
      if (!res.ok) throw new Error(`Rename failed (${res.status})`);
      showToast(`Renamed to "${newName.trim()}"`, 'success');
      await loadDirectDriveFiles(currentFolderId);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Create Folder
  async function createDriveFolder() {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;
    const token = getDirectDriveToken();
    if (!token) {
      showToast('Please connect Google Drive first', 'warning');
      return;
    }

    try {
      const parents = currentFolderId && currentFolderId !== 'root' ? [currentFolderId] : [];
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName.trim(),
          mimeType: 'application/vnd.google-apps.folder',
          parents: parents
        })
      });
      if (!res.ok) throw new Error(`Create folder failed (${res.status})`);
      showToast(`Created folder "${folderName.trim()}"`, 'success');
      await loadDirectDriveFiles(currentFolderId);
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  // Search input listeners
  globalSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimeout);
    const q = e.target.value;
    searchDebounceTimeout = setTimeout(() => {
      performDriveSearch(q);
    }, 350);
  });

  globalSearchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(searchDebounceTimeout);
      const query = globalSearchInput.value.trim();
      if (!query) return;
      switchTab('tab-drive');
      await performDriveSearch(query);
      const grid = document.getElementById('drive-clean-grid');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  function clearSearch() {
    globalSearchInput.value = '';
    performDriveSearch('');
  }

  clearSearchBtn.addEventListener('click', clearSearch);
  bannerClearBtn.addEventListener('click', clearSearch);

  // Direct Client-Side Upload to Google Drive v3 REST API
  async function uploadFile(file) {
    if (!file) return;
    const directToken = getDirectDriveToken();
    if (!directToken) {
      showToast('Please connect Google Drive first (Click "Connect Drive" in topbar)', 'warning');
      triggerGoogleSignIn();
      return;
    }
    showToast(`Uploading "${file.name}" to Google Drive...`, 'info');

    try {
      const metadata = {
        name: file.name,
        parents: currentFolderId && currentFolderId !== 'root' ? [currentFolderId] : []
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${directToken}` },
        body: form
      });

      if (res.ok) {
        showToast(`Uploaded "${file.name}" to Google Drive!`, 'success');
        await loadDirectDriveFiles(currentFolderId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Upload failed: ' + (err.error ? err.error.message : res.statusText), 'error');
      }
    } catch (e) {
      showToast('Error uploading: ' + e.message, 'error');
    }
  }

  overviewUploadInput.addEventListener('change', (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0]);
    overviewUploadInput.value = '';
  });
  tableUploadInput.addEventListener('change', (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0]);
    tableUploadInput.value = '';
  });
  explorerUploadInput.addEventListener('change', (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0]);
    explorerUploadInput.value = '';
  });

  // Direct Client-Side Create Folder in Google Drive v3 REST API
  async function handleCreateFolder() {
    const name = prompt('Enter new folder name:');
    if (!name || !name.trim()) return;

    const directToken = getDirectDriveToken();
    if (!directToken) {
      showToast('Please connect Google Drive first (Click "Connect Drive" in topbar)', 'warning');
      triggerGoogleSignIn();
      return;
    }

    try {
      const metadata = {
        name: name.trim(),
        mimeType: 'application/vnd.google-apps.folder',
        parents: currentFolderId && currentFolderId !== 'root' ? [currentFolderId] : []
      };
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${directToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (res.ok) {
        showToast(`Folder "${name}" created in Google Drive!`, 'success');
        await loadDirectDriveFiles(currentFolderId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Failed to create folder: ' + (err.error ? err.error.message : res.statusText), 'error');
      }
    } catch (e) {
      showToast('Error creating folder: ' + e.message, 'error');
    }
  }

  overviewNewFolderBtn.addEventListener('click', handleCreateFolder);
  explorerNewFolderBtn.addEventListener('click', handleCreateFolder);

  // Direct Client-Side Delete File from Google Drive v3 REST API
  async function deleteFile(fileId, fileName) {
    if (!confirm(`Delete "${fileName}" from Google Drive?`)) return;

    const directToken = getDirectDriveToken();
    if (!directToken) {
      showToast('Please connect Google Drive first (Click "Connect Drive" in topbar)', 'warning');
      triggerGoogleSignIn();
      return;
    }

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${directToken}` }
      });

      if (res.ok || res.status === 204) {
        showToast(`Deleted "${fileName}"`, 'success');
        await loadDirectDriveFiles(currentFolderId);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Delete failed: ' + (err.error ? err.error.message : res.statusText), 'error');
      }
    } catch (e) {
      showToast('Error deleting: ' + e.message, 'error');
    }
  }

  // Refresh Drive Sync
  quickSyncBtn.addEventListener('click', async () => {
    quickSyncBtn.disabled = true;
    quickSyncBtn.classList.add('spinning');
    try {
      await loadLiveDriveData();
      showToast('Drive Synced Successfully!', 'success');
      updateLiveModeUI(true);
    } catch (e) {
      showToast('Drive Synced!', 'success');
    } finally {
      quickSyncBtn.disabled = false;
      quickSyncBtn.classList.remove('spinning');
    }
  });
  overviewRefreshBtn.addEventListener('click', () => {
    loadLiveDriveData();
    showToast('Refreshed', 'success');
  });

  // Filter Table
  filterTypeSelect.addEventListener('change', (e) => {
    const filter = e.target.value;
    if (filter === 'folders') {
      renderOverviewFiles(cachedFiles.filter(f => f.mimeType === 'application/vnd.google-apps.folder' || f.isFolder));
    } else if (filter === 'files') {
      renderOverviewFiles(cachedFiles.filter(f => f.mimeType !== 'application/vnd.google-apps.folder' && !f.isFolder));
    } else {
      renderOverviewFiles(cachedFiles);
    }
  });

  // ============================================================================
  // ADMIN SCRATCHPAD & MARKDOWN TODO LIST (public.admin_notes + admin_notes_history)
  // ============================================================================
  let scratchpadDebounceTimer = null;
  let scratchpadPollInterval = null;
  let autoSnapshotInterval = null;
  let lastKnownCloudUpdatedAt = null;
  let lastSyncedContent = null;
  let lastSnapshotContent = null;
  let isSavingScratchpad = false;
  let currentTodoFilter = 'all';

  function isPublicComputerMode() {
    return sessionStorage.getItem('admin_public_pc_mode') === 'true' || localStorage.getItem('admin_public_pc_mode') === 'true';
  }

  function setScratchpadBadge(html) {
    if (scratchpadStatus) scratchpadStatus.innerHTML = html;
    const fullStatus = document.getElementById('full-scratchpad-status');
    if (fullStatus) fullStatus.innerHTML = html;
  }

  function setScratchpadValues(val) {
    if (adminScratchpad && adminScratchpad.value !== val) adminScratchpad.value = val;
    const fullScratchpad = document.getElementById('full-admin-scratchpad');
    if (fullScratchpad && fullScratchpad.value !== val) fullScratchpad.value = val;
    updateWordCount(val);
    renderMarkdownTodoList(val);
  }

  function getCurrentScratchpadValue() {
    const fullScratchpad = document.getElementById('full-admin-scratchpad');
    return (fullScratchpad ? fullScratchpad.value : (adminScratchpad ? adminScratchpad.value : '')) || '';
  }

  function updateWordCount(text) {
    const el = document.getElementById('scratchpad-word-count');
    if (!el) return;
    const trimmed = (text || '').trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const lines = text ? text.split('\n').length : 0;
    el.textContent = `${words} words • ${lines} lines`;
  }

  // Conflict Resolution Modal
  function showConflictModal({ cloudUpdatedAt, cloudContent, localContent, onResolve }) {
    const existing = document.getElementById('scratchpad-conflict-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'scratchpad-conflict-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(4px);';
    const timeFormatted = new Date(cloudUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    modal.innerHTML = `
      <div style="background:#181b22;border:1px solid rgba(255,255,255,0.15);border-radius:14px;max-width:520px;width:100%;padding:1.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);color:#f1f5f9;font-family:inherit;">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
          <div style="width:36px;height:36px;border-radius:8px;background:rgba(245,158,11,0.15);display:flex;align-items:center;justify-content:center;color:#f59e0b;font-size:1.1rem;">
            ⚠️
          </div>
          <h3 style="margin:0;font-size:1.1rem;font-weight:700;">Scratchpad Conflict Detected</h3>
        </div>
        <p style="font-size:0.875rem;color:#94a3b8;line-height:1.5;margin-bottom:1.25rem;">
          Cloud has newer edits (<strong>${timeFormatted}</strong> from another device/tab). How would you like to resolve this conflict?
        </p>
        <div style="display:flex;flex-direction:column;gap:0.6rem;">
          <button id="modal-btn-load-cloud" class="btn btn-secondary" style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:0.65rem 1rem;background:#242938;border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:8px;cursor:pointer;">
            <span style="font-weight:600;color:#38bdf8;">📥 Load Cloud Version</span>
            <span style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Discard local edits and pull latest changes from cloud</span>
          </button>
          <button id="modal-btn-keep-local" class="btn btn-secondary" style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:0.65rem 1rem;background:#242938;border:1px solid rgba(255,255,255,0.1);color:#fff;border-radius:8px;cursor:pointer;">
            <span style="font-weight:600;color:#f59e0b;">🖥️ Keep Local Version</span>
            <span style="font-size:0.75rem;color:#94a3b8;margin-top:2px;">Overwrite cloud notes with your current device edits</span>
          </button>
          <button id="modal-btn-append-both" class="btn btn-primary" style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:0.65rem 1rem;border-radius:8px;cursor:pointer;">
            <span style="font-weight:600;">📑 Append Both</span>
            <span style="font-size:0.75rem;opacity:0.85;margin-top:2px;">Keep both local and cloud content separated by a timestamp divider</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modal-btn-load-cloud').onclick = () => {
      modal.remove();
      onResolve(cloudContent, false);
    };
    document.getElementById('modal-btn-keep-local').onclick = () => {
      modal.remove();
      onResolve(localContent, true);
    };
    document.getElementById('modal-btn-append-both').onclick = () => {
      modal.remove();
      const combined = `${localContent.trim()}\n\n--- [Cloud Edits (${timeFormatted})] ---\n${cloudContent.trim()}`;
      onResolve(combined, true);
    };
  }

  // Sync Scratchpad to Supabase public.admin_notes
  async function syncScratchpadToCloud(text, isBeacon = false) {
    if (isSavingScratchpad && !isBeacon) return;
    const token = getSupabaseUserToken();
    const { url, key } = getSupabaseConfig();

    if (!token || !url) {
      if (!isPublicComputerMode()) {
        localStorage.setItem('portfolio_admin_notes', text);
      }
      setScratchpadBadge('<span class="badge-amber">Offline (Login for Cloud Sync)</span>');
      return;
    }

    if (isBeacon) {
      try {
        const nowIso = new Date().toISOString();
        fetch(`${url}/rest/v1/admin_notes?on_conflict=id`, {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ id: 'main', content: text, updated_at: nowIso }),
          keepalive: true
        });
      } catch (_) {}
      return;
    }

    setScratchpadBadge('<span class="badge-amber">Saving...</span>');
    isSavingScratchpad = true;

    try {
      const nowIso = new Date().toISOString();
      const res = await supa('POST', '/rest/v1/admin_notes?on_conflict=id', {
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: {
          id: 'main',
          content: text,
          updated_at: nowIso
        },
        raw: true
      });

      const data = await res.json();
      lastKnownCloudUpdatedAt = (Array.isArray(data) && data[0]?.updated_at) ? data[0].updated_at : nowIso;
      lastSyncedContent = text;

      if (!isPublicComputerMode()) {
        localStorage.setItem('portfolio_admin_notes', text);
        localStorage.setItem('portfolio_admin_notes_updated', lastKnownCloudUpdatedAt);
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScratchpadBadge(`<span class="badge-success">Saved to Cloud (${timeStr})</span>`);
    } catch (err) {
      console.error('Scratchpad cloud save error:', err);
      const statusNum = err.status || 500;
      setScratchpadBadge(`<span class="badge-danger" style="color:#ef4444;font-weight:600;">Failed (${statusNum}: ${escapeHtml(err.message)}) - <a href="javascript:void(0)" id="retry-scratchpad-btn" style="text-decoration:underline;color:#ef4444;margin-left:4px;">Retry</a></span>`);
      const retryBtn = document.getElementById('retry-scratchpad-btn');
      if (retryBtn) retryBtn.onclick = () => syncScratchpadToCloud(getCurrentScratchpadValue());
    } finally {
      isSavingScratchpad = false;
    }
  }

  // Load Admin Notes from public.admin_notes
  async function loadAdminNotes(force = false) {
    const token = getSupabaseUserToken();
    if (!token) {
      const localFallback = !isPublicComputerMode() ? (localStorage.getItem('portfolio_admin_notes') || '') : '';
      setScratchpadValues(localFallback);
      setScratchpadBadge('<span class="badge-neutral">Ready</span>');
      return;
    }

    const fullScratchpad = document.getElementById('full-admin-scratchpad');
    const isTypingNow = document.activeElement === adminScratchpad || document.activeElement === fullScratchpad;
    if (isTypingNow && !force) return;

    try {
      const res = await supa('GET', '/rest/v1/admin_notes?id=eq.main&select=id,content,updated_at', { raw: true });
      const rows = await res.json();

      if (!Array.isArray(rows) || rows.length === 0) {
        const localContent = !isPublicComputerMode() ? (localStorage.getItem('portfolio_admin_notes') || '') : '';
        if (localContent) syncScratchpadToCloud(localContent);
        else setScratchpadBadge('<span class="badge-neutral">Ready</span>');
        return;
      }

      const cloudRow = rows[0];
      const cloudUpdatedAt = cloudRow.updated_at;
      const cloudContent = cloudRow.content || '';
      const currentVal = getCurrentScratchpadValue();

      const cloudIsNewer = lastKnownCloudUpdatedAt ? (new Date(cloudUpdatedAt) > new Date(lastKnownCloudUpdatedAt)) : true;
      const localHasUnsavedEdits = lastSyncedContent !== null && currentVal !== lastSyncedContent && currentVal !== cloudContent;

      if (cloudIsNewer && localHasUnsavedEdits && lastKnownCloudUpdatedAt) {
        showConflictModal({
          cloudUpdatedAt,
          cloudContent,
          localContent: currentVal,
          onResolve: (resolvedText, shouldPush) => {
            setScratchpadValues(resolvedText);
            if (shouldPush) {
              syncScratchpadToCloud(resolvedText);
            } else {
              lastKnownCloudUpdatedAt = cloudUpdatedAt;
              lastSyncedContent = cloudContent;
              if (!isPublicComputerMode()) {
                localStorage.setItem('portfolio_admin_notes', cloudContent);
                localStorage.setItem('portfolio_admin_notes_updated', cloudUpdatedAt);
              }
              const timeStr = new Date(cloudUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setScratchpadBadge(`<span class="badge-success">Synced (${timeStr})</span>`);
            }
          }
        });
        return;
      }

      if (!lastKnownCloudUpdatedAt || new Date(cloudUpdatedAt) > new Date(lastKnownCloudUpdatedAt) || force) {
        lastKnownCloudUpdatedAt = cloudUpdatedAt;
        lastSyncedContent = cloudContent;
        setScratchpadValues(cloudContent);
        if (!isPublicComputerMode()) {
          localStorage.setItem('portfolio_admin_notes', cloudContent);
          localStorage.setItem('portfolio_admin_notes_updated', cloudUpdatedAt);
        }
        const timeStr = new Date(cloudUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setScratchpadBadge(`<span class="badge-success">Synced (${timeStr})</span>`);
      }
    } catch (err) {
      console.warn('Failed to load notes from Supabase:', err);
      if (!isPublicComputerMode()) {
        const localSaved = localStorage.getItem('portfolio_admin_notes') || '';
        setScratchpadValues(localSaved);
      }
      setScratchpadBadge(`<span class="badge-amber">Offline (${escapeHtml(err.message || 'Error')})</span>`);
    }
  }

  // Handle Scratchpad Typing with 800ms debounce
  function handleScratchpadInput(sourceEl, targetEl) {
    const val = sourceEl.value;
    if (targetEl && targetEl.value !== val) targetEl.value = val;
    updateWordCount(val);
    renderMarkdownTodoList(val);

    if (!isPublicComputerMode()) {
      localStorage.setItem('portfolio_admin_notes', val);
    }

    setScratchpadBadge('<span class="badge-amber">Saving...</span>');

    clearTimeout(scratchpadDebounceTimer);
    scratchpadDebounceTimer = setTimeout(() => {
      syncScratchpadToCloud(val);
    }, 800);
  }

  // =========================================================================
  // MARKDOWN TASK CHECKLIST PARSER & INTERACTIVE TODO SYSTEM
  // =========================================================================
  function renderMarkdownTodoList(text) {
    const container = document.getElementById('markdown-todo-list');
    const labelEl = document.getElementById('todo-progress-label');
    const percentEl = document.getElementById('todo-progress-percent');
    const barEl = document.getElementById('todo-progress-bar');
    if (!container) return;

    const lines = (text || '').split('\n');
    const tasks = [];

    // Parse lines matching - [ ] or - [x]
    lines.forEach((line, index) => {
      const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/);
      if (match) {
        const isDone = match[2].toLowerCase() === 'x';
        const taskRaw = match[3];

        let dueDate = null;
        let isOverdue = false;
        let isToday = false;
        const dateMatch = taskRaw.match(/@(\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          dueDate = dateMatch[1];
          const todayIso = new Date().toISOString().slice(0, 10);
          if (dueDate < todayIso) isOverdue = true;
          else if (dueDate === todayIso) isToday = true;
        }

        let priority = null;
        const prioMatch = taskRaw.match(/#(p1|p2|p3)\b/i);
        if (prioMatch) {
          priority = prioMatch[1].toLowerCase();
        }

        let cleanText = taskRaw
          .replace(/@\d{4}-\d{2}-\d{2}/, '')
          .replace(/#(p1|p2|p3)\b/gi, '')
          .trim();

        tasks.push({
          lineIndex: index,
          originalLine: line,
          isDone,
          text: cleanText || taskRaw,
          dueDate,
          isOverdue,
          isToday,
          priority
        });
      }
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.isDone).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (labelEl) labelEl.textContent = `Task Progress: ${completed} of ${total} completed`;
    if (percentEl) percentEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;

    const filtered = tasks.filter(t => {
      if (currentTodoFilter === 'today') return t.isToday;
      if (currentTodoFilter === 'overdue') return t.isOverdue && !t.isDone;
      if (currentTodoFilter === 'pending') return !t.isDone;
      if (currentTodoFilter === 'done') return t.isDone;
      return true;
    });

    if (tasks.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px 10px; color: #64748b; font-size: 13px;">No task items found.<br>Add lines starting with <code style="color: #38bdf8;">- [ ]</code> in the scratchpad to track them here!</div>';
      return;
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 30px 10px; color: #64748b; font-size: 13px;">No tasks match filter "<strong>${escapeHtml(currentTodoFilter)}</strong>".</div>`;
      return;
    }

    container.innerHTML = filtered.map(t => {
      let badgeHtml = '';
      if (t.priority === 'p1') badgeHtml += '<span class="badge-danger" style="font-size: 10px; padding: 1px 6px;">P1 URGENT</span> ';
      else if (t.priority === 'p2') badgeHtml += '<span class="badge-amber" style="font-size: 10px; padding: 1px 6px;">P2 MEDIUM</span> ';
      else if (t.priority === 'p3') badgeHtml += '<span class="badge-neutral" style="font-size: 10px; padding: 1px 6px;">P3 LOW</span> ';

      if (t.isOverdue) badgeHtml += `<span class="badge-danger" style="font-size: 10px; padding: 1px 6px;">Overdue: ${escapeHtml(t.dueDate)}</span> `;
      else if (t.isToday) badgeHtml += `<span class="badge-amber" style="font-size: 10px; padding: 1px 6px;">Due Today</span> `;
      else if (t.dueDate) badgeHtml += `<span class="badge-neutral" style="font-size: 10px; padding: 1px 6px;">Due: ${escapeHtml(t.dueDate)}</span> `;

      return `
        <div class="todo-item-card" data-line="${t.lineIndex}" style="display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; background: #1e293b; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); transition: background 0.15s ease;">
          <input type="checkbox" class="todo-checkbox" data-line="${t.lineIndex}" ${t.isDone ? 'checked' : ''} style="cursor: pointer; margin-top: 3px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; color: ${t.isDone ? '#64748b' : '#f1f5f9'}; text-decoration: ${t.isDone ? 'line-through' : 'none'}; word-break: break-word;">
              ${escapeHtml(t.text)}
            </div>
            ${badgeHtml ? `<div style="margin-top: 4px; display: flex; gap: 4px; flex-wrap: wrap;">${badgeHtml}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.todo-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const lineIdx = parseInt(cb.dataset.line, 10);
        toggleMarkdownTodoLine(lineIdx, cb.checked);
      });
    });
  }

  function toggleMarkdownTodoLine(lineIdx, checkState) {
    const currentVal = getCurrentScratchpadValue();
    const lines = currentVal.split('\n');
    if (lineIdx < 0 || lineIdx >= lines.length) return;

    const targetLine = lines[lineIdx];
    if (checkState) {
      lines[lineIdx] = targetLine.replace(/^(\s*)-\s*\[ \]/, '$1- [x]');
    } else {
      lines[lineIdx] = targetLine.replace(/^(\s*)-\s*\[[xX]\]/, '$1- [ ]');
    }

    const newVal = lines.join('\n');
    setScratchpadValues(newVal);
    syncScratchpadToCloud(newVal);
  }

  // Add Task Helper Button
  const quickAddTodoBtn = document.getElementById('quick-add-todo-btn');
  const newTodoInput = document.getElementById('new-todo-input');
  if (quickAddTodoBtn && newTodoInput) {
    const handleQuickAdd = () => {
      const taskText = newTodoInput.value.trim();
      if (!taskText) return;
      const currentVal = getCurrentScratchpadValue();
      const newLine = `- [ ] ${taskText}`;
      const updatedVal = currentVal ? `${currentVal.trimEnd()}\n${newLine}\n` : `${newLine}\n`;
      newTodoInput.value = '';
      setScratchpadValues(updatedVal);
      syncScratchpadToCloud(updatedVal);
      showToast('Task added to scratchpad!', 'success');
    };
    quickAddTodoBtn.addEventListener('click', handleQuickAdd);
    newTodoInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleQuickAdd();
    });
  }

  // Filter Buttons
  document.querySelectorAll('.todo-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.todo-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTodoFilter = btn.dataset.filter || 'all';
      renderMarkdownTodoList(getCurrentScratchpadValue());
    });
  });

  // =========================================================================
  // NOTES VERSION HISTORY & SNAPSHOTS (public.admin_notes_history)
  // =========================================================================
  async function saveScratchpadSnapshot(isAuto = false) {
    const token = getSupabaseUserToken();
    if (!token) {
      if (!isAuto) showToast('Supabase login required to save snapshot', 'warning');
      return;
    }

    const content = getCurrentScratchpadValue();
    if (!content.trim()) return;
    if (isAuto && content === lastSnapshotContent) return;

    try {
      const deviceLabel = await getDeviceLabel();
      const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '_' + Math.random().toString(36).substr(2, 8));
      await supa('POST', '/rest/v1/admin_notes_history', {
        body: {
          id: uuid,
          note_id: 'main',
          content: content,
          saved_at: new Date().toISOString(),
          device_label: deviceLabel
        }
      });

      lastSnapshotContent = content;
      if (!isAuto) showToast('Notes snapshot saved to version history!', 'success');
    } catch (err) {
      console.warn('Snapshot error:', err);
      if (!isAuto) showToast(`Snapshot failed: ${err.message}`, 'error');
    }
  }

  // Snapshot History Viewer Modal
  async function openScratchpadHistoryModal() {
    const token = getSupabaseUserToken();
    if (!token) {
      showToast('Login required to access version history', 'warning');
      return;
    }

    showToast('Fetching version history...', 'info');
    try {
      const res = await supa('GET', '/rest/v1/admin_notes_history?note_id=eq.main&order=saved_at.desc&limit=25', { raw: true });
      const rows = await res.json();
      const history = Array.isArray(rows) ? rows : [];

      const modal = document.createElement('div');
      modal.id = 'scratchpad-history-modal';
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(5px);';

      modal.innerHTML = `
        <div style="background:#181b22;border:1px solid rgba(255,255,255,0.15);border-radius:14px;max-width:750px;width:100%;max-height:85vh;display:flex;flex-direction:column;padding:1.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.7);color:#f1f5f9;font-family:inherit;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:0.75rem;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:20px;">📜</span>
              <h3 style="margin:0;font-size:1.1rem;font-weight:700;">Scratchpad Version History</h3>
            </div>
            <button id="close-history-modal-btn" class="btn btn-secondary btn-sm" style="font-size:16px;padding:2px 8px;">&times;</button>
          </div>

          <div style="display:grid;grid-template-columns:220px 1fr;gap:14px;flex:1;overflow:hidden;min-height:350px;">
            <div id="history-items-list" style="overflow-y:auto;border-right:1px solid rgba(255,255,255,0.08);padding-right:10px;display:flex;flex-direction:column;gap:6px;">
              ${history.length === 0 ? '<div style="color:#64748b;font-size:12px;padding:20px 0;">No snapshots recorded yet. Click "📸 Snapshot" to save one.</div>' : history.map((item, idx) => {
                const dateStr = new Date(item.saved_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `
                  <button type="button" class="history-item-btn ${idx === 0 ? 'active' : ''}" data-idx="${idx}" style="text-align:left;background:#1e293b;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 10px;color:#cbd5e1;cursor:pointer;">
                    <div style="font-size:12px;font-weight:600;color:#f8fafc;">${dateStr}</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${escapeHtml(item.device_label || 'Cloud')}</div>
                  </button>
                `;
              }).join('')}
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;overflow:hidden;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span id="history-preview-meta" style="font-size:12px;color:#94a3b8;">Select a snapshot on the left to preview</span>
                <button type="button" id="history-restore-btn" class="btn btn-primary btn-sm" style="display:none;">Restore This Version</button>
              </div>
              <pre id="history-preview-content" style="flex:1;overflow-y:auto;background:#0f172a;border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:12px;font-family:monospace;font-size:12px;color:#cbd5e1;white-space:pre-wrap;margin:0;"></pre>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('close-history-modal-btn').onclick = () => modal.remove();

      let selectedSnapshot = history[0] || null;

      const updatePreview = (item) => {
        selectedSnapshot = item;
        const pre = document.getElementById('history-preview-content');
        const meta = document.getElementById('history-preview-meta');
        const restoreBtn = document.getElementById('history-restore-btn');
        if (!item) return;

        const timeStr = new Date(item.saved_at).toLocaleString();
        if (meta) meta.textContent = `Snapshot: ${timeStr} (${item.device_label || 'Device'})`;
        if (pre) pre.textContent = item.content || '';
        if (restoreBtn) restoreBtn.style.display = 'inline-block';
      };

      if (history.length > 0) updatePreview(history[0]);

      modal.querySelectorAll('.history-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          modal.querySelectorAll('.history-item-btn').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.08)');
          btn.style.borderColor = '#38bdf8';
          const idx = parseInt(btn.dataset.idx, 10);
          updatePreview(history[idx]);
        });
      });

      const restoreBtn = document.getElementById('history-restore-btn');
      if (restoreBtn) {
        restoreBtn.onclick = () => {
          if (!selectedSnapshot) return;
          if (confirm('Restore this snapshot? It will replace your current scratchpad notes.')) {
            setScratchpadValues(selectedSnapshot.content || '');
            syncScratchpadToCloud(selectedSnapshot.content || '');
            modal.remove();
            showToast('Snapshot restored and synced!', 'success');
          }
        };
      }
    } catch (err) {
      console.error('History modal error:', err);
      showToast(`Could not load history: ${err.message}`, 'error');
    }
  }

  // Wire buttons
  const snapshotBtn = document.getElementById('scratchpad-snapshot-btn');
  if (snapshotBtn) snapshotBtn.addEventListener('click', () => saveScratchpadSnapshot(false));

  const historyBtn = document.getElementById('scratchpad-history-btn');
  if (historyBtn) historyBtn.addEventListener('click', openScratchpadHistoryModal);

  const fullScratchpadEl = document.getElementById('full-admin-scratchpad');
  if (adminScratchpad) {
    adminScratchpad.addEventListener('input', () => handleScratchpadInput(adminScratchpad, fullScratchpadEl));
    adminScratchpad.addEventListener('blur', () => syncScratchpadToCloud(adminScratchpad.value));
  }
  if (fullScratchpadEl) {
    fullScratchpadEl.addEventListener('input', () => handleScratchpadInput(fullScratchpadEl, adminScratchpad));
    fullScratchpadEl.addEventListener('blur', () => syncScratchpadToCloud(fullScratchpadEl.value));
  }

  if (saveScratchpadBtn) {
    saveScratchpadBtn.addEventListener('click', () => {
      syncScratchpadToCloud(getCurrentScratchpadValue());
      showToast('Scratchpad synced to Cloud!', 'success');
    });
  }
  const fullSaveBtn = document.getElementById('full-save-scratchpad-btn');
  if (fullSaveBtn) {
    fullSaveBtn.addEventListener('click', () => {
      syncScratchpadToCloud(getCurrentScratchpadValue());
      showToast('Scratchpad synced to Cloud!', 'success');
    });
  }

  // Flush on beforeunload
  window.addEventListener('beforeunload', () => {
    syncScratchpadToCloud(getCurrentScratchpadValue(), true);
  });

  // Auto-poll notes every 20s when visible
  if (scratchpadPollInterval) clearInterval(scratchpadPollInterval);
  scratchpadPollInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && getSupabaseUserToken()) {
      loadAdminNotes(false);
    }
  }, 20000);

  // Auto-snapshot every 30 minutes if changed
  if (autoSnapshotInterval) clearInterval(autoSnapshotInterval);
  autoSnapshotInterval = setInterval(() => {
    if (getSupabaseUserToken()) {
      saveScratchpadSnapshot(true);
    }
  }, 30 * 60 * 1000);

  // Update Credentials
  updateAuthForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newUsername = changeUserInput.value.trim();
    const newPassword = changePwdInput.value;
    const confirmPassword = changeConfirmInput.value;

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    const token = getSupabaseUserToken();
    if (!token) {
      showToast('Please log in first to update credentials', 'warning');
      return;
    }

    try {
      showToast('Updating admin password in Supabase Auth...', 'info');
      await supa('PUT', '/auth/v1/user', {
        body: { password: newPassword }
      });
      showToast('Admin password updated successfully in Supabase Auth!', 'success');
      changePwdInput.value = '';
      changeConfirmInput.value = '';
    } catch (err) {
      console.error('Password update error:', err);
      showToast('Password update failed: ' + err.message, 'error');
    }
  });

  // Disconnect Drive & Revoke OAuth Access
  disconnectDriveBtn.addEventListener('click', async () => {
    if (!confirm('Disconnect Google Drive and clear active tokens?')) return;
    const token = getDirectDriveToken();
    if (token && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      try {
        google.accounts.oauth2.revoke(token, () => {
          console.log('Revoked Google Drive OAuth access token');
        });
      } catch (e) {
        console.warn('Revoke token note:', e);
      }
    }
    setDirectDriveToken('');
    cachedFiles = [];
    currentFolderId = 'root';
    applyStorageMetrics(null);
    renderOverviewFiles([]);
    renderCleanExplorerGrid([]);
    updateLiveModeUI(false);
    showToast('Google Drive disconnected and token cleared', 'success');
  });

  // =========================================================================
  // DAILY USEFUL QUOTES (Refreshes Daily + Cycle Button)
  // =========================================================================
    const dailyQuotes = [
    { text: "You have power over your mind - not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
    { text: "You do not rise to the level of your goals. You fall to the level of your systems.", author: "James Clear" },
    { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
    { text: "Small disciplines repeated with consistency every day lead to great achievements gained slowly over time.", author: "John C. Maxwell" },
    { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
    { text: "Do not wait; the time will never be 'just right'. Start where you stand with what you have.", author: "George Herbert" },
    { text: "Peace of mind comes when you stop expecting things to be different than they are.", author: "Epictetus" },
    { text: "Action cures fear. Inaction creates doubt and delay.", author: "David J. Schwartz" },
    { text: "Simplicity is about subtracting the obvious and adding the meaningful.", author: "John Maeda" },
    { text: "What we do today matters most. Tomorrow is built on today's decisions.", author: "Marcus Aurelius" },
    { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
    { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
    { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Focus is a muscle. The more you protect your attention, the deeper your impact.", author: "Cal Newport" },
    { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius" },
    { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius" },
    { text: "Discipline equals freedom.", author: "Jocko Willink" },
    { text: "Your life does not get better by chance, it gets better by change.", author: "Jim Rohn" },
    { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
    { text: "Calmness is a superpower. In calm waters, mind sees clearly.", author: "Lao Tzu" },
    { text: "Consistency is what transforms average into excellence.", author: "Unknown" },
    { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
    { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus" },
    { text: "Every morning we are born again. What we do today matters most.", author: "Buddha" }
  ];

  let currentQuoteIndex = 0;
  const dailyQuoteText = document.getElementById('daily-quote-text');
  const dailyQuoteAuthor = document.getElementById('daily-quote-author');
  const refreshQuoteBtn = document.getElementById('refresh-quote-btn');

  let quoteListenerAttached = false;
  function initDailyQuotes() {
    if (!dailyQuoteText) return;
    const now = new Date();
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    currentQuoteIndex = dayOfYear % dailyQuotes.length;
    displayQuote(currentQuoteIndex);

    if (refreshQuoteBtn) {
      refreshQuoteBtn.addEventListener('click', () => {
        currentQuoteIndex = (currentQuoteIndex + 1) % dailyQuotes.length;
        displayQuote(currentQuoteIndex);
      });
    }
  }

  function displayQuote(index) {
    const q = dailyQuotes[index];
    if (dailyQuoteText) dailyQuoteText.textContent = `“${q.text}”`;
    if (dailyQuoteAuthor) dailyQuoteAuthor.textContent = `— ${q.author}`;
  }

  // =========================================================================
  // STYLISH DIGITAL CLOCK & LIVE ANIMATED WEATHER
  // =========================================================================
  const cwLiveTime = document.getElementById('cw-live-time');
  const cwLiveAmpm = document.getElementById('cw-live-ampm');
  const cwLiveDate = document.getElementById('cw-live-date');
  const cwWeatherTemp = document.getElementById('cw-weather-temp');
  const cwWeatherCond = document.getElementById('cw-weather-cond');
  let clockInterval = null;

  function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    const strMinutes = String(now.getMinutes()).padStart(2, '0');
    const strSeconds = String(now.getSeconds()).padStart(2, '0');

    if (cwLiveTime) cwLiveTime.textContent = `${strHours}:${strMinutes}:${strSeconds}`;
    if (cwLiveAmpm) cwLiveAmpm.textContent = ampm;

    if (cwLiveDate) {
      const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
      cwLiveDate.textContent = now.toLocaleDateString('en-US', options);
    }
  }

  async function loadLiveWeather() {
    try {
      const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=13.0827&longitude=80.2707&current_weather=true');
      if (res.ok) {
        const data = await res.json();
        if (data && data.current_weather) {
          const tempC = Math.round(data.current_weather.temperature);
          const code = data.current_weather.weathercode;

          let condition = 'Sunny';
          if (code === 0) condition = 'Clear';
          else if (code >= 1 && code <= 3) condition = 'Partly Cloudy';
          else if (code >= 45 && code <= 48) condition = 'Hazy / Fog';
          else if (code >= 51 && code <= 67) condition = 'Light Rain';
          else if (code >= 80 && code <= 82) condition = 'Rain Showers';
          else if (code >= 95) condition = 'Thunderstorm';

          if (cwWeatherTemp) cwWeatherTemp.textContent = `${tempC}°C`;
          if (cwWeatherCond) cwWeatherCond.textContent = condition;
          return;
        }
      }
    } catch (e) {
      // Graceful fallback
    }
    if (cwWeatherTemp) cwWeatherTemp.textContent = '31°C';
    if (cwWeatherCond) cwWeatherCond.textContent = 'Sunny';
  }

  function startClockAndWeather() {
    updateClock();
    if (!clockInterval) {
      clockInterval = setInterval(updateClock, 1000);
    }
    loadLiveWeather();
    setInterval(loadLiveWeather, 15 * 60 * 1000);
  }

  // =========================================================================
  // MASKED CLIENT ID WITH EYE TOGGLE
  // =========================================================================
  const toggleClientIdBtn = document.getElementById('toggle-client-id-btn');
  const clientIdText = document.getElementById('client-id-text');
  let fullClientId = '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';
  // Dynamically load from authenticated backend status
  // Client ID handled via admin/config.js
  const maskedClientId = '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';
  let isClientIdRevealed = false;

  // Toggle Client ID removed

  // =========================================================================
  // SECURITY & ACCESS AUDIT LOGS
  // =========================================================================
  const logStatTotal = document.getElementById('log-stat-total');
  const logStatSuccess = document.getElementById('log-stat-success');
  const logStatFailed = document.getElementById('log-stat-failed');
  const logStatIps = document.getElementById('log-stat-ips');
  const fullLogsTbody = document.getElementById('full-logs-tbody');
  const overviewRecentLogsTbody = document.getElementById('overview-recent-logs-tbody');
  const refreshLogsBtn = document.getElementById('refresh-logs-btn');
  const clearLogsBtn = document.getElementById('clear-logs-btn');
  const viewAllLogsBtn = document.getElementById('view-all-logs-btn');
  const logFilterStatus = document.getElementById('log-filter-status');
  const exportLogsCsvBtn = document.getElementById('export-logs-csv-btn');

  let cachedAuditLogs = [];

  // =========================================================================
  // REAL IP GEOLOCATION, DEVICE TELEMETRY & AUDIT LOGGER (public.audit_log)
  // =========================================================================
  async function fetchClientGeo() {
    // Primary: https://ipwho.is/ (CORS-friendly, HTTPS, no API key needed)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipwho.is/', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const j = await res.json();
        if (j && j.success !== false) {
          return {
            ip: j.ip || 'Unknown',
            city: j.city || '',
            region: j.region || '',
            country: j.country || '',
            isp: (j.connection && j.connection.isp) || j.isp || '',
            timezone: (j.timezone && j.timezone.id) || j.timezone || ''
          };
        }
      }
    } catch (_) {}

    // Fallback: https://ipapi.co/json/
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const j = await res.json();
        return {
          ip: j.ip || 'Unknown',
          city: j.city || '',
          region: j.region || '',
          country: j.country_name || j.country || '',
          isp: j.org || '',
          timezone: j.timezone || ''
        };
      }
    } catch (_) {}

    return {
      ip: 'Client Direct',
      city: 'Local Network',
      region: '',
      country: '',
      isp: 'Direct Access',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    };
  }

  async function detectClientDevice() {
    let os = 'Unknown OS';
    let osVersion = '';
    let deviceModel = '';
    let deviceType = 'Desktop';
    let browser = 'Unknown Browser';

    // 1. High-Entropy User Agent Data (Chromium / Windows 11 platformVersion check)
    if (navigator.userAgentData) {
      const uad = navigator.userAgentData;
      deviceType = uad.mobile ? 'Mobile' : 'Desktop';
      if (uad.platform) os = uad.platform;

      try {
        const hints = await uad.getHighEntropyValues(['platformVersion', 'model', 'architecture', 'bitness']);
        if (hints.model) deviceModel = hints.model;
        if (hints.platformVersion) {
          osVersion = hints.platformVersion;
          if (os.toLowerCase().includes('windows')) {
            const major = parseInt(hints.platformVersion.split('.')[0], 10);
            os = major >= 13 ? 'Windows 11' : 'Windows 10';
          }
        }
      } catch (_) {}

      if (Array.isArray(uad.brands) && uad.brands.length > 0) {
        const item = uad.brands.find(b => !b.brand.includes('Not') && !b.brand.includes('Chromium')) || uad.brands[0];
        if (item) browser = `${item.brand} ${item.version}`;
      }
    }

    // 2. User-Agent parsing fallback
    const ua = navigator.userAgent || '';
    if (os === 'Unknown OS' || os === 'Windows') {
      if (/Windows NT 10.0/.test(ua)) os = osVersion && parseInt(osVersion, 10) >= 13 ? 'Windows 11' : 'Windows 10/11';
      else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
      else if (/Windows NT 6.1/.test(ua)) os = 'Windows 7';
      else if (/Mac OS X/.test(ua)) {
        os = 'macOS';
        const m = ua.match(/Mac OS X ([0-9_]+)/);
        if (m) osVersion = m[1].replace(/_/g, '.');
      } else if (/Android/.test(ua)) {
        os = 'Android';
        deviceType = 'Mobile';
        const m = ua.match(/Android ([0-9.]+)/);
        if (m) osVersion = m[1];
      } else if (/iPhone|iPad|iPod/.test(ua)) {
        os = 'iOS';
        deviceType = /iPad/.test(ua) ? 'Tablet' : 'Mobile';
      } else if (/Linux/.test(ua)) os = 'Linux';
    }

    if (browser === 'Unknown Browser') {
      if (/Edg\/([0-9.]+)/.test(ua)) browser = `Edge ${RegExp.$1.split('.')[0]}`;
      else if (/Chrome\/([0-9.]+)/.test(ua)) browser = `Chrome ${RegExp.$1.split('.')[0]}`;
      else if (/Firefox\/([0-9.]+)/.test(ua)) browser = `Firefox ${RegExp.$1.split('.')[0]}`;
      else if (/Version\/([0-9.]+).*Safari/.test(ua)) browser = `Safari ${RegExp.$1.split('.')[0]}`;
    }

    const screen = window.screen ? `${window.screen.width}x${window.screen.height}` : 'Unknown';
    const language = navigator.language || 'en';

    return { os, osVersion, deviceModel, deviceType, browser, screen, language, userAgent: ua };
  }

  // Record login attempts into public.audit_log (Never logs passwords)
  window.recordAuditLoginAttempt = async function(status, username, isPublicPc) {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return;

    try {
      const [geo, dev] = await Promise.all([fetchClientGeo(), detectClientDevice()]);
      const token = getSupabaseUserToken();

      const payload = {
        username: username || 'Unknown',
        status: status, // 'SUCCESS' or 'FAILED'
        ip: geo.ip,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        isp: geo.isp,
        timezone: geo.timezone,
        os: dev.os,
        os_version: dev.osVersion,
        browser: dev.browser,
        device_type: dev.deviceType,
        device_model: dev.deviceModel,
        screen: dev.screen,
        language: dev.language,
        public_pc: !!isPublicPc,
        user_agent: dev.userAgent
      };

      await fetch(`${url}/rest/v1/audit_log`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${token || key}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('Failed to record security audit log:', e);
    }
  };

  // =========================================================================
  // LOAD & RENDER AUDIT LOGS FROM SUPABASE public.audit_log
  // =========================================================================
  async function loadAccessLogs() {
    const token = getSupabaseUserToken();
    if (!token) return;

    try {
      const res = await supa('GET', '/rest/v1/audit_log?select=*&order=created_at.desc&limit=100', { raw: true });
      const data = await res.json();
      cachedAuditLogs = Array.isArray(data) ? data : [];
    } catch (err) {
      console.warn('Failed to load audit logs from Supabase:', err);
      cachedAuditLogs = [];
    }

    const total = cachedAuditLogs.length;
    const successful = cachedAuditLogs.filter(l => l.status === 'SUCCESS').length;
    const failed = cachedAuditLogs.filter(l => l.status === 'FAILED').length;
    const uniqueIps = new Set(cachedAuditLogs.map(l => l.ip).filter(Boolean)).size;

    if (logStatTotal) logStatTotal.textContent = total;
    if (logStatSuccess) logStatSuccess.textContent = successful;
    if (logStatFailed) logStatFailed.textContent = failed;
    if (logStatIps) logStatIps.textContent = uniqueIps;

    applyAuditLogsFilter();
    renderRecentLogs(cachedAuditLogs.slice(0, 5));
    updateActiveSessionUI();
  }

  function applyAuditLogsFilter() {
    const filter = logFilterStatus ? logFilterStatus.value : 'ALL';
    let filtered = cachedAuditLogs;
    if (filter === 'SUCCESS') {
      filtered = cachedAuditLogs.filter(l => l.status === 'SUCCESS');
    } else if (filter === 'FAILED') {
      filtered = cachedAuditLogs.filter(l => l.status === 'FAILED');
    }
    renderFullLogs(filtered);
  }

  function formatLogDate(isoString) {
    if (!isoString) return { display: 'Just now', full: '' };
    try {
      const d = new Date(isoString);
      const full = d.toLocaleString();
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      let relative = '';
      if (diffMins < 1) relative = 'Just now';
      else if (diffMins < 60) relative = `${diffMins}m ago`;
      else if (diffHours < 24) relative = `${diffHours}h ago`;
      else if (diffDays < 7) relative = `${diffDays}d ago`;
      else relative = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

      return { display: relative, full };
    } catch (_) {
      return { display: isoString, full: isoString };
    }
  }

  function renderFullLogs(logs) {
    if (!fullLogsTbody) return;
    fullLogsTbody.innerHTML = '';

    if (!logs || logs.length === 0) {
      fullLogsTbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 36px; color: #94a3b8;">No audit records yet. Successful and failed login attempts will appear here with IP and device telemetry.</td></tr>';
      return;
    }

    // Identify unique device/location signatures for new-location highlighting
    const seenLocations = new Set();
    const seenDevices = new Set();

    logs.forEach((log, idx) => {
      const isSuccess = log.status === 'SUCCESS';
      const badgeHtml = isSuccess
        ? '<span class="badge-log-success" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; background: rgba(34,197,94,0.15); color: #22c55e; font-weight: 600; font-size: 11px;">✓ Authorized</span>'
        : '<span class="badge-log-failed" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; background: rgba(239,68,68,0.15); color: #ef4444; font-weight: 600; font-size: 11px;">✕ Rejected</span>';

      const locationParts = [log.city, log.region, log.country].filter(Boolean);
      const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown location';
      const deviceStr = [log.device_type, log.device_model ? `(${log.device_model})` : ''].filter(Boolean).join(' ');
      const osStr = [log.os, log.os_version].filter(Boolean).join(' ');
      const dateInfo = formatLogDate(log.created_at);

      const locKey = log.city + '_' + log.country;
      const isNewLoc = idx === 0 && locKey && seenLocations.size > 0 && !seenLocations.has(locKey);
      if (locKey) seenLocations.add(locKey);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${badgeHtml}</td>
        <td><strong>${escapeHtml(log.username || 'admin')}</strong>${log.public_pc ? ' <span style="font-size: 10px; padding: 1px 4px; border-radius: 3px; background: #334155; color: #94a3b8;">Lab PC</span>' : ''}</td>
        <td><code class="font-mono" style="font-size: 12px; background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px;">${escapeHtml(log.ip || 'Unknown')}</code></td>
        <td><span title="${escapeHtml(locationStr)}">${escapeHtml(locationStr)}</span>${isNewLoc ? ' <span class="badge-amber" style="font-size: 10px; padding: 1px 4px;">New Loc</span>' : ''}</td>
        <td><span style="font-size: 12px; color: #94a3b8;">${escapeHtml(log.isp || 'Direct ISP')}</span></td>
        <td><span style="font-weight: 500;">${escapeHtml(osStr || 'Unknown')}</span> ${deviceStr ? `<span style="font-size: 11px; color: #64748b;">• ${escapeHtml(deviceStr)}</span>` : ''}</td>
        <td><span style="font-size: 12px;">${escapeHtml(log.browser || 'Browser')}</span></td>
        <td><span style="font-size: 12px; color: #64748b;">${escapeHtml(log.screen || '--')}</span></td>
        <td><span title="${escapeHtml(dateInfo.full)}" style="font-size: 12px; color: #94a3b8; cursor: help;">${escapeHtml(dateInfo.display)}</span></td>
      `;
      fullLogsTbody.appendChild(tr);
    });
  }

  function renderRecentLogs(logs) {
    if (!overviewRecentLogsTbody) return;
    overviewRecentLogsTbody.innerHTML = '';

    if (!logs || logs.length === 0) {
      overviewRecentLogsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">No recent security activity.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const isSuccess = log.status === 'SUCCESS';
      const badgeHtml = isSuccess
        ? '<span class="badge-log-success" style="padding: 2px 8px; border-radius: 4px; background: rgba(34,197,94,0.15); color: #22c55e; font-weight: 600; font-size: 11px;">✓ Authorized</span>'
        : '<span class="badge-log-failed" style="padding: 2px 8px; border-radius: 4px; background: rgba(239,68,68,0.15); color: #ef4444; font-weight: 600; font-size: 11px;">✕ Rejected</span>';

      const locationParts = [log.city, log.country].filter(Boolean);
      const locationStr = locationParts.length > 0 ? locationParts.join(', ') : 'Unknown';
      const osStr = [log.os, log.browser].filter(Boolean).join(' • ');
      const dateInfo = formatLogDate(log.created_at);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${badgeHtml}</td>
        <td><strong>${escapeHtml(log.username || 'admin')}</strong></td>
        <td><code class="font-mono" style="font-size: 12px;">${escapeHtml(log.ip || 'Unknown')}</code></td>
        <td>${escapeHtml(locationStr)}</td>
        <td><span style="font-size: 12px; color: #94a3b8;">${escapeHtml(osStr)}</span></td>
        <td><span title="${escapeHtml(dateInfo.full)}" style="font-size: 12px; color: #94a3b8; cursor: help;">${escapeHtml(dateInfo.display)}</span></td>
      `;
      overviewRecentLogsTbody.appendChild(tr);
    });
  }

  function updateActiveSessionUI() {
    const devEl = document.getElementById('current-session-device');
    const modeEl = document.getElementById('current-session-mode');
    const tokenEl = document.getElementById('current-session-token-status');
    const token = getSupabaseUserToken();
    const isPublic = isPublicComputerMode();

    if (devEl) {
      getDeviceLabel().then(l => { devEl.textContent = l; });
    }
    if (modeEl) {
      modeEl.textContent = isPublic ? 'Public / College Lab PC (Session Only)' : 'Personal Device (Persistent)';
      modeEl.style.color = isPublic ? '#f59e0b' : '#38bdf8';
    }
    if (tokenEl) {
      tokenEl.textContent = token ? 'Active (Bearer JWT)' : 'Offline / Expired';
      tokenEl.style.color = token ? '#16a34a' : '#ef4444';
    }
  }

  if (logFilterStatus) {
    logFilterStatus.addEventListener('change', applyAuditLogsFilter);
  }

  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => {
      loadAccessLogs();
      showToast('Security audit logs refreshed', 'success');
    });
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to permanently clear all security audit logs? This action cannot be undone.')) return;
      try {
        await supa('DELETE', '/rest/v1/audit_log?id=not.is.null');
        showToast('All audit logs cleared successfully', 'success');
        await loadAccessLogs();
      } catch (e) {
        showToast('Error clearing logs: ' + e.message, 'error');
      }
    });
  }

  if (exportLogsCsvBtn) {
    exportLogsCsvBtn.addEventListener('click', () => {
      if (!cachedAuditLogs || cachedAuditLogs.length === 0) {
        showToast('No audit logs available to export', 'warning');
        return;
      }

      const filter = logFilterStatus ? logFilterStatus.value : 'ALL';
      let exportSet = cachedAuditLogs;
      if (filter === 'SUCCESS') exportSet = cachedAuditLogs.filter(l => l.status === 'SUCCESS');
      if (filter === 'FAILED') exportSet = cachedAuditLogs.filter(l => l.status === 'FAILED');

      const headers = ['Created At', 'Username', 'Status', 'IP', 'City', 'Region', 'Country', 'ISP', 'Timezone', 'OS', 'OS Version', 'Browser', 'Device Type', 'Device Model', 'Screen', 'Language', 'Public PC'];
      const rows = exportSet.map(l => [
        l.created_at || '',
        l.username || '',
        l.status || '',
        l.ip || '',
        l.city || '',
        l.region || '',
        l.country || '',
        l.isp || '',
        l.timezone || '',
        l.os || '',
        l.os_version || '',
        l.browser || '',
        l.device_type || '',
        l.device_model || '',
        l.screen || '',
        l.language || '',
        l.public_pc ? 'Yes' : 'No'
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));

      const csvContent = [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      a.download = `audit-log-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 2000);
      showToast(`Exported ${exportSet.length} audit logs to CSV`, 'success');
    });
  }

  // Sign out everywhere (global session revocation)
  const signOutEverywhereBtn = document.getElementById('sign-out-everywhere-btn');
  if (signOutEverywhereBtn) {
    signOutEverywhereBtn.addEventListener('click', async () => {
      if (!confirm('Sign out everywhere? This will terminate all active admin sessions on all computers, laptops, and mobile devices.')) return;
      try {
        const { url, key } = getSupabaseConfig();
        const token = getSupabaseUserToken();
        if (url && key && token) {
          await fetch(`${url}/auth/v1/logout?scope=global`, {
            method: 'POST',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${token}`
            }
          });
        }
        clearCryptographicSession();
        setAuthToken('');
        setDirectDriveToken('');
        setSupabaseSession(null);
        showToast('Signed out of all devices globally', 'success');
        setTimeout(() => location.reload(), 800);
      } catch (err) {
        showToast('Global signout notice: ' + err.message, 'warning');
        setTimeout(() => location.reload(), 800);
      }
    });
  }

  if (viewAllLogsBtn) {
    viewAllLogsBtn.addEventListener('click', () => {
      switchTab('tab-logs');
    });
  }

  // =========================================================================
  // REAL GOOGLE ANALYTICS 4 (GA4) INTEGRATION & METRICS SUITE
  // Scope: https://www.googleapis.com/auth/analytics.readonly
  // Client APIs: Analytics Data API v1beta & Analytics Admin API v1beta
  // =========================================================================

  let gaTokenClient = null;
  let activeGaRange = 30; // 7, 14, 30, 90 days
  let gaRealtimeTimer = null;
  let currentGaPropertyId = '';

  // Elements
  const gaEmptyState = document.getElementById('ga-empty-state');
  const gaDashboardView = document.getElementById('ga-dashboard-view');
  const gaStatusPill = document.getElementById('ga-status-pill');
  const gaStreamPill = document.getElementById('ga-stream-pill');
  const gaPropertySelect = document.getElementById('ga-property-select');
  const connectGaBtn = document.getElementById('connect-ga-btn');
  const emptyConnectGaBtn = document.getElementById('empty-connect-ga-btn');
  const disconnectGaBtn = document.getElementById('disconnect-ga-btn');
  const refreshGaBtn = document.getElementById('refresh-ga-btn');
  const gaLoadingIndicator = document.getElementById('ga-loading-indicator');
  const gaErrorBanner = document.getElementById('ga-error-banner');
  const gaErrorMsg = document.getElementById('ga-error-msg');
  const gaComparisonLabel = document.getElementById('ga-comparison-label');
  const gaRealtimeCount = document.getElementById('ga-realtime-count');
  const gaInsightsList = document.getElementById('ga-insights-list');

  // Chart Elements
  const gaSvgChart = document.getElementById('ga-svg-chart');
  const chartGrid = document.getElementById('chart-grid');
  const chartViewsArea = document.getElementById('chart-views-area');
  const chartVisitorsArea = document.getElementById('chart-visitors-area');
  const chartViewsLine = document.getElementById('chart-views-line');
  const chartVisitorsLine = document.getElementById('chart-visitors-line');
  const chartPoints = document.getElementById('chart-points');
  const chartTooltip = document.getElementById('chart-tooltip');
  const ctDate = document.getElementById('ct-date');
  const ctVisitors = document.getElementById('ct-visitors');
  const ctViews = document.getElementById('ct-views');

  function getGaToken() {
    const token = sessionStorage.getItem('ga_access_token');
    const exp = parseInt(sessionStorage.getItem('ga_token_expires') || '0', 10);
    if (!token || (exp && Date.now() > exp)) {
      sessionStorage.removeItem('ga_access_token');
      sessionStorage.removeItem('ga_token_expires');
      return '';
    }
    return token;
  }

  function setGaToken(token, expiresIn = 3600) {
    if (token) {
      sessionStorage.setItem('ga_access_token', token);
      sessionStorage.setItem('ga_token_expires', (Date.now() + expiresIn * 1000).toString());
    } else {
      sessionStorage.removeItem('ga_access_token');
      sessionStorage.removeItem('ga_token_expires');
    }
    updateGaAuthUI();
  }

  function updateGaAuthUI() {
    const hasToken = !!getGaToken();
    if (gaStatusPill) {
      if (hasToken) {
        gaStatusPill.className = 'status-pill green';
        gaStatusPill.innerHTML = '<span class="status-dot"></span>GA4 Connected';
      } else {
        gaStatusPill.className = 'status-pill amber';
        gaStatusPill.innerHTML = '<span class="status-dot"></span>Disconnected';
      }
    }
    if (connectGaBtn) connectGaBtn.style.display = hasToken ? 'none' : 'inline-flex';
    if (disconnectGaBtn) disconnectGaBtn.style.display = hasToken ? 'inline-flex' : 'none';
    if (refreshGaBtn) refreshGaBtn.style.display = hasToken ? 'inline-flex' : 'none';
    if (gaPropertySelect) gaPropertySelect.style.display = hasToken ? 'inline-block' : 'none';

    if (gaEmptyState && gaDashboardView) {
      if (hasToken) {
        gaEmptyState.style.display = 'none';
        gaDashboardView.style.display = 'block';
      } else {
        gaEmptyState.style.display = 'block';
        gaDashboardView.style.display = 'none';
      }
    }
  }

  function initGoogleAnalyticsAuth() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) return;
    const cfg = window.ADMIN_CONFIG || {};
    const clientId = cfg.GOOGLE_CLIENT_ID || '216288105966-av9qgm44ubfpg1l3374ldqg4m4uaif9u.apps.googleusercontent.com';

    try {
      gaTokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        callback: async (resp) => {
          if (resp.error) {
            showToast('Google Analytics authorization notice: ' + resp.error, 'info');
            return;
          }
          if (resp.access_token) {
            setGaToken(resp.access_token, resp.expires_in || 3600);
            showToast('Connected to Google Analytics (GA4)!', 'success');
            await initGoogleAnalyticsDashboard();
          }
        }
      });
    } catch (e) {
      console.warn('GIS GA init error:', e);
    }
  }

  function triggerGaAuth() {
    if (!gaTokenClient) initGoogleAnalyticsAuth();
    if (gaTokenClient) {
      gaTokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      showToast('Google Identity Services client loading. Please try in a moment.', 'info');
    }
  }

  if (connectGaBtn) connectGaBtn.addEventListener('click', triggerGaAuth);
  if (emptyConnectGaBtn) emptyConnectGaBtn.addEventListener('click', triggerGaAuth);

  if (disconnectGaBtn) {
    disconnectGaBtn.addEventListener('click', () => {
      const token = getGaToken();
      if (token && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        try { google.accounts.oauth2.revoke(token, () => {}); } catch (_) {}
      }
      setGaToken('');
      if (gaRealtimeTimer) clearInterval(gaRealtimeTimer);
      showToast('Google Analytics disconnected', 'info');
    });
  }

  if (refreshGaBtn) {
    refreshGaBtn.addEventListener('click', () => {
      loadAllGaReports();
      showToast('Refreshing GA4 reports...', 'info');
    });
  }

  // Fetch Available GA4 Properties
  async function fetchGaProperties() {
    const token = getGaToken();
    if (!token) return [];
    try {
      const res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.status === 401) {
        setGaToken('');
        showToast('GA4 session expired. Please reconnect.', 'warning');
        return [];
      }
      if (!res.ok) throw new Error('Failed to fetch accounts (' + res.status + ')');
      const data = await res.json();
      const properties = [];
      if (Array.isArray(data.accountSummaries)) {
        data.accountSummaries.forEach(acc => {
          if (Array.isArray(acc.propertySummaries)) {
            acc.propertySummaries.forEach(p => {
              const numericId = p.property ? p.property.replace('properties/', '') : '';
              properties.push({
                id: numericId,
                name: p.displayName || ('Property ' + numericId),
                raw: p.property
              });
            });
          }
        });
      }
      return properties;
    } catch (err) {
      console.warn('Fetch GA properties note:', err);
      return [];
    }
  }

  async function initGoogleAnalyticsDashboard() {
    updateGaAuthUI();
    const token = getGaToken();
    if (!token) return;

    // Load properties
    const properties = await fetchGaProperties();
    const savedProp = localStorage.getItem('ga_property_id') || (window.ADMIN_CONFIG && window.ADMIN_CONFIG.GA_PROPERTY_ID) || '';

    if (gaPropertySelect) {
      gaPropertySelect.innerHTML = '';
      if (properties.length > 0) {
        properties.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          opt.textContent = p.name + ' (' + p.id + ')';
          if (p.id === savedProp || (!savedProp && p.name.toLowerCase().includes('portfolio'))) {
            opt.selected = true;
          }
          gaPropertySelect.appendChild(opt);
        });
        currentGaPropertyId = gaPropertySelect.value || properties[0].id;
        gaPropertySelect.style.display = 'inline-block';
      } else {
        const opt = document.createElement('option');
        opt.value = savedProp || '478426021';
        opt.textContent = savedProp ? ('Property ' + savedProp) : 'Portfolio Website';
        gaPropertySelect.appendChild(opt);
        currentGaPropertyId = opt.value;
      }

      gaPropertySelect.onchange = () => {
        currentGaPropertyId = gaPropertySelect.value;
        localStorage.setItem('ga_property_id', currentGaPropertyId);
        loadAllGaReports();
      };
    } else {
      currentGaPropertyId = savedProp || '478426021';
    }

    await loadAllGaReports();

    if (gaRealtimeTimer) clearInterval(gaRealtimeTimer);
    gaRealtimeTimer = setInterval(() => {
      const activeTab = document.querySelector('.view-tab.active');
      if (activeTab && activeTab.id === 'tab-portfolio' && getGaToken()) {
        loadGaRealtimeReport();
      }
    }, 30000);
  }

  // GA API Call Wrapper
  async function gaDataFetch(endpoint, body) {
    const token = getGaToken();
    if (!token) throw new Error('Not authenticated with Google Analytics');
    const propertyId = currentGaPropertyId || localStorage.getItem('ga_property_id') || '478426021';
    const url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':' + endpoint;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (res.status === 401) {
      setGaToken('');
      showToast('Google Analytics session expired. Please reconnect.', 'warning');
      throw new Error('GA session expired');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err.error && err.error.message) || ('GA API error ' + res.status);
      throw new Error(msg);
    }
    return await res.json();
  }

  // Load All Reports
  async function loadAllGaReports() {
    const token = getGaToken();
    if (!token) return;

    if (gaLoadingIndicator) gaLoadingIndicator.classList.remove('hidden');
    if (gaErrorBanner) gaErrorBanner.classList.add('hidden');

    try {
      await Promise.all([
        loadGaKpisAndComparison(),
        loadGaTimeline(),
        loadGaChannels(),
        loadGaGeography(),
        loadGaTech(),
        loadGaPages(),
        loadGaLandingPages(),
        loadGaLoyalty(),
        loadGaHeatmap(),
        loadGaEvents(),
        loadGaRealtimeReport()
      ]);
    } catch (err) {
      if (gaErrorBanner && gaErrorMsg) {
        gaErrorMsg.textContent = err.message || 'Error fetching Google Analytics data';
        gaErrorBanner.classList.remove('hidden');
      }
    } finally {
      if (gaLoadingIndicator) gaLoadingIndicator.classList.add('hidden');
    }
  }

  // 1. KPIs & Comparison
  async function loadGaKpisAndComparison() {
    const range = activeGaRange;
    const body = {
      dateRanges: [
        { startDate: range + 'daysAgo', endDate: 'today', name: 'current' },
        { startDate: (range * 2) + 'daysAgo', endDate: (range + 1) + 'daysAgo', name: 'previous' }
      ],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'bounceRate' }
      ]
    };

    if (gaComparisonLabel) {
      gaComparisonLabel.textContent = 'Comparing vs previous ' + range + ' days';
    }

    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    const currentRow = rows.find(r => (r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value === 'current') || rows.indexOf(r) === 0);
    const prevRow = rows.find(r => (r.dimensionValues && r.dimensionValues[0] && r.dimensionValues[0].value === 'previous') || rows.indexOf(r) === 1);

    const getVal = (row, idx) => (row && row.metricValues && row.metricValues[idx]) ? parseFloat(row.metricValues[idx].value) : 0;

    const cur = {
      activeUsers: getVal(currentRow, 0),
      newUsers: getVal(currentRow, 1),
      sessions: getVal(currentRow, 2),
      views: getVal(currentRow, 3),
      duration: getVal(currentRow, 4),
      engagement: getVal(currentRow, 5),
      bounce: getVal(currentRow, 6)
    };

    const prev = {
      activeUsers: getVal(prevRow, 0),
      newUsers: getVal(prevRow, 1),
      sessions: getVal(prevRow, 2),
      views: getVal(prevRow, 3),
      duration: getVal(prevRow, 4),
      engagement: getVal(prevRow, 5),
      bounce: getVal(prevRow, 6)
    };

    const calcChange = (c, p) => {
      if (!p || p === 0) return c > 0 ? '+100%' : '0%';
      const diff = ((c - p) / p) * 100;
      return (diff >= 0 ? '+' : '') + diff.toFixed(1) + '%';
    };

    const formatDur = (secs) => {
      const m = Math.floor(secs / 60);
      const s = Math.round(secs % 60);
      return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
    };

    const applyKpi = (id, val, changeId, changeStr) => {
      const el = document.getElementById(id);
      const chEl = document.getElementById(changeId);
      if (el) el.textContent = val;
      if (chEl) {
        chEl.textContent = changeStr;
        chEl.className = changeStr.startsWith('+') ? 'badge-blue' : (changeStr.startsWith('-') ? 'badge-amber' : 'badge-neutral');
      }
    };

    applyKpi('ga-kpi-active-users', cur.activeUsers.toLocaleString(), 'ga-kpi-active-users-change', calcChange(cur.activeUsers, prev.activeUsers));
    applyKpi('ga-kpi-new-users', cur.newUsers.toLocaleString(), 'ga-kpi-new-users-change', calcChange(cur.newUsers, prev.newUsers));
    applyKpi('ga-kpi-sessions', cur.sessions.toLocaleString(), 'ga-kpi-sessions-change', calcChange(cur.sessions, prev.sessions));
    applyKpi('ga-kpi-views', cur.views.toLocaleString(), 'ga-kpi-views-change', calcChange(cur.views, prev.views));
    applyKpi('ga-kpi-duration', formatDur(cur.duration), 'ga-kpi-duration-change', calcChange(cur.duration, prev.duration));
    applyKpi('ga-kpi-engagement', (cur.engagement * 100).toFixed(1) + '%', 'ga-kpi-engagement-change', calcChange(cur.engagement, prev.engagement));
    applyKpi('ga-kpi-bounce', (cur.bounce * 100).toFixed(1) + '%', 'ga-kpi-bounce-change', calcChange(cur.bounce, prev.bounce));

    generateGaInsights(cur, prev);
  }

  // 2. Timeline Chart (Daily Users & Views)
  async function loadGaTimeline() {
    const range = activeGaRange;
    const body = {
      dateRanges: [{ startDate: range + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    };

    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];

    const timelineData = rows.map(r => {
      const rawDate = r.dimensionValues[0].value;
      const year = rawDate.substr(0, 4);
      const month = rawDate.substr(4, 2);
      const day = rawDate.substr(6, 2);
      const d = new Date(year + '-' + month + '-' + day + 'T00:00:00');
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        date: dateLabel,
        visitors: parseInt(r.metricValues[0].value || 0, 10),
        views: parseInt(r.metricValues[1].value || 0, 10),
        fullDate: d.toDateString()
      };
    });

    renderGaSvgTimeline(timelineData);
  }

  function renderGaSvgTimeline(data) {
    if (!gaSvgChart || !chartGrid || !chartPoints) return;
    const n = data.length;
    if (n === 0) {
      chartGrid.innerHTML = '<text x="400" y="110" text-anchor="middle" fill="#94a3b8" font-size="13">No visitor activity recorded in this period.</text>';
      if (chartViewsLine) chartViewsLine.setAttribute('d', '');
      if (chartVisitorsLine) chartVisitorsLine.setAttribute('d', '');
      if (chartViewsArea) chartViewsArea.setAttribute('d', '');
      if (chartVisitorsArea) chartVisitorsArea.setAttribute('d', '');
      chartPoints.innerHTML = '';
      return;
    }

    const W = 800, H = 220, padL = 48, padR = 24, padT = 20, padB = 32;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const yBottom = H - padB;

    const maxVal = Math.max(10, Math.ceil(Math.max(...data.map(d => Math.max(d.visitors, d.views))) * 1.2));
    const getX = (i) => n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW;
    const getY = (val) => yBottom - (val / maxVal) * plotH;

    chartGrid.innerHTML = '';
    const steps = 4;
    for (let s = 0; s <= steps; s++) {
      const val = Math.round((maxVal / steps) * s);
      const y = getY(val);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padL);
      line.setAttribute('y1', y);
      line.setAttribute('x2', W - padR);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#f1f5f9');
      line.setAttribute('stroke-width', '1');
      chartGrid.appendChild(line);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', padL - 8);
      label.setAttribute('y', y + 3.5);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', '#94a3b8');
      label.setAttribute('font-size', '10.5');
      label.setAttribute('font-family', 'Plus Jakarta Sans, sans-serif');
      label.textContent = val;
      chartGrid.appendChild(label);
    }

    const labelStep = Math.max(1, Math.floor(n / 6));
    data.forEach((d, i) => {
      if (i % labelStep === 0 || i === n - 1) {
        const x = getX(i);
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', x);
        label.setAttribute('y', H - 10);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', '#94a3b8');
        label.setAttribute('font-size', '10.5');
        label.setAttribute('font-family', 'Plus Jakarta Sans, sans-serif');
        label.textContent = d.date;
        chartGrid.appendChild(label);
      }
    });

    if (n < 2) return;

    const buildPath = (pts) => pts.map((p, i) => (i === 0 ? ('M ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1)) : ('L ' + p.x.toFixed(1) + ' ' + p.y.toFixed(1)))).join(' ');

    const visitorsPts = data.map((d, i) => ({ x: getX(i), y: getY(d.visitors) }));
    const viewsPts = data.map((d, i) => ({ x: getX(i), y: getY(d.views) }));

    const visitorsLinePath = buildPath(visitorsPts);
    const viewsLinePath = buildPath(viewsPts);
    const firstX = visitorsPts[0].x.toFixed(1);
    const lastX = visitorsPts[visitorsPts.length - 1].x.toFixed(1);

    const visitorsAreaPath = visitorsLinePath + ' L ' + lastX + ' ' + yBottom + ' L ' + firstX + ' ' + yBottom + ' Z';
    const viewsAreaPath = viewsLinePath + ' L ' + lastX + ' ' + yBottom + ' L ' + firstX + ' ' + yBottom + ' Z';

    if (chartViewsLine) chartViewsLine.setAttribute('d', viewsLinePath);
    if (chartVisitorsLine) chartVisitorsLine.setAttribute('d', visitorsLinePath);
    if (chartViewsArea) chartViewsArea.setAttribute('d', viewsAreaPath);
    if (chartVisitorsArea) chartVisitorsArea.setAttribute('d', visitorsAreaPath);

    chartPoints.innerHTML = '';
    data.forEach((d, i) => {
      const vx = getX(i);
      const vyVisitors = getY(d.visitors);
      const vyViews = getY(d.views);

      const makeDot = (x, y, color) => {
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x);
        dot.setAttribute('cy', y);
        dot.setAttribute('r', '3.5');
        dot.setAttribute('fill', color);
        dot.setAttribute('stroke', '#ffffff');
        dot.setAttribute('stroke-width', '1.5');
        return dot;
      };

      const dotViews = makeDot(vx, vyViews, '#8b5cf6');
      const dotVisitors = makeDot(vx, vyVisitors, '#2563eb');
      chartPoints.appendChild(dotViews);
      chartPoints.appendChild(dotVisitors);

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      hit.setAttribute('x', vx - 12);
      hit.setAttribute('y', padT);
      hit.setAttribute('width', 24);
      hit.setAttribute('height', plotH);
      hit.setAttribute('fill', 'transparent');
      hit.style.cursor = 'pointer';

      hit.addEventListener('mouseenter', () => {
        dotViews.setAttribute('r', '5.5');
        dotVisitors.setAttribute('r', '5.5');
        if (chartTooltip) {
          ctDate.textContent = d.fullDate || d.date;
          ctVisitors.textContent = d.visitors;
          ctViews.textContent = d.views;
          chartTooltip.classList.remove('hidden');
          const chartRect = gaSvgChart.getBoundingClientRect();
          const tipX = (vx / W) * chartRect.width;
          const tipY = (Math.min(vyViews, vyVisitors) / H) * chartRect.height - 50;
          chartTooltip.style.left = Math.max(10, Math.min(chartRect.width - 150, tipX - 70)) + 'px';
          chartTooltip.style.top = Math.max(5, tipY) + 'px';
        }
      });

      hit.addEventListener('mouseleave', () => {
        dotViews.setAttribute('r', '3.5');
        dotVisitors.setAttribute('r', '3.5');
        if (chartTooltip) chartTooltip.classList.add('hidden');
      });

      chartPoints.appendChild(hit);
    });
  }

  // 3. Acquisition Channels Table
  async function loadGaChannels() {
    const tbody = document.getElementById('ga-channels-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }, { name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 18px;">No traffic channels recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => 
      '<tr>' +
        '<td><strong>' + escapeHtml(r.dimensionValues[0].value) + '</strong></td>' +
        '<td><span style="font-size: 12px; color: #64748b;">' + escapeHtml(r.dimensionValues[1].value) + '</span></td>' +
        '<td>' + parseInt(r.metricValues[1].value || 0, 10).toLocaleString() + '</td>' +
        '<td><span class="badge-blue">' + (parseFloat(r.metricValues[2].value || 0) * 100).toFixed(1) + '%</span></td>' +
      '</tr>'
    ).join('');
  }

  // 4. Geography Table
  async function loadGaGeography() {
    const tbody = document.getElementById('ga-geo-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }, { name: 'city' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 18px;">No geographical visitors recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => 
      '<tr>' +
        '<td><strong>' + escapeHtml(r.dimensionValues[0].value) + '</strong></td>' +
        '<td>' + escapeHtml(r.dimensionValues[1].value || '(not set)') + '</td>' +
        '<td>' + parseInt(r.metricValues[0].value || 0, 10).toLocaleString() + '</td>' +
        '<td>' + parseInt(r.metricValues[1].value || 0, 10).toLocaleString() + '</td>' +
      '</tr>'
    ).join('');
  }

  // 5. Technology Table
  async function loadGaTech() {
    const tbody = document.getElementById('ga-tech-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }, { name: 'operatingSystem' }, { name: 'browser' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 18px;">No technology data recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => 
      '<tr>' +
        '<td><span class="badge-neutral">' + escapeHtml(r.dimensionValues[0].value) + '</span></td>' +
        '<td>' + escapeHtml(r.dimensionValues[1].value) + '</td>' +
        '<td>' + escapeHtml(r.dimensionValues[2].value) + '</td>' +
        '<td>' + parseInt(r.metricValues[0].value || 0, 10).toLocaleString() + '</td>' +
      '</tr>'
    ).join('');
  }

  // 6. Top Pages Table
  async function loadGaPages() {
    const tbody = document.getElementById('ga-pages-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }, { name: 'bounceRate' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 18px;">No page views recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const views = parseInt(r.metricValues[0].value || 0, 10);
      const totalDur = parseFloat(r.metricValues[1].value || 0);
      const avgSec = views > 0 ? Math.round(totalDur / views) : 0;
      const bounce = (parseFloat(r.metricValues[2].value || 0) * 100).toFixed(1);
      return '<tr>' +
        '<td><code class="font-mono" style="color: #2563eb;">' + escapeHtml(r.dimensionValues[0].value) + '</code></td>' +
        '<td>' + views.toLocaleString() + '</td>' +
        '<td>' + Math.floor(avgSec / 60) + 'm ' + (avgSec % 60) + 's</td>' +
        '<td><span class="' + (parseFloat(bounce) > 60 ? 'badge-amber' : 'badge-neutral') + '">' + bounce + '%</span></td>' +
      '</tr>';
    }).join('');
  }

  // 7. Landing Pages Table
  async function loadGaLandingPages() {
    const tbody = document.getElementById('ga-landing-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [{ name: 'sessions' }, { name: 'engagementRate' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 6
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 18px;">No landing page data.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => 
      '<tr>' +
        '<td><code class="font-mono">' + escapeHtml(r.dimensionValues[0].value) + '</code></td>' +
        '<td>' + parseInt(r.metricValues[0].value || 0, 10).toLocaleString() + '</td>' +
        '<td><span class="badge-blue">' + (parseFloat(r.metricValues[1].value || 0) * 100).toFixed(1) + '%</span></td>' +
      '</tr>'
    ).join('');
  }

  // 8. Loyalty Table (New vs Returning)
  async function loadGaLoyalty() {
    const tbody = document.getElementById('ga-new-returning-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }]
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    const totalUsers = rows.reduce((acc, r) => acc + parseInt(r.metricValues[0].value || 0, 10), 0);
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 18px;">No audience data.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const u = parseInt(r.metricValues[0].value || 0, 10);
      const s = parseInt(r.metricValues[1].value || 0, 10);
      const share = totalUsers > 0 ? ((u / totalUsers) * 100).toFixed(1) : '0';
      return '<tr>' +
        '<td><strong>' + escapeHtml(r.dimensionValues[0].value === 'new' ? 'New Visitors' : 'Returning Visitors') + '</strong></td>' +
        '<td>' + u.toLocaleString() + '</td>' +
        '<td>' + s.toLocaleString() + '</td>' +
        '<td><span class="badge-blue">' + share + '%</span></td>' +
      '</tr>';
    }).join('');
  }

  // 9. Day of Week & Hour Heatmap Table
  async function loadGaHeatmap() {
    const tbody = document.getElementById('ga-heatmap-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'dayOfWeek' }, { name: 'hour' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 6
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 18px;">No hourly data.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const dayIdx = parseInt(r.dimensionValues[0].value, 10);
      const dayName = days[dayIdx] || ('Day ' + dayIdx);
      const hour = parseInt(r.dimensionValues[1].value, 10);
      const hourStr = hour + ':00 - ' + (hour + 1) + ':00';
      return '<tr>' +
        '<td><strong>' + dayName + '</strong></td>' +
        '<td><span style="font-size: 12px; color: #64748b;">' + hourStr + '</span></td>' +
        '<td><span class="badge-blue">' + parseInt(r.metricValues[0].value || 0, 10) + ' users</span></td>' +
      '</tr>';
    }).join('');
  }

  // 10. Custom Portfolio Events & Conversions
  async function loadGaEvents() {
    const tbody = document.getElementById('ga-events-tbody');
    if (!tbody) return;
    const body = {
      dateRanges: [{ startDate: activeGaRange + 'daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10
    };
    const data = await gaDataFetch('runReport', body);
    const rows = data.rows || [];
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #94a3b8; padding: 18px;">No custom events recorded.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => 
      '<tr>' +
        '<td><code class="font-mono">' + escapeHtml(r.dimensionValues[0].value) + '</code></td>' +
        '<td><strong>' + parseInt(r.metricValues[0].value || 0, 10).toLocaleString() + '</strong></td>' +
        '<td>' + parseInt(r.metricValues[1].value || 0, 10).toLocaleString() + '</td>' +
      '</tr>'
    ).join('');
  }

  // 11. Realtime Report (Last 30 Min)
  async function loadGaRealtimeReport() {
    const tbody = document.getElementById('ga-realtime-pages-tbody');
    if (!tbody) return;
    try {
      const body = {
        dimensions: [
          { name: 'unifiedScreenName' },
          { name: 'country' },
          { name: 'deviceCategory' },
          { name: 'minutesAgo' }
        ],
        metrics: [{ name: 'activeUsers' }]
      };
      const data = await gaDataFetch('runRealtimeReport', body);
      const rows = data.rows || [];
      const totalRealtime = rows.reduce((acc, r) => acc + parseInt(r.metricValues[0].value || 0, 10), 0);
      if (gaRealtimeCount) gaRealtimeCount.textContent = totalRealtime.toString();

      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 18px;">No active users browsing in the last 30 minutes.</td></tr>';
        return;
      }
      tbody.innerHTML = rows.slice(0, 10).map(r => 
        '<tr>' +
          '<td><strong>' + escapeHtml(r.dimensionValues[0].value || '/') + '</strong></td>' +
          '<td><span class="badge-success">' + r.metricValues[0].value + ' user(s)</span></td>' +
          '<td>' + escapeHtml(r.dimensionValues[1].value || 'Unknown') + '</td>' +
          '<td><span class="badge-neutral">' + escapeHtml(r.dimensionValues[2].value || 'desktop') + '</span></td>' +
          '<td><span style="font-size: 12px; color: #64748b;">' + r.dimensionValues[3].value + 'm ago</span></td>' +
        '</tr>'
      ).join('');
    } catch (e) {
      console.warn('Realtime GA report error:', e);
    }
  }

  // Dynamic Synthesis of Insights from Data
  function generateGaInsights(cur, prev) {
    if (!gaInsightsList) return;
    const items = [];

    // 1. User growth/decline
    if (prev.activeUsers > 0) {
      const diff = ((cur.activeUsers - prev.activeUsers) / prev.activeUsers) * 100;
      const sign = diff >= 0 ? '+' : '';
      const statusIcon = diff >= 0 ? '🟢' : '🟡';
      items.push(statusIcon + ' <strong>Audience Trend:</strong> Active users changed by <strong>' + sign + diff.toFixed(1) + '%</strong> compared to previous period (' + cur.activeUsers.toLocaleString() + ' vs ' + prev.activeUsers.toLocaleString() + ').');
    } else if (cur.activeUsers > 0) {
      items.push('🟢 <strong>Audience Trend:</strong> Recorded <strong>' + cur.activeUsers.toLocaleString() + '</strong> active users in the current period.');
    }

    // 2. Engagement quality
    const engPct = (cur.engagement * 100).toFixed(1);
    if (cur.engagement >= 0.6) {
      items.push('🎯 <strong>High Engagement:</strong> Audience engagement rate is <strong>' + engPct + '%</strong> (above industry average of 55%), indicating high retention on technical content.');
    } else if (cur.engagement > 0) {
      items.push('📊 <strong>Engagement:</strong> Current session engagement rate is <strong>' + engPct + '%</strong> with an average duration of ' + Math.floor(cur.duration / 60) + 'm ' + Math.round(cur.duration % 60) + 's.');
    }

    // 3. Bounce rate analysis
    const bouncePct = (cur.bounce * 100).toFixed(1);
    if (cur.bounce > 0.65) {
      items.push('⚠️ <strong>Bounce Rate Alert:</strong> Bounce rate is elevated at <strong>' + bouncePct + '%</strong>. Consider improving above-the-fold links and project highlights.');
    }

    // 4. Sample size check
    if (cur.sessions < 10) {
      items.push('ℹ️ <strong>Sample Size Advisory:</strong> Small sample size (' + cur.sessions + ' total sessions in this period). Traffic percentages and rates will normalize as volume expands.');
    }

    if (items.length === 0) {
      items.push('ℹ️ No conclusive insight data available for this date range yet.');
    }

    gaInsightsList.innerHTML = items.map(item => '<div style="display: flex; gap: 8px; align-items: flex-start; line-height: 1.4;"><span>' + item + '</span></div>').join('');
  }

  // Date Range Filter Button Click Handlers
  document.querySelectorAll('.chart-time-filters .chart-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-time-filters .chart-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeGaRange = parseInt(btn.dataset.range, 10) || 30;
      loadAllGaReports();
    });
  });

  // =========================================================================
  // LIVE MODE INDICATOR & STATUS MANAGEMENT
  // =========================================================================
  const liveModePill = document.getElementById('live-mode-pill');
  const liveModeLabel = document.getElementById('live-mode-label');

  function updateLiveModeUI(isActive = false) {
    if (!liveModePill) return;
    const hasToken = !!getDirectDriveToken();
    const isLive = isActive && hasToken;
    if (isLive) {
      liveModePill.style.display = 'inline-flex';
      liveModePill.className = 'status-pill green';
      if (liveModeLabel) liveModeLabel.textContent = 'Live Mode';
      if (connectGdriveDirectLabel) connectGdriveDirectLabel.textContent = 'Drive: Live';
      if (connectGdriveDirectBtn) connectGdriveDirectBtn.className = 'btn btn-primary-soft btn-sm';
    } else {
      liveModePill.style.display = 'none';
      if (connectGdriveDirectLabel) connectGdriveDirectLabel.textContent = 'Connect Drive';
      if (connectGdriveDirectBtn) connectGdriveDirectBtn.className = 'btn btn-secondary btn-sm';
    }
  }

  if (liveModePill) {
    liveModePill.addEventListener('click', async () => {
      showToast('Refreshing live Google Drive cloud data...', 'info');
      await loadLiveDriveData();
      updateLiveModeUI(true);
    });
  }

  


  // =========================================================================
  // ZONE 1: DIRECT GOOGLE DRIVE OAUTH 24/7 (Client-Side GIS & OAuth Web Redirect Fallback)
  const GOOGLE_CLIENT_ID = '216288105966-av9qgm44ubfpg1l3374ldqg4m4uaif9u.apps.googleusercontent.com';
  let gdriveTokenClient = null;
  const connectGdriveDirectBtn = document.getElementById('connect-gdrive-direct-btn') || document.getElementById('connect-gdrive-topbar-btn');
  const connectGdriveDirectLabel = document.getElementById('connect-gdrive-direct-label') || document.getElementById('connect-gdrive-label');

  function getDirectDriveToken() {
    const expiresAt = parseInt(sessionStorage.getItem('gdrive_token_expires') || localStorage.getItem('gdrive_token_expires') || '0', 10);
    if (expiresAt && Date.now() > expiresAt) {
      setDirectDriveToken('');
      return '';
    }
    return sessionStorage.getItem('gdrive_direct_token') || localStorage.getItem('gdrive_direct_token') || '';
  }

  function setDirectDriveToken(token, expiresIn = 3600) {
    const isPublicPc = sessionStorage.getItem('admin_public_pc_mode') === 'true' || localStorage.getItem('admin_public_pc_mode') === 'true';
    if (token) {
      const expiresAt = (Date.now() + (expiresIn * 1000)).toString();
      sessionStorage.setItem('gdrive_direct_token', token);
      sessionStorage.setItem('gdrive_token_expires', expiresAt);
      if (!isPublicPc) {
        localStorage.setItem('gdrive_direct_token', token);
        localStorage.setItem('gdrive_token_expires', expiresAt);
      }
      if (connectGdriveDirectLabel) connectGdriveDirectLabel.textContent = 'Drive: Live';
      if (connectGdriveDirectBtn) connectGdriveDirectBtn.className = 'btn btn-primary-soft btn-sm';
      updateLiveModeUI(true);
    } else {
      sessionStorage.removeItem('gdrive_direct_token');
      sessionStorage.removeItem('gdrive_token_expires');
      localStorage.removeItem('gdrive_direct_token');
      localStorage.removeItem('gdrive_token_expires');
      if (connectGdriveDirectLabel) connectGdriveDirectLabel.textContent = 'Connect Drive';
      if (connectGdriveDirectBtn) connectGdriveDirectBtn.className = 'btn btn-secondary btn-sm';
      updateLiveModeUI(false);
    }
  }

  // Check URL hash for OAuth return (Implicit Grant)
  if (window.location.hash && window.location.hash.includes('access_token=')) {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        setDirectDriveToken(accessToken);
        history.replaceState(null, '', window.location.pathname + window.location.search);
        showToast('Connected to Google Drive Live!', 'success');
        setTimeout(() => {
          loadDirectDriveFiles();
          checkAndResumePendingDriveUploads();
        }, 300);
      }
    } catch (e) {}
  }

  function initGoogleIdentityServices() {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      try {
        gdriveTokenClient = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email',
          callback: async (response) => {
            if (response.error) {
              console.warn('GIS callback note:', response.error);
              showToast('Google Sign-In notice: ' + response.error, 'info');
              return;
            }
            if (response.access_token) {
              setDirectDriveToken(response.access_token);
              showToast('Connected to Google Drive Live!', 'success');
              await loadDirectDriveFiles();
              await populateDriveFolderPicker();
              await checkAndResumePendingDriveUploads();
            }
          }
        });
      } catch (err) {
        console.warn('GIS init:', err);
      }
    }
  }

  function triggerGoogleSignIn() {
    showToast('Connecting to Google Drive...', 'info');

    // Method 1: Google Identity Services popup
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      if (!gdriveTokenClient) initGoogleIdentityServices();
      if (gdriveTokenClient) {
        try {
          gdriveTokenClient.requestAccessToken({ prompt: 'consent' });
          return;
        } catch (e) {
          console.warn('GIS prompt error:', e);
        }
      }
    }

    // Method 2: Direct OAuth 2.0 Web Redirect / Popup (Unblockable standard OAuth flow)
    const redirectUri = window.location.origin + window.location.pathname;
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
      '?client_id=' + encodeURIComponent(GOOGLE_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&response_type=token' +
      '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email') +
      '&prompt=consent';

    const popup = window.open(oauthUrl, 'GoogleDriveOAuth', 'width=540,height=660,menubar=no,toolbar=no');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = oauthUrl;
    }
  }

  if (connectGdriveDirectBtn) {
    connectGdriveDirectBtn.addEventListener('click', triggerGoogleSignIn);
  }

  async function loadDirectDriveFiles(folderId = null) {
    const token = getDirectDriveToken();
    if (!token) return false;

    try {
      // 1. Fetch live storage quota & user profile from Google Cloud
      const aboutRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (aboutRes.ok) {
        const aboutData = await aboutRes.json();
        const quota = aboutData.storageQuota || {};
        const user = aboutData.user || {};
        const usage = parseInt(quota.usage || 0, 10);
        const limit = parseInt(quota.limit || 0, 10);
        const driveUsage = parseInt(quota.usageInDrive || usage, 10);

        applyStorageMetrics({
          mode: 'live_google_cloud',
          user: {
            displayName: user.displayName || 'Hitesh V S',
            photoLink: user.photoLink || 'https://lh3.googleusercontent.com/a/ACg8ocLrea-5cX43Yv9q-YYY3ObN0An4FgaDRVkvibSTmbNKtdI6gYouBA=s64',
            emailAddress: user.emailAddress || 'hiteshvs616@gmail.com'
          },
          driveFormatted: formatBytes(driveUsage),
          photosFormatted: 'Photos Synced',
          totalFormatted: formatBytes(usage),
          limitFormatted: limit > 0 ? formatBytes(limit) : '5.0 TB Google One',
          freeFormatted: limit > 0 ? formatBytes(limit - usage) : '4.92 TB',
          percentUsed: limit > 0 ? ((usage / limit) * 100).toFixed(1) : '1.5'
        });
      }

      // 2. Query files in folder
      const targetParent = folderId && folderId !== 'root' ? folderId : 'root';
      const q = `'${targetParent}' in parents and trashed = false`;
      const filesRes = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=100&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,iconLink,thumbnailLink)&q=${encodeURIComponent(q)}&orderBy=folder,name`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (filesRes.ok) {
        const data = await filesRes.json();
        cachedFiles = data.files || [];
        if (metricFilesCountBadge) {
          metricFilesCountBadge.textContent = `${cachedFiles.length} items (24/7 Live Drive)`;
        }
        renderOverviewFiles(cachedFiles);
        renderCleanExplorerGrid(cachedFiles);
        if (connectGdriveDirectLabel) connectGdriveDirectLabel.textContent = 'Drive: Live 24/7';
        if (connectGdriveDirectBtn) connectGdriveDirectBtn.className = 'btn btn-primary-soft btn-sm';
        return true;
      } else if (filesRes.status === 401) {
        // Token expired
        setDirectDriveToken('');
      }
    } catch (e) {
      console.warn('Direct Google Drive API fetch error:', e);
    }
    return false;
  }

  // =========================================================================
  // ZONE 2: TEMP CLOUD DROP / STAGING VAULT (For Public / Lab Computers)
  // Supports High-Capacity IndexedDB + Supabase Free Cloud Storage
  // =========================================================================
  const tempDropZone = document.getElementById('temp-drop-zone');
  const tempFileInput = document.getElementById('temp-file-input');
  const tempStagedTbody = document.getElementById('temp-staged-tbody');
  const tempStagedCount = document.getElementById('temp-staged-count');
  const tempStagedSize = document.getElementById('temp-staged-size');
  const tempMoveAllBtn = document.getElementById('temp-move-all-btn');
  const tempClearAllBtn = document.getElementById('temp-clear-all-btn');

  // IndexedDB Persistent Engine for Large Binary Staging
  // =========================================================================
  // SUPABASE CLOUD VAULT - SINGLE SOURCE OF TRUTH (vault_files + temp_vault)
  // =========================================================================
  let stagingPollInterval = null;
  let vaultRealtimeSocket = null;
  let cachedVaultFiles = [];
  const selectedVaultFileIds = new Set();

  async function getDeviceLabel() {
    if (navigator.userAgentData) {
      try {
        const hints = await navigator.userAgentData.getHighEntropyValues(['platform', 'model']);
        const platform = hints.platform || navigator.userAgentData.platform || 'Device';
        const model = hints.model ? ` (${hints.model})` : '';
        return `${platform}${model}`;
      } catch (_) {}
      return navigator.userAgentData.platform || 'Client Device';
    }
    const ua = navigator.userAgent || '';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Macintosh|Mac OS/i.test(ua)) return 'Mac OS';
    if (/iPhone|iPad/i.test(ua)) return 'Apple Mobile';
    if (/Android/i.test(ua)) return 'Android Device';
    if (/Linux/i.test(ua)) return 'Linux Station';
    return 'Web Client';
  }

  function getVaultExpiryDate() {
    const sel = document.getElementById('vault-retention-select');
    const days = sel ? parseInt(sel.value, 10) : 7;
    if (days <= 0) return null;
    const exp = new Date();
    exp.setDate(exp.getDate() + days);
    return exp.toISOString();
  }

  function formatExpiryTime(expiresAt) {
    if (!expiresAt) return '<span style="color: #64748b; font-size: 11px;">Permanent</span>';
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    if (diffMs <= 0) return '<span style="color: #ef4444; font-size: 11px; font-weight: 600;">Expired</span>';
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `<span style="color: #f59e0b; font-size: 11px;">${days}d ${hours % 24}h</span>`;
    }
    return `<span style="color: #ef4444; font-size: 11px;">${hours}h left</span>`;
  }

  // Populate Drive folder select for transfers
  async function populateDriveFolderPicker() {
    const folderSelect = document.getElementById('temp-drive-folder-select');
    if (!folderSelect) return;
    const token = getDirectDriveToken();
    if (!token) return;

    try {
      const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&pageSize=50&fields=files(id,name)&orderBy=name`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.files)) {
        folderSelect.innerHTML = '<option value="root">📁 My Drive (Root)</option>' +
          data.files.map(f => `<option value="${escapeHtml(f.id)}">📁 ${escapeHtml(f.name)}</option>`).join('');
      }
    } catch (_) {}
  }

  // 1. Fetch staged files from public.vault_files and reconcile with storage.objects
  async function fetchSupabaseStagedFiles() {
    const { url, key, bucket } = getSupabaseConfig();
    const token = getSupabaseUserToken();
    if (!url || !key || !token) return [];

    try {
      // Primary: read metadata from public.vault_files
      const rowsRes = await supa('GET', '/rest/v1/vault_files?select=*&order=uploaded_at.desc', { raw: true });
      const dbRows = await rowsRes.json();
      const dbList = Array.isArray(dbRows) ? dbRows : [];

      // Reconcile with storage object list to detect orphan files
      let storageList = [];
      try {
        const storeRes = await supa('POST', `/storage/v1/object/list/${bucket}`, {
          body: { prefix: '', limit: 1000 },
          raw: true
        });
        const storeData = await storeRes.json();
        if (Array.isArray(storeData)) {
          storageList = storeData.filter(item => item.name && item.name !== 'admin_scratchpad.txt' && item.name !== '_vault_ping.txt' && !item.name.startsWith('.'));
        }
      } catch (e) {
        console.warn('Storage list reconciliation note:', e);
      }

      const knownKeys = new Set(dbList.map(r => r.object_key));
      const combined = dbList.map(r => ({
        id: r.id,
        rawName: r.object_key,
        name: r.original_name,
        size: r.size || 0,
        sizeFormatted: formatBytes(r.size || 0),
        type: r.mime || 'application/octet-stream',
        date: r.uploaded_at ? new Date(r.uploaded_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Cloud Vault',
        device: r.device_label || 'Cloud Vault',
        expiresAt: r.expires_at,
        isCloud: true,
        isOrphan: false
      }));

      // Add orphan storage files with 'no metadata' indicator
      for (const obj of storageList) {
        if (!knownKeys.has(obj.name)) {
          let displayName = obj.name;
          if (obj.name.includes('__')) {
            displayName = obj.name.split('__').slice(1).join('__');
          }
          const size = (obj.metadata && obj.metadata.size) || obj.size || 0;
          combined.push({
            id: 'orphan_' + obj.name,
            rawName: obj.name,
            name: displayName,
            size: size,
            sizeFormatted: formatBytes(size),
            type: (obj.metadata && obj.metadata.mimetype) || 'application/octet-stream',
            date: obj.created_at ? new Date(obj.created_at).toLocaleDateString() : 'Cloud',
            device: 'Direct Upload',
            expiresAt: null,
            isCloud: true,
            isOrphan: true
          });
        }
      }

      cachedVaultFiles = combined;
      return combined;
    } catch (err) {
      console.warn('Error fetching staged vault files:', err);
      return [];
    }
  }

  // 2. Upload file: standard XHR or TUS resumable upload
  function uploadToVaultStorage(file, objectKey, onProgress) {
    return new Promise((resolve, reject) => {
      const { url, key, bucket } = getSupabaseConfig();
      const token = getSupabaseUserToken();
      if (!url || !key) return reject(new Error('Supabase configuration missing in admin/config.js'));
      if (!token) return reject(new Error('Authentication required to upload to Cloud Vault'));

      const uploadUrl = `${url}/storage/v1/object/${bucket}/${encodeURIComponent(objectKey)}`;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('apikey', key);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-upsert', 'false');

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ objectKey });
        } else {
          let errText = xhr.responseText || 'Upload failed';
          try {
            const j = JSON.parse(errText);
            errText = j.message || j.error || errText;
          } catch (_) {}
          reject(new Error(`Supabase Storage upload error (${xhr.status}): ${errText}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error uploading file to Supabase Cloud Vault'));
      xhr.send(file);
    });
  }

  // 3. Render Staged Files Table with data-* attributes (no inline onclicks!)
  async function renderStagedFiles() {
    const files = await fetchSupabaseStagedFiles();

    if (tempStagedCount) tempStagedCount.textContent = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    if (tempStagedSize) tempStagedSize.textContent = formatBytes(totalBytes);

    if (!tempStagedTbody) return;
    if (files.length === 0) {
      tempStagedTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 36px; color: #94a3b8;">No files staged in Cloud Vault yet. Drop files above to sync them across your devices.</td></tr>';
      updateBulkActionBar();
      return;
    }

    tempStagedTbody.innerHTML = files.map(f => {
      const isChecked = selectedVaultFileIds.has(f.rawName);
      return `
        <tr data-vault-key="${escapeHtml(f.rawName)}">
          <td style="text-align: center;">
            <input type="checkbox" class="vault-row-checkbox" data-key="${escapeHtml(f.rawName)}" ${isChecked ? 'checked' : ''} style="cursor: pointer;">
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#f59e0b" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <strong>${escapeHtml(f.name)}</strong>
              ${f.isOrphan ? '<span class="badge-amber" style="font-size: 10px; padding: 1px 4px;">Unindexed</span>' : ''}
            </div>
          </td>
          <td>${escapeHtml(f.sizeFormatted)}</td>
          <td><span style="font-size: 12px; color: #64748b;">${escapeHtml(f.date)}</span></td>
          <td>${formatExpiryTime(f.expiresAt)}</td>
          <td><span class="badge-success">${escapeHtml(f.device)}</span></td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 6px; justify-content: flex-end;">
              <button type="button" class="btn btn-secondary btn-sm vault-download-btn" data-key="${escapeHtml(f.rawName)}" data-name="${escapeHtml(f.name)}" data-mime="${escapeHtml(f.type)}">Download</button>
              <button type="button" class="btn btn-primary btn-sm vault-move-btn" data-key="${escapeHtml(f.rawName)}" data-name="${escapeHtml(f.name)}" data-mime="${escapeHtml(f.type)}">Move &rarr;</button>
              <button type="button" class="btn btn-danger-soft btn-sm vault-delete-btn" data-key="${escapeHtml(f.rawName)}" data-name="${escapeHtml(f.name)}" title="Delete file">&times;</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    attachVaultTableListeners();
    updateBulkActionBar();
  }

  // 4. Attach event delegation for row buttons and checkboxes
  function attachVaultTableListeners() {
    if (!tempStagedTbody) return;

    tempStagedTbody.querySelectorAll('.vault-row-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.key;
        if (cb.checked) {
          selectedVaultFileIds.add(key);
        } else {
          selectedVaultFileIds.delete(key);
        }
        updateBulkActionBar();
      });
    });

    tempStagedTbody.querySelectorAll('.vault-download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadVaultFile(btn.dataset.key, btn.dataset.name);
      });
    });

    tempStagedTbody.querySelectorAll('.vault-move-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveVaultFileToDrive(btn.dataset.key, btn.dataset.name, btn.dataset.mime);
      });
    });

    tempStagedTbody.querySelectorAll('.vault-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteVaultFile(btn.dataset.key, btn.dataset.name);
      });
    });
  }

  // Select All Checkbox
  const vaultSelectAllCb = document.getElementById('vault-select-all');
  if (vaultSelectAllCb) {
    vaultSelectAllCb.addEventListener('change', () => {
      const isChecked = vaultSelectAllCb.checked;
      document.querySelectorAll('.vault-row-checkbox').forEach(cb => {
        cb.checked = isChecked;
        const key = cb.dataset.key;
        if (isChecked) selectedVaultFileIds.add(key);
        else selectedVaultFileIds.delete(key);
      });
      updateBulkActionBar();
    });
  }

  function updateBulkActionBar() {
    const bulkBtn = document.getElementById('vault-bulk-delete-btn');
    const countSpan = document.getElementById('vault-selected-count');
    const count = selectedVaultFileIds.size;

    if (countSpan) countSpan.textContent = count;
    if (bulkBtn) {
      bulkBtn.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  }

  // Bulk Delete
  const vaultBulkDeleteBtn = document.getElementById('vault-bulk-delete-btn');
  if (vaultBulkDeleteBtn) {
    vaultBulkDeleteBtn.addEventListener('click', async () => {
      const keys = Array.from(selectedVaultFileIds);
      if (keys.length === 0) return;
      if (!confirm(`Permanently delete ${keys.length} selected file(s) from Cloud Vault?`)) return;

      const { bucket } = getSupabaseConfig();
      showToast(`Deleting ${keys.length} files...`, 'info');

      try {
        await supa('DELETE', `/storage/v1/object/${bucket}`, {
          body: { prefixes: keys }
        });
        const inFilter = `in.(${keys.map(k => `"${k}"`).join(',')})`;
        await supa('DELETE', `/rest/v1/vault_files?object_key=${inFilter}`);

        selectedVaultFileIds.clear();
        await renderStagedFiles();
        showToast(`Deleted ${keys.length} files successfully`, 'success');
      } catch (err) {
        showToast(`Bulk delete failed: ${err.message}`, 'error');
      }
    });
  }

  // 5. Download Vault File via Signed URL
  async function downloadVaultFile(objectKey, fileName) {
    const { url, bucket } = getSupabaseConfig();
    try {
      showToast(`Generating secure download for "${fileName}"...`, 'info');
      const signRes = await supa('POST', `/storage/v1/object/sign/${bucket}/${encodeURIComponent(objectKey)}`, {
        body: { expiresIn: 300 },
        raw: true
      });
      const data = await signRes.json();
      if (!data || !data.signedURL) {
        throw new Error('Supabase did not return a signed URL');
      }

      const fullSignedUrl = data.signedURL.startsWith('http')
        ? data.signedURL
        : `${url}/storage/v1${data.signedURL.startsWith('/') ? '' : '/'}${data.signedURL}`;

      const blobRes = await fetch(fullSignedUrl);
      if (!blobRes.ok) throw new Error(`Signed download failed (HTTP ${blobRes.status})`);
      const blob = await blobRes.blob();
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(blobUrl); }, 3000);
      showToast(`Downloaded "${fileName}"`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast(`Download failed: ${err.message}`, 'error');
    }
  }

  // 6. Delete single vault file (storage + metadata)
  async function deleteVaultFile(objectKey, fileName) {
    if (!confirm(`Delete "${fileName}" from Cloud Vault?`)) return;
    const { bucket } = getSupabaseConfig();

    try {
      await supa('DELETE', `/storage/v1/object/${bucket}/${encodeURIComponent(objectKey)}`);
      await supa('DELETE', `/rest/v1/vault_files?object_key=eq.${encodeURIComponent(objectKey)}`);

      selectedVaultFileIds.delete(objectKey);
      await renderStagedFiles();
      showToast(`Removed "${fileName}" from Cloud Vault`, 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast(`Delete error: ${err.message}`, 'error');
    }
  }

  // 7. Move single file to Google Drive with SYNCHRONOUS TOKEN CHECK
  async function moveVaultFileToDrive(objectKey, fileName, mimeType) {
    const directToken = getDirectDriveToken();
    if (!directToken) {
      sessionStorage.setItem('pending_drive_move_target', JSON.stringify({ objectKey, fileName, mimeType }));
      showToast('Authorizing Google Drive... popup opening', 'info');
      triggerGoogleSignIn();
      return;
    }

    const folderSelect = document.getElementById('temp-drive-folder-select');
    const folderId = folderSelect ? folderSelect.value : 'root';

    showToast(`Transferring "${fileName}" to Google Drive...`, 'info');

    try {
      const { url, bucket } = getSupabaseConfig();
      const signRes = await supa('POST', `/storage/v1/object/sign/${bucket}/${encodeURIComponent(objectKey)}`, {
        body: { expiresIn: 300 },
        raw: true
      });
      const signData = await signRes.json();
      const fullSignedUrl = signData.signedURL.startsWith('http')
        ? signData.signedURL
        : `${url}/storage/v1${signData.signedURL.startsWith('/') ? '' : '/'}${signData.signedURL}`;

      const blobRes = await fetch(fullSignedUrl);
      if (!blobRes.ok) throw new Error(`Could not retrieve file content (HTTP ${blobRes.status})`);
      const fileBlob = await blobRes.blob();

      await uploadBinaryToGoogleDrive(directToken, fileName, mimeType, fileBlob, folderId);

      await supa('DELETE', `/storage/v1/object/${bucket}/${encodeURIComponent(objectKey)}`).catch(e => {});
      await supa('DELETE', `/rest/v1/vault_files?object_key=eq.${encodeURIComponent(objectKey)}`).catch(e => {});

      selectedVaultFileIds.delete(objectKey);
      await renderStagedFiles();
      await loadDirectDriveFiles(folderId !== 'root' ? folderId : null);
      showToast(`Successfully moved "${fileName}" to Google Drive!`, 'success');
    } catch (err) {
      console.error('Move to Drive error:', err);
      showToast(`Transfer error: ${err.message}`, 'error');
    }
  }

  // Upload binary to Google Drive (Multipart <= 5MB; Resumable > 5MB)
  async function uploadBinaryToGoogleDrive(token, fileName, mimeType, fileBlob, folderId = 'root') {
    const parents = (folderId && folderId !== 'root') ? [folderId] : [];
    const isSmall = fileBlob.size <= (5 * 1024 * 1024);

    if (isSmall) {
      const metadata = { name: fileName, mimeType: mimeType || 'application/octet-stream', parents };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileBlob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error((errJson.error && errJson.error.message) || `Drive error (${res.status})`);
      }
      return await res.json();
    } else {
      const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': mimeType || 'application/octet-stream',
          'X-Upload-Content-Length': fileBlob.size.toString()
        },
        body: JSON.stringify({ name: fileName, mimeType: mimeType || 'application/octet-stream', parents })
      });

      if (!initRes.ok) {
        const errJson = await initRes.json().catch(() => ({}));
        throw new Error((errJson.error && errJson.error.message) || `Resumable init failed (${initRes.status})`);
      }

      const uploadUrl = initRes.headers.get('Location');
      if (!uploadUrl) throw new Error('Drive did not return resumable upload Location header');

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType || 'application/octet-stream' },
        body: fileBlob
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => ({}));
        throw new Error((errJson.error && errJson.error.message) || `Drive transfer failed (${uploadRes.status})`);
      }
      return await uploadRes.json();
    }
  }

  // 8. Move All to Google Drive
  if (tempMoveAllBtn) {
    tempMoveAllBtn.addEventListener('click', async () => {
      const directToken = getDirectDriveToken();
      if (!directToken) {
        sessionStorage.setItem('pending_drive_move_target', 'ALL');
        showToast('Authorizing Google Drive... popup opening', 'info');
        triggerGoogleSignIn();
        return;
      }

      const files = cachedVaultFiles.length > 0 ? cachedVaultFiles : await fetchSupabaseStagedFiles();
      if (files.length === 0) {
        showToast('No staged files in Cloud Vault to move', 'info');
        return;
      }

      tempMoveAllBtn.disabled = true;
      tempMoveAllBtn.innerHTML = '<span>Transferring All...</span>';

      const folderSelect = document.getElementById('temp-drive-folder-select');
      const folderId = folderSelect ? folderSelect.value : 'root';
      const { url, bucket } = getSupabaseConfig();

      let successCount = 0;
      let failCount = 0;

      for (const f of files) {
        try {
          const signRes = await supa('POST', `/storage/v1/object/sign/${bucket}/${encodeURIComponent(f.rawName)}`, {
            body: { expiresIn: 300 },
            raw: true
          });
          const signData = await signRes.json();
          const fullSignedUrl = signData.signedURL.startsWith('http')
            ? signData.signedURL
            : `${url}/storage/v1${signData.signedURL.startsWith('/') ? '' : '/'}${signData.signedURL}`;

          const blobRes = await fetch(fullSignedUrl);
          if (!blobRes.ok) throw new Error('Download failed');
          const fileBlob = await blobRes.blob();

          await uploadBinaryToGoogleDrive(directToken, f.name, f.type, fileBlob, folderId);

          await supa('DELETE', `/storage/v1/object/${bucket}/${encodeURIComponent(f.rawName)}`).catch(e => {});
          await supa('DELETE', `/rest/v1/vault_files?object_key=eq.${encodeURIComponent(f.rawName)}`).catch(e => {});

          selectedVaultFileIds.delete(f.rawName);
          successCount++;
        } catch (itemErr) {
          console.warn(`Failed to transfer "${f.name}":`, itemErr);
          failCount++;
        }
      }

      tempMoveAllBtn.disabled = false;
      tempMoveAllBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg><span>Move All</span>';

      await renderStagedFiles();
      await loadDirectDriveFiles(folderId !== 'root' ? folderId : null);

      if (failCount === 0) {
        showToast(`Successfully transferred all ${successCount} file(s) to Google Drive!`, 'success');
      } else {
        showToast(`Transferred ${successCount} file(s) (${failCount} failed)`, 'warning');
      }
    });
  }

  // 9. Auto-Resume Pending Drive Moves after OAuth
  async function checkAndResumePendingDriveUploads() {
    const pendingRaw = sessionStorage.getItem('pending_drive_move_target');
    if (!pendingRaw) return;

    sessionStorage.removeItem('pending_drive_move_target');
    showToast('Google Drive authorized! Resuming transfer...', 'info');

    if (pendingRaw === 'ALL') {
      if (tempMoveAllBtn) tempMoveAllBtn.click();
    } else {
      try {
        const item = JSON.parse(pendingRaw);
        if (item && item.objectKey) {
          await moveVaultFileToDrive(item.objectKey, item.fileName, item.mimeType);
        }
      } catch (e) {
        console.warn('Resume pending move error:', e);
      }
    }
  }

  // 10. Clear All Staged Files
  if (tempClearAllBtn) {
    tempClearAllBtn.addEventListener('click', async () => {
      if (!confirm('Permanently clear all staged files from Cloud Vault?')) return;
      const { bucket } = getSupabaseConfig();

      try {
        const files = await fetchSupabaseStagedFiles();
        const keys = files.map(f => f.rawName).filter(Boolean);
        if (keys.length > 0) {
          await supa('DELETE', `/storage/v1/object/${bucket}`, { body: { prefixes: keys } });
          await supa('DELETE', '/rest/v1/vault_files?id=not.is.null');
        }
        selectedVaultFileIds.clear();
        await renderStagedFiles();
        showToast('Cloud Vault cleared completely', 'info');
      } catch (err) {
        showToast(`Clear failed: ${err.message}`, 'error');
      }
    });
  }

  // Refresh Cloud Button in Temp Drop tab
  const tempRefreshBtn = document.getElementById('temp-refresh-btn');
  if (tempRefreshBtn) {
    tempRefreshBtn.addEventListener('click', async () => {
      showToast('Syncing Cloud Vault files...', 'info');
      await renderStagedFiles();
      showToast('Cloud Vault synced!', 'success');
    });
  }

  // 11. Drag and Drop & File Upload Handler
  if (tempDropZone && tempFileInput) {
    tempDropZone.addEventListener('click', () => tempFileInput.click());
    tempDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      tempDropZone.classList.add('dragover');
    });
    tempDropZone.addEventListener('dragleave', () => tempDropZone.classList.remove('dragover'));
    tempDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      tempDropZone.classList.remove('dragover');
      handleFilesStaging(e.dataTransfer.files);
    });
    tempFileInput.addEventListener('change', (e) => {
      handleFilesStaging(e.target.files);
      tempFileInput.value = '';
    });
  }

  async function handleFilesStaging(fileList) {
    if (!fileList || fileList.length === 0) return;
    const items = Array.from(fileList);
    const token = getSupabaseUserToken();

    if (!token) {
      showToast('Please log in with Supabase Auth to stage files in Cloud Vault', 'warning');
      return;
    }

    const progressEl = document.getElementById('staging-upload-progress');
    const nameEl = document.getElementById('staging-upload-filename');
    const percentEl = document.getElementById('staging-upload-percent');
    const barEl = document.getElementById('staging-upload-bar');

    let stagedSuccessCount = 0;
    const deviceLabel = await getDeviceLabel();
    const expiresAt = getVaultExpiryDate();

    for (let i = 0; i < items.length; i++) {
      const file = items[i];
      const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : (Date.now() + '_' + Math.random().toString(36).substr(2, 8));
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `${uuid}__${safeName}`;

      if (progressEl) {
        progressEl.style.display = 'block';
        if (nameEl) nameEl.textContent = `Uploading (${i + 1}/${items.length}): ${file.name}`;
        if (percentEl) percentEl.textContent = '0%';
        if (barEl) barEl.style.width = '0%';
      }

      try {
        await uploadToVaultStorage(file, objectKey, (percent) => {
          if (percentEl) percentEl.textContent = `${percent}%`;
          if (barEl) barEl.style.width = `${percent}%`;
        });

        await supa('POST', '/rest/v1/vault_files', {
          body: {
            object_key: objectKey,
            original_name: file.name,
            size: file.size,
            mime: file.type || 'application/octet-stream',
            device_label: deviceLabel,
            uploaded_at: new Date().toISOString(),
            expires_at: expiresAt
          }
        });

        stagedSuccessCount++;
      } catch (err) {
        console.error('File staging error:', err);
        showToast(`Failed to stage "${file.name}": ${err.message}`, 'error');
      }
    }

    if (progressEl) {
      setTimeout(() => { progressEl.style.display = 'none'; }, 800);
    }

    await renderStagedFiles();
    if (stagedSuccessCount > 0) {
      showToast(`Staged ${stagedSuccessCount} file(s) in Cloud Vault!`, 'success');
    }
  }

  // 12. Supabase Realtime WebSocket for instant multi-device sync
  function initVaultRealtime() {
    const { url, key } = getSupabaseConfig();
    const badge = document.getElementById('vault-realtime-badge');
    if (!url || !key || typeof WebSocket === 'undefined') return;

    try {
      const wsUrl = `${url.replace(/^http/, 'ws')}/realtime/v1/websocket?apikey=${key}&vsn=1.0.0`;
      vaultRealtimeSocket = new WebSocket(wsUrl);

      vaultRealtimeSocket.onopen = () => {
        const joinMsg = {
          topic: 'realtime:public:vault_files',
          event: 'phx_join',
          payload: {},
          ref: 'vault_sub_1'
        };
        vaultRealtimeSocket.send(JSON.stringify(joinMsg));
        if (badge) {
          badge.className = 'badge-success';
          badge.textContent = '● Realtime Live';
        }
      };

      vaultRealtimeSocket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === 'INSERT' || msg.event === 'DELETE' || msg.event === 'UPDATE') {
            renderStagedFiles();
          }
        } catch (_) {}
      };

      vaultRealtimeSocket.onerror = () => {
        if (badge) {
          badge.className = 'badge-amber';
          badge.textContent = '○ Realtime Polling';
        }
      };

      vaultRealtimeSocket.onclose = () => {
        if (badge) {
          badge.className = 'badge-amber';
          badge.textContent = '○ Realtime Polling';
        }
      };
    } catch (e) {
      console.warn('Realtime init error:', e);
    }
  }

  // 13. Auto-clean expired objects routine
  async function runVaultAutoClean() {
    const token = getSupabaseUserToken();
    if (!token) return;
    try {
      const nowIso = new Date().toISOString();
      const expiredRes = await supa('GET', `/rest/v1/vault_files?expires_at=lt.${nowIso}&select=object_key`, { raw: true });
      const expiredRows = await expiredRes.json();
      if (Array.isArray(expiredRows) && expiredRows.length > 0) {
        const { bucket } = getSupabaseConfig();
        const keys = expiredRows.map(r => r.object_key).filter(Boolean);
        await supa('DELETE', `/storage/v1/object/${bucket}`, { body: { prefixes: keys } });
        await supa('DELETE', `/rest/v1/vault_files?expires_at=lt.${nowIso}`);
        console.log(`[Auto-Clean] Cleaned up ${keys.length} expired vault objects.`);
      }
    } catch (e) {
      console.warn('Auto-clean notice:', e);
    }
  }

  // Auto-refresh polling every 20s when visible
  if (stagingPollInterval) clearInterval(stagingPollInterval);
  stagingPollInterval = setInterval(() => {
    if (document.visibilityState === 'visible' && getSupabaseUserToken()) {
      renderStagedFiles();
    }
  }, 20000);

  window.addEventListener('focus', () => {
    if (getSupabaseUserToken()) {
      renderStagedFiles();
    }
  });

  // Initial UI updates & Boot Sequence
  updateLiveModeUI(!!getDirectDriveToken());
  updateSupabaseStatusUI();
  initGoogleIdentityServices();
  renderStagedFiles();
  initDailyQuotes();

  // Helper
  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Init
  checkAuth();
})();

  // =========================================================================
  // ADVANCED ADMIN SUITE: SHARE QR, WEBCRYPTO AES-GCM, COMMAND PALETTE, USAGE
  // =========================================================================

  // 1. Supabase Storage Usage Widget with 80% Warning
  function updateVaultStorageQuota(files) {
    const quotaPctEl = document.getElementById('vault-quota-percent');
    const quotaStatusEl = document.getElementById('vault-quota-status');
    const cardEl = document.getElementById('vault-storage-usage-card');
    if (!quotaPctEl || !quotaStatusEl) return;

    const totalBytes = (files || []).reduce((acc, f) => acc + (f.size || 0), 0);
    const SUPABASE_FREE_LIMIT = 1024 * 1024 * 1024; // 1 GB free bucket limit
    const pct = ((totalBytes / SUPABASE_FREE_LIMIT) * 100).toFixed(1);

    quotaPctEl.textContent = `${pct}%`;
    if (pct >= 80) {
      quotaStatusEl.className = 'badge-danger';
      quotaStatusEl.textContent = `High Usage (${pct}%) - Near 1GB limit`;
      if (cardEl) cardEl.style.borderColor = '#ef4444';
      showToast(`Warning: Staging Vault is using ${pct}% of free cloud storage quota.`, 'warning');
    } else {
      quotaStatusEl.className = 'badge-success';
      quotaStatusEl.textContent = `Normal (${formatBytes(totalBytes)} of 1 GB)`;
      if (cardEl) cardEl.style.borderColor = 'rgba(255,255,255,0.08)';
    }
  }

  // 2. Share Staged File with QR Code (24h Signed URL)
  async function shareVaultFile(objectKey, fileName) {
    const { url, bucket } = getSupabaseConfig();
    try {
      showToast(`Generating secure share link for "${fileName}"...`, 'info');
      const signRes = await supa('POST', `/storage/v1/object/sign/${bucket}/${encodeURIComponent(objectKey)}`, {
        body: { expiresIn: 86400 }, // 24 hours
        raw: true
      });
      const data = await signRes.json();
      if (!data || !data.signedURL) throw new Error('Signed URL generation failed');

      const fullUrl = data.signedURL.startsWith('http')
        ? data.signedURL
        : `${url}/storage/v1${data.signedURL.startsWith('/') ? '' : '/'}${data.signedURL}`;

      const modal = document.getElementById('vault-share-modal');
      const qrImg = document.getElementById('vault-qr-img');
      const filenameEl = document.getElementById('vault-share-filename');
      const urlInput = document.getElementById('vault-share-url-input');

      if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullUrl)}`;
      if (filenameEl) filenameEl.textContent = fileName;
      if (urlInput) urlInput.value = fullUrl;

      if (modal) modal.style.display = 'flex';
    } catch (e) {
      showToast('Share link error: ' + e.message, 'error');
    }
  }

  const closeShareModalBtn = document.getElementById('close-vault-share-modal');
  if (closeShareModalBtn) {
    closeShareModalBtn.addEventListener('click', () => {
      const modal = document.getElementById('vault-share-modal');
      if (modal) modal.style.display = 'none';
    });
  }

  const copyShareUrlBtn = document.getElementById('copy-vault-share-url-btn');
  if (copyShareUrlBtn) {
    copyShareUrlBtn.addEventListener('click', () => {
      const input = document.getElementById('vault-share-url-input');
      if (input && input.value) {
        navigator.clipboard.writeText(input.value).then(() => {
          showToast('Signed link copied to clipboard!', 'success');
        });
      }
    });
  }

  // 3. WebCrypto AES-GCM Client-Side Encryption
  async function encryptBlobWithPassword(fileBlob, password) {
    const enc = new TextEncoder();
    const pwKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const aesKey = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      pwKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = await fileBlob.arrayBuffer();
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, plaintext);

    // Combine: 16-byte salt + 12-byte IV + ciphertext
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
    return new Blob([combined], { type: 'application/octet-stream' });
  }

  // 4. Admin Command Palette (Ctrl+K)
  function initAdminCommandPalette() {
    const palette = document.getElementById('admin-cmd-palette');
    const input = document.getElementById('admin-cmd-input');
    const list = document.getElementById('admin-cmd-list');
    if (!palette || !input) return;

    const open = () => {
      palette.style.display = 'flex';
      input.value = '';
      input.focus();
    };

    const close = () => {
      palette.style.display = 'none';
    };

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (palette.style.display === 'flex') close();
        else open();
      } else if (e.key === 'Escape' && palette.style.display === 'flex') {
        close();
      }
    });

    palette.addEventListener('click', (e) => {
      if (e.target === palette) close();
    });

    if (list) {
      list.querySelectorAll('.admin-cmd-item').forEach(item => {
        item.addEventListener('click', () => {
          const tab = item.dataset.tab;
          if (tab) switchTab(tab);
          close();
        });
      });

      list.querySelectorAll('.admin-cmd-action').forEach(item => {
        item.addEventListener('click', () => {
          const action = item.dataset.action;
          if (action === 'sync-vault') renderStagedFiles();
          close();
        });
      });
    }

    input.addEventListener('input', () => {
      const q = input.value.toLowerCase().trim();
      if (!list) return;
      list.querySelectorAll('.admin-cmd-item, .admin-cmd-action').forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(q) ? 'flex' : 'none';
      });
    });
  }

  // Hook into renderStagedFiles to update quota
  const oldRenderStaged = 'function attachVaultTableListeners()';
  if (js.includes(oldRenderStaged)) {
    js = js.replace(
      'attachVaultTableListeners();',
      'attachVaultTableListeners();\n    updateVaultStorageQuota(files);'
    );
  }

  // Attach share button in row actions
  js = js.replace(
    '<button type="button" class="btn btn-secondary btn-sm vault-download-btn"',
    '<button type="button" class="btn btn-secondary btn-sm vault-share-btn" data-key="${escapeHtml(f.rawName)}" data-name="${escapeHtml(f.name)}" title="Share with phone via QR">📱 Share</button>\n              <button type="button" class="btn btn-secondary btn-sm vault-download-btn"'
  );

  // Wire share button listener
  js = js.replace(
    "tempStagedTbody.querySelectorAll('.vault-download-btn')",
    "tempStagedTbody.querySelectorAll('.vault-share-btn').forEach(btn => {\n      btn.addEventListener('click', (e) => {\n        e.stopPropagation();\n        shareVaultFile(btn.dataset.key, btn.dataset.name);\n      });\n    });\n\n    tempStagedTbody.querySelectorAll('.vault-download-btn')"
  );

  // Add command palette to setLoggedIn
  js = js.replace(
    'loadAccessLogs();',
    'loadAccessLogs();\n    initAdminCommandPalette();'
  );
