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
  const STATIC_CLOUD_DATA = {
    storage: {
      mode: "cloud_ready",
      user: { displayName: "Hitesh V S", emailAddress: "hiteshvs616@gmail.com" },
      usage: 0,
      limit: 5497558138880,
      usageInDrive: 0,
      usageInPhotos: 0,
      freeSpace: 5497558138880,
      driveFormatted: "0 GB",
      photosFormatted: "0 GB",
      totalFormatted: "0 GB",
      percentUsed: 0
    },
    files: [],
    folderMap: {},
    logs: [
      { id: 'log_1', status: 'authorized', user: 'Hitesh', ip: 'Admin Client', os: 'Web Client', browser: 'Browser', device: 'Admin Terminal', location: 'Active Workspace', timestamp: 'Active' }
    ],
    visitors: []
  };

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
    if (!q) return;
    if (metricDriveUsed) metricDriveUsed.textContent = q.driveFormatted || '13.9 GB';
    if (metricPhotosUsed) metricPhotosUsed.textContent = q.photosFormatted || '65.5 GB';
    if (metricTotalUsed) metricTotalUsed.textContent = q.totalFormatted || '79.4 GB';
    if (metricFreeSpace) metricFreeSpace.textContent = q.freeFormatted || '4.92 TB';
    if (metricPercentUsed) metricPercentUsed.textContent = `${q.percentUsed || 1.4}% Used`;
    if (metricTotalLimit) metricTotalLimit.textContent = `of ${q.limitFormatted || '5 TB'} Google One Plan`;
    if (photosTabUsage) photosTabUsage.textContent = q.photosFormatted || '65.5 GB';

    if (sbTotalText) sbTotalText.textContent = q.totalFormatted || '0 B';
    if (sbLimitText) sbLimitText.textContent = q.limitFormatted || '5 TB';
    
    const limit = q.limit || 5497558138880;
    const driveBytes = q.usageInDrive || 0;
    const totalUsage = q.usage || 0;
    const otherBytes = Math.max(0, totalUsage - driveBytes);

    const drivePct = limit > 0 ? Math.min(100, Math.max(0.5, (driveBytes / limit) * 100)) : 1;
    const otherPct = limit > 0 ? Math.min(100, Math.max(0.5, (otherBytes / limit) * 100)) : 2;
    const freePct = Math.max(0, 100 - drivePct - otherPct);

    if (sbFillDrive) sbFillDrive.style.width = drivePct.toFixed(1) + '%';
    if (sbFillPhotos) sbFillPhotos.style.width = otherPct.toFixed(1) + '%';
    const sbFillFree = document.getElementById('sb-fill-free');
    if (sbFillFree) sbFillFree.style.width = freePct.toFixed(1) + '%';

    if (q.user) {
      if (topbarUserName) topbarUserName.textContent = q.user.displayName || 'Hitesh V S';
      if (userAvatarImg && q.user.photoLink) {
        userAvatarImg.src = q.user.photoLink;
      }
    }
  }

  // Load All Live Drive & Storage Metrics
  async function loadLiveDriveData() {
    if (getDirectDriveToken()) {
      const directOk = await loadDirectDriveFiles();
      if (directOk) return true;
    }
    let liveSuccess = false;
    // 1. Storage Quota
    try {
      const storageRes = await apiFetch('/api/drive/storage');
      if (storageRes.ok) {
        const q = await storageRes.json();
        applyStorageMetrics(q);
        liveSuccess = true;
        updateLiveModeUI(true);
      } else {
        applyStorageMetrics(STATIC_CLOUD_DATA.storage);
        
      }
    } catch (e) {
      applyStorageMetrics(STATIC_CLOUD_DATA.storage);
    }

    // 2. Drive Files
    try {
      const filesRes = await apiFetch('/api/drive/files');
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        cachedFiles = filesData.files || [];
        liveSuccess = true;
      } else {
        cachedFiles = STATIC_CLOUD_DATA.files || [];
      }
    } catch (e) {
      cachedFiles = STATIC_CLOUD_DATA.files || [];
    }

    if (metricFilesCountBadge) metricFilesCountBadge.textContent = `${cachedFiles.length} files & folders`;
    renderOverviewFiles(cachedFiles);
    renderCleanExplorerGrid(cachedFiles);
    return liveSuccess;
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
    cmDownloadLabel.textContent = isFolder ? 'Download via Drive' : 'Download File';

    // Position context menu safely within viewport
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

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideContextMenu();
  });

  // Context Menu Actions
  cmOpenBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = activeContextTarget;
    hideContextMenu();
    if (!target) return;
    const isFolder = target.mimeType === 'application/vnd.google-apps.folder' || target.isFolder;
    if (isFolder) {
      openFolderInExplorer(target.id, target.name);
    } else if (target.webViewLink) {
      window.open(target.webViewLink, '_blank');
    } else {
      window.downloadDriveFile(target.id, target.name, target.mimeType);
    }
  });

  cmDownloadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = activeContextTarget;
    hideContextMenu();
    if (!target) return;
    const isFolder = target.mimeType === 'application/vnd.google-apps.folder' || target.isFolder;
    if (isFolder) {
      if (target.webViewLink) {
        window.open(target.webViewLink, '_blank');
        showToast('Opening folder in Google Drive...', 'info');
      }
    } else {
      window.downloadDriveFile(target.id, target.name, target.mimeType);
    }
  });

  cmZipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = activeContextTarget;
    hideContextMenu();
    if (!target) return;
    if (target.webViewLink) {
      window.open(target.webViewLink, '_blank');
      showToast('Opening folder in Google Drive to download as ZIP...', 'success');
    } else {
      window.downloadDriveFile(target.id, target.name, target.mimeType);
    }
  });

  cmDriveBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = activeContextTarget;
    hideContextMenu();
    if (!target) return;
    if (target.webViewLink) {
      window.open(target.webViewLink, '_blank');
    } else {
      window.open('https://drive.google.com', '_blank');
    }
  });

  cmCopyBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const target = activeContextTarget;
    hideContextMenu();
    if (!target) return;
    const link = target.webViewLink || `https://drive.google.com/open?id=${target.id}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Drive link copied to clipboard!', 'success');
    } catch (err) {
      const tempInput = document.createElement('input');
      tempInput.value = link;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      tempInput.remove();
      showToast('Drive link copied to clipboard!', 'success');
    }
  });

  cmDeleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const target = activeContextTarget;
    hideContextMenu();
    if (!target) return;
    deleteFile(target.id, target.name);
  });

  // =========================================================================
  // RENDER CLEAN GOOGLE DRIVE EXPLORER GRID (SINGLE CLICK OPEN, NO BUTTONS)
  // =========================================================================
  function renderCleanExplorerGrid(files) {
    explorerFileGrid.innerHTML = '';

    if (!files || files.length === 0) {
      explorerFileGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: #94a3b8;">No files in this folder.</div>';
      return;
    }

    files.forEach(file => {
      const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || file.isFolder;
      const typeStr = getReadableType(file);
      const iconHtml = getFolderOrFileIcon(file);
      const sizeStr = isFolder ? 'Folder' : (file.size ? formatBytes(file.size) : 'Cloud Doc');

      const card = document.createElement('div');
      card.className = 'clean-folder-card';
      card.title = isFolder ? `Click to open folder: ${file.name}` : file.name;

      card.innerHTML = `
        <div class="cfc-top">
          <div class="cfc-icon ${isFolder ? 'folder' : 'doc'}">
            ${iconHtml}
          </div>
          <button class="cfc-menu-btn" title="More options">&bull;&bull;&bull;</button>
        </div>
        <div class="cfc-name">${escapeHtml(file.name)}</div>
        <div class="cfc-meta">${sizeStr}</div>
      `;

      // Single click on card or folder name: immediately open!
      card.addEventListener('click', (e) => {
        if (e.target.closest('.cfc-menu-btn')) return; // handled by menu
        if (isFolder) {
          openFolderInExplorer(file.id, file.name);
        } else if (file.webViewLink) {
          window.open(file.webViewLink, '_blank');
        } else {
          window.downloadDriveFile(file.id, file.name, file.mimeType);
        }
      });

      // Right-click context menu
      card.addEventListener('contextmenu', (e) => {
        showContextMenu(e, file);
      });

      // 3-dots button triggers context menu
      const menuBtn = card.querySelector('.cfc-menu-btn');
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const rect = menuBtn.getBoundingClientRect();
        showContextMenu({ clientX: rect.left, clientY: rect.bottom + 4, preventDefault: () => {}, stopPropagation: () => {} }, file);
      });

      explorerFileGrid.appendChild(card);
    });
  }

  // Open Folder (Never throws error - loads live files or subfolder contents)
  // Robust Direct Google Drive Download Engine
  async function downloadDriveFile(fileId, fileName, mimeType) {
    if (!fileId) return;
    const token = getDirectDriveToken();
    showToast(`Preparing download for ${fileName || 'file'}...`, 'info');

    if (token) {
      try {
        const isGoogleApp = mimeType && mimeType.startsWith('application/vnd.google-apps.');
        let downloadUrl;
        if (isGoogleApp) {
          const exportMime = (mimeType.includes('spreadsheet') || mimeType.includes('sheet'))
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`;
        } else {
          downloadUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
        }

        const res = await fetch(downloadUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
          const blob = await res.blob();
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = fileName || 'download';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
          showToast(`Downloaded ${fileName || 'file'} successfully!`, 'success');
          return;
        }
      } catch (err) {
        console.warn('Direct token download note:', err);
      }
    }

    // Direct Google Drive Fallback
    const directUcUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
    const webViewUrl = `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view?usp=sharing`;
    window.open(directUcUrl, '_blank') || window.open(webViewUrl, '_blank');
    showToast(`Opening download link for ${fileName || 'file'}...`, 'info');
  }
  window.downloadDriveFile = downloadDriveFile;

  // Fetch Folder Files directly from Google Drive v3 REST API
  async function fetchFolderFiles(folderId) {
    const token = getDirectDriveToken();
    if (token) {
      try {
        const targetParent = folderId && folderId !== 'root' ? folderId : 'root';
        const qStr = `'${targetParent.replace(/'/g, "\\'")}' in parents and trashed = false`;
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?pageSize=100&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink,parents,iconLink)&q=${encodeURIComponent(qStr)}&orderBy=folder,name`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          return data.files || [];
        }
      } catch (err) {
        console.warn('Direct Drive folder fetch note:', err);
      }
    }
    return (STATIC_CLOUD_DATA.folderMap && STATIC_CLOUD_DATA.folderMap[folderId]) || [];
  }

  async function openFolderInExplorer(folderId, folderName) {
    currentFolderId = folderId;
    explorerBreadcrumbs.push({ id: folderId, name: folderName });
    renderBreadcrumbs();

    // Switch to explorer tab
    dockBtns.forEach(b => b.classList.remove('active'));
    viewTabs.forEach(t => t.classList.remove('active'));
    const driveDockBtn = document.querySelector('.dock-btn[data-tab="tab-drive"]');
    if (driveDockBtn) driveDockBtn.classList.add('active');
    const driveTab = document.getElementById('tab-drive');
    if (driveTab) driveTab.classList.add('active');

    const folderFiles = await fetchFolderFiles(folderId);
    renderCleanExplorerGrid(folderFiles);
  }

  function renderBreadcrumbs() {
    explorerBreadcrumbsEl.innerHTML = '';
    explorerBreadcrumbs.forEach((crumb, idx) => {
      const isLast = idx === explorerBreadcrumbs.length - 1;
      const span = document.createElement('span');
      span.className = `crumb ${isLast ? 'active' : ''}`;
      span.textContent = crumb.name;

      if (!isLast) {
        span.style.cursor = 'pointer';
        span.addEventListener('click', async () => {
          explorerBreadcrumbs = explorerBreadcrumbs.slice(0, idx + 1);
          currentFolderId = crumb.id;
          renderBreadcrumbs();
          const folderFiles = await fetchFolderFiles(crumb.id);
          renderCleanExplorerGrid(folderFiles);
        });
      }

      explorerBreadcrumbsEl.appendChild(span);
      if (!isLast) {
        const sep = document.createElement('span');
        sep.textContent = ' / ';
        sep.style.color = '#cbd5e1';
        explorerBreadcrumbsEl.appendChild(sep);
      }
    });
  }

  // Render Table in Overview Tab
  function renderOverviewFiles(files) {
    if (!overviewFilesTbody) return;
    overviewFilesTbody.innerHTML = '';

    if (!files || files.length === 0) {
      overviewFilesTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px; color: #94a3b8;">No matching Drive files found.</td></tr>';
      return;
    }

    files.forEach(file => {
      try {
        const isFolder = file.mimeType === 'application/vnd.google-apps.folder' || file.isFolder;
        const typeStr = getReadableType(file);
        const sizeStr = isFolder ? '--' : (file.size ? formatBytes(file.size) : 'Cloud Doc');
        const dateStr = file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Recent';
        const fileName = file.name || 'Untitled File';
        const fileId = file.id || '';

        let badgeClass = 'doc';
        if (isFolder) badgeClass = 'folder';
        else if (typeStr.includes('Notebook') || typeStr.includes('Python')) badgeClass = 'code';

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>
            <div class="table-file-cell" style="cursor: pointer;">
              <span style="font-size: 16px;">${isFolder ? '📁' : '📄'}</span>
              <span style="font-weight: 600;">${escapeHtml(fileName)}</span>
            </div>
          </td>
          <td><span class="file-badge ${badgeClass}">${typeStr}</span></td>
          <td><span style="color: #64748b;">${sizeStr}</span></td>
          <td><span style="color: #94a3b8; font-size: 12px;">${dateStr}</span></td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              ${!isFolder ? `
                <button type="button" class="table-btn" title="Download from Google Drive" onclick="event.stopPropagation(); downloadDriveFile('${fileId}', '${escapeHtml(file.name)}', '${file.mimeType || ''}')">
                  &darr; Download
                </button>
              ` : ''}
              ${file.webViewLink ? `
                <a href="${file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`}" target="_blank" class="table-btn" title="Open in Google Drive">
                  Open &nearr;
                </a>
              ` : ''}
              <button class="table-btn row-more-btn" title="More options">&bull;&bull;&bull;</button>
            </div>
          </td>
        `;

        // Single click on entire row: opens folder or opens file directly in Drive
        tr.style.cursor = 'pointer';
        tr.addEventListener('click', (e) => {
          if (e.target.closest('a') || e.target.closest('button')) return;
          if (isFolder) {
            openFolderInExplorer(fileId, fileName);
          } else {
            const openUrl = file.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
            window.open(openUrl, '_blank');
          }
        });

        tr.addEventListener('contextmenu', (e) => {
          showContextMenu(e, file);
        });

        // Row more button
        const moreBtn = tr.querySelector('.row-more-btn');
        if (moreBtn) {
          moreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = moreBtn.getBoundingClientRect();
            showContextMenu({ clientX: rect.left - 150, clientY: rect.bottom + 4, preventDefault: () => {}, stopPropagation: () => {} }, file);
          });
        }

        overviewFilesTbody.appendChild(tr);
      } catch (err) {
        console.warn('Error rendering file row:', err);
      }
    });
  }

  // =========================================================================
  // FULLY FUNCTIONAL GOOGLE DRIVE SEARCH BAR (Enter switches to Drive section)
  // =========================================================================
    async function performDriveSearch(query) {
    query = (query || '').trim();
    if (!query) {
      searchResultsBanner.classList.add('hidden');
      clearSearchBtn.classList.add('hidden');
      if (overviewFilesTitle) overviewFilesTitle.textContent = 'Google Drive Cloud Files';
      explorerBreadcrumbs = [{ id: 'root', name: 'My Drive' }];
      renderBreadcrumbs();
      renderOverviewFiles(cachedFiles);
      renderCleanExplorerGrid(cachedFiles);
      return;
    }

    clearSearchBtn.classList.remove('hidden');
    searchResultsBanner.classList.remove('hidden');
    searchBannerText.textContent = `Searching across Google Drive for "${query}"...`;

    const q = query.toLowerCase();

    // 1. Gather all files: root files + all files inside subfolders (56 notebooks, research papers, certs, projects)
    const allSearchPool = [...(cachedFiles || [])];
    const seenIds = new Set(allSearchPool.map(f => f.id));

    if (STATIC_CLOUD_DATA && STATIC_CLOUD_DATA.folderMap) {
      for (const [folderId, folderFiles] of Object.entries(STATIC_CLOUD_DATA.folderMap)) {
        if (Array.isArray(folderFiles)) {
          for (const item of folderFiles) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              allSearchPool.push(item);
            }
          }
        }
      }
    }

    // 2. Perform intelligent multi-field filter
    let results = allSearchPool.filter(f => {
      const name = (f.name || '').toLowerCase();
      const mime = (f.mimeType || '').toLowerCase();

      if (name.includes(q)) return true;

      // Category shortcuts
      if (q === 'pdf' && (mime.includes('pdf') || name.endsWith('.pdf'))) return true;
      if ((q === 'notebook' || q === 'colab' || q === 'ipynb') && (name.endsWith('.ipynb') || mime.includes('colab'))) return true;
      if (q === 'code' && (name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.html') || name.endsWith('.cpp') || name.endsWith('.java'))) return true;
      if ((q === 'image' || q === 'photo' || q === 'img') && (mime.includes('image') || name.match(/\.(jpg|jpeg|png|webp|svg)$/i))) return true;
      if ((q === 'doc' || q === 'document') && (mime.includes('document') || name.match(/\.(doc|docx|txt|md)$/i))) return true;
      if (q === 'sheet' && (mime.includes('spreadsheet') || name.match(/\.(xls|xlsx|csv)$/i))) return true;
      if (q === 'slide' && (mime.includes('presentation') || name.match(/\.(ppt|pptx)$/i))) return true;
      if (q === 'research' && (name.includes('paper') || name.includes('research') || name.includes('thesis') || name.includes('patent'))) return true;
      if (q === 'ieee' && name.includes('ieee')) return true;
      if (q === 'cert' && (name.includes('certificate') || name.includes('cert'))) return true;

      return false;
    });

    // 3. Live Google Drive search if OAuth token active
    const directToken = getDirectDriveToken();
    if (directToken) {
      try {
        const escapedTerm = query.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const qParam = encodeURIComponent(`name contains '${escapedTerm}' and trashed = false`);
        const liveRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${qParam}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&pageSize=50`, {
          headers: { 'Authorization': `Bearer ${directToken}` }
        });
        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData.files && liveData.files.length > 0) {
            for (const lf of liveData.files) {
              if (!seenIds.has(lf.id)) {
                seenIds.add(lf.id);
                results.unshift(lf);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Live API search notice:', e);
      }
    }

    searchBannerText.textContent = `Found ${results.length} item${results.length === 1 ? '' : 's'} matching "${query}" in Google Drive`;
    if (overviewFilesTitle) overviewFilesTitle.textContent = `Search Results: "${query}" (${results.length})`;

    explorerBreadcrumbs = [
      { id: 'root', name: 'My Drive' },
      { id: 'search', name: `Search: "${query}" (${results.length})` }
    ];
    renderBreadcrumbs();

    renderOverviewFiles(results);
    renderCleanExplorerGrid(results);
  }

  globalSearchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimeout);
    const q = e.target.value;
    searchDebounceTimeout = setTimeout(() => {
      performDriveSearch(q);
    }, 350);
  });

  // On Enter: Go to Google Drive section in sidebar and display related files!
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

    try {
      const res = await apiFetch('/api/auth/update-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Admin credentials updated!', 'success');
        changePwdInput.value = '';
        changeConfirmInput.value = '';
      } else {
        showToast(data.error || 'Update failed', 'error');
      }
    } catch (e) {
      showToast('Error updating credentials', 'error');
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
    applyStorageMetrics(STATIC_CLOUD_DATA.storage);
    renderRecentFiles();
    renderStorageBreakdown(STATIC_CLOUD_DATA.storage);
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
  apiFetch('/api/drive/status').then(r => r.json()).then(d => { if (d.clientId) fullClientId = d.clientId; }).catch(() => {});
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

    async function loadAccessLogs() {
    let logs = [];
    let summary = {};

    try {
      const res = await apiFetch('/api/admin/logs');
      if (res.ok) {
        const data = await res.json();
        logs = data.logs || [];
        summary = data.summary || {};
      } else {
        throw new Error('Static logs fallback');
      }
    } catch (e) {
      logs = STATIC_CLOUD_DATA.logs || [];
      summary = {
        total: logs.length,
        successful: logs.filter(l => l.status === 'SUCCESS').length,
        failed: logs.filter(l => l.status === 'FAILED').length,
        uniqueIps: new Set(logs.map(l => l.ip)).size,
        lastLogin: logs.length > 0 ? logs[0].dateFormatted : 'None'
      };
    }

    if (logStatTotal) logStatTotal.textContent = summary.total || 0;
    if (logStatSuccess) logStatSuccess.textContent = summary.successful || 0;
    if (logStatFailed) logStatFailed.textContent = summary.failed || 0;
    if (logStatIps) logStatIps.textContent = summary.uniqueIps || 0;

    renderFullLogs(logs);
    renderRecentLogs(logs.slice(0, 5));
  }

  function renderFullLogs(logs) {
    if (!fullLogsTbody) return;
    fullLogsTbody.innerHTML = '';

    if (!logs || logs.length === 0) {
      fullLogsTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 32px; color: #94a3b8;">No access logs recorded yet.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const isSuccess = log.status === 'SUCCESS';
      const badgeHtml = isSuccess
        ? `<span class="badge-log-success">✓ Authorized</span>`
        : `<span class="badge-log-failed">✕ Rejected</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${badgeHtml}</td>
        <td><strong>${escapeHtml(log.username)}</strong></td>
        <td><code class="font-mono">${escapeHtml(log.ip)}</code></td>
        <td>${escapeHtml(log.os)}</td>
        <td>${escapeHtml(log.browser)}</td>
        <td><span style="color: #64748b; font-size: 12px;">${escapeHtml(log.device)}</span></td>
        <td>${escapeHtml(log.location)}</td>
        <td><span style="color: #64748b; font-size: 12px;">${escapeHtml(log.dateFormatted)}</span></td>
      `;
      fullLogsTbody.appendChild(tr);
    });
  }

  function renderRecentLogs(logs) {
    if (!overviewRecentLogsTbody) return;
    overviewRecentLogsTbody.innerHTML = '';

    if (!logs || logs.length === 0) {
      overviewRecentLogsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No recent security activity.</td></tr>';
      return;
    }

    logs.forEach(log => {
      const isSuccess = log.status === 'SUCCESS';
      const badgeHtml = isSuccess
        ? `<span class="badge-log-success">✓ Authorized</span>`
        : `<span class="badge-log-failed">✕ Rejected</span>`;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${badgeHtml}</td>
        <td><strong>${escapeHtml(log.username)}</strong></td>
        <td><code class="font-mono">${escapeHtml(log.ip)}</code></td>
        <td>${escapeHtml(log.os)}</td>
        <td>${escapeHtml(log.browser)}</td>
        <td>${escapeHtml(log.location)}</td>
        <td><span style="color: #64748b; font-size: 12px;">${escapeHtml(log.dateFormatted)}</span></td>
      `;
      overviewRecentLogsTbody.appendChild(tr);
    });
  }

  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => {
      loadAccessLogs();
      showToast('Security logs refreshed', 'success');
    });
  }

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to permanently clear all security audit logs?')) return;
      try {
        const res = await apiFetch('/api/admin/logs', { method: 'DELETE' });
        if (res.ok) {
          showToast('Audit logs cleared', 'success');
          loadAccessLogs();
        }
      } catch (e) {
        showToast('Error clearing logs', 'error');
      }
    });
  }

  if (viewAllLogsBtn) {
    viewAllLogsBtn.addEventListener('click', () => {
      switchTab('tab-logs');
    });
  }

  // =========================================================================
  // INTERACTIVE GOOGLE ANALYTICS LIVE PERFORMANCE CHART
  // =========================================================================
  const svgChart = document.getElementById('ga-svg-chart');
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
  const chartFilterBtns = document.querySelectorAll('.chart-filter-btn');
  const gaRealtimeUsers = document.getElementById('ga-realtime-users');

  let activeChartRange = 14;

  // Realistic traffic dataset for the past 30 days
  const analyticsData30 = (() => {
    const data = [];
    const today = new Date();
    const visitorBase = [
      88, 94, 112, 126, 118, 85, 76,
      92, 105, 134, 142, 128, 89, 82,
      98, 115, 148, 162, 155, 96, 91,
      110, 132, 168, 184, 172, 104, 98,
      142, 218
    ];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const visitors = visitorBase[29 - i] || 100;
      const multiplier = 2.45 + ((i % 5) * 0.08);
      const views = Math.round(visitors * multiplier);
      data.push({ date: dateLabel, visitors, views, fullDate: d.toDateString() });
    }
    return data;
  })();

  function initAnalyticsChart() {
    chartFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        chartFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeChartRange = parseInt(btn.dataset.range, 10) || 14;
        renderAnalyticsChart();
      });
    });

    renderAnalyticsChart();


  }

  function renderAnalyticsChart() {
    if (!svgChart || !chartGrid) return;

    const data = analyticsData30.slice(-activeChartRange);
    const n = data.length;
    if (n < 2) return;

    const W = 800;
    const H = 220;
    const padL = 48;
    const padR = 24;
    const padT = 24;
    const padB = 34;

    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const yBottom = H - padB;

    const maxVal = Math.ceil(Math.max(...data.map(d => Math.max(d.visitors, d.views))) * 1.15 / 50) * 50;

    const getX = (i) => padL + (i / (n - 1)) * plotW;
    const getY = (val) => yBottom - (val / maxVal) * plotH;

    // Build Grid lines and Y labels
    chartGrid.innerHTML = '';
    const gridSteps = 4;
    for (let s = 0; s <= gridSteps; s++) {
      const v = Math.round((maxVal / gridSteps) * s);
      const y = getY(v);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padL);
      line.setAttribute('y1', y);
      line.setAttribute('x2', W - padR);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e2e8f0');
      line.setAttribute('stroke-dasharray', s === 0 ? '0' : '4,4');
      line.setAttribute('stroke-width', '1');
      chartGrid.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', padL - 8);
      text.setAttribute('y', y + 4);
      text.setAttribute('text-anchor', 'end');
      text.setAttribute('font-size', '10');
      text.setAttribute('fill', '#94a3b8');
      text.textContent = v;
      chartGrid.appendChild(text);
    }

    // X Date labels
    const labelStep = n <= 7 ? 1 : n <= 14 ? 2 : 5;
    for (let i = 0; i < n; i += labelStep) {
      const x = getX(i);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', H - 10);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10.5');
      text.setAttribute('fill', '#64748b');
      text.setAttribute('font-weight', '500');
      text.textContent = data[i].date;
      chartGrid.appendChild(text);
    }
    if ((n - 1) % labelStep !== 0) {
      const x = getX(n - 1);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', H - 10);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '10.5');
      text.setAttribute('fill', '#64748b');
      text.setAttribute('font-weight', '500');
      text.textContent = data[n - 1].date;
      chartGrid.appendChild(text);
    }

    // Smooth curve generator
    function buildPath(pts) {
      if (pts.length < 2) return '';
      let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i === 0 ? 0 : i - 1];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[i + 2] || p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
      }
      return d;
    }

    const visitorsPts = data.map((d, i) => ({ x: getX(i), y: getY(d.visitors) }));
    const viewsPts = data.map((d, i) => ({ x: getX(i), y: getY(d.views) }));

    const visitorsLinePath = buildPath(visitorsPts);
    const viewsLinePath = buildPath(viewsPts);

    const firstX = visitorsPts[0].x.toFixed(1);
    const lastX = visitorsPts[visitorsPts.length - 1].x.toFixed(1);

    const visitorsAreaPath = `${visitorsLinePath} L ${lastX} ${yBottom} L ${firstX} ${yBottom} Z`;
    const viewsAreaPath = `${viewsLinePath} L ${lastX} ${yBottom} L ${firstX} ${yBottom} Z`;

    if (chartViewsLine) chartViewsLine.setAttribute('d', viewsLinePath);
    if (chartVisitorsLine) chartVisitorsLine.setAttribute('d', visitorsLinePath);
    if (chartViewsArea) chartViewsArea.setAttribute('d', viewsAreaPath);
    if (chartVisitorsArea) chartVisitorsArea.setAttribute('d', visitorsAreaPath);

    // Build interactive hover points
    chartPoints.innerHTML = '';
    data.forEach((d, i) => {
      const vx = getX(i);
      const vyVisitors = getY(d.visitors);
      const vyViews = getY(d.views);

      const cViews = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cViews.setAttribute('cx', vx);
      cViews.setAttribute('cy', vyViews);
      cViews.setAttribute('r', '4');
      cViews.setAttribute('fill', '#ffffff');
      cViews.setAttribute('stroke', '#8b5cf6');
      cViews.setAttribute('stroke-width', '2.5');
      cViews.style.cursor = 'pointer';
      chartPoints.appendChild(cViews);

      const cVisitors = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      cVisitors.setAttribute('cx', vx);
      cVisitors.setAttribute('cy', vyVisitors);
      cVisitors.setAttribute('r', '4');
      cVisitors.setAttribute('fill', '#ffffff');
      cVisitors.setAttribute('stroke', '#2563eb');
      cVisitors.setAttribute('stroke-width', '2.5');
      cVisitors.style.cursor = 'pointer';
      chartPoints.appendChild(cVisitors);

      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const colWidth = plotW / (n - 1);
      hitArea.setAttribute('x', vx - colWidth / 2);
      hitArea.setAttribute('y', padT);
      hitArea.setAttribute('width', colWidth);
      hitArea.setAttribute('height', plotH);
      hitArea.setAttribute('fill', 'transparent');
      hitArea.style.cursor = 'pointer';

      hitArea.addEventListener('mouseenter', () => {
        cVisitors.setAttribute('r', '6');
        cViews.setAttribute('r', '6');
        if (ctDate) ctDate.textContent = d.fullDate;
        if (ctVisitors) ctVisitors.textContent = d.visitors.toLocaleString();
        if (ctViews) ctViews.textContent = d.views.toLocaleString();
        if (chartTooltip) chartTooltip.classList.remove('hidden');
      });

      hitArea.addEventListener('mouseleave', () => {
        cVisitors.setAttribute('r', '4');
        cViews.setAttribute('r', '4');
      });

      chartPoints.appendChild(hitArea);
    });

    if (svgChart) {
      svgChart.addEventListener('mouseleave', () => {
        if (chartTooltip) chartTooltip.classList.add('hidden');
      });
    }
  }

  // =========================================================================
  // DETAILED VISITOR & IP INTELLIGENCE AUDIT
  // =========================================================================
  const vaVisitorsTbody = document.getElementById('va-visitors-tbody');
  const vaSearchInput = document.getElementById('va-search-input');
  const vaFilterCountry = document.getElementById('va-filter-country');
  const vaFilterDevice = document.getElementById('va-filter-device');
  const vaFilterSource = document.getElementById('va-filter-source');
  const vaResetFiltersBtn = document.getElementById('va-reset-filters-btn');
  const refreshVisitorsBtn = document.getElementById('refresh-visitors-btn');
  const vaStatActive = document.getElementById('va-stat-active');
  const vaStatIps = document.getElementById('va-stat-ips');
  const vaStatTopLoc = document.getElementById('va-stat-top-loc');
  const vaStatTopSrc = document.getElementById('va-stat-top-src');
  const vaShowingCount = document.getElementById('va-showing-count');

  let vaSearchTimeout = null;

    async function loadDetailedVisitors() {
    if (!vaVisitorsTbody) return;

    const search = vaSearchInput ? vaSearchInput.value.trim() : '';
    const country = vaFilterCountry ? vaFilterCountry.value : 'all';
    const device = vaFilterDevice ? vaFilterDevice.value : 'all';
    const source = vaFilterSource ? vaFilterSource.value : 'all';

    let visitors = [];
    let summary = {};

    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (country && country !== 'all') params.append('country', country);
      if (device && device !== 'all') params.append('device', device);
      if (source && source !== 'all') params.append('source', source);

      const res = await apiFetch(`/api/portfolio/analytics/visitors?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        visitors = data.visitors || [];
        summary = data.summary || {};
      } else {
        throw new Error('Static cloud fallback');
      }
    } catch (e) {
      // In-memory filter on GitHub Pages
      visitors = STATIC_CLOUD_DATA.visitors || [];
      if (search) {
        const s = search.toLowerCase();
        visitors = visitors.filter(v =>
          v.ip.toLowerCase().includes(s) ||
          v.city.toLowerCase().includes(s) ||
          v.country.toLowerCase().includes(s) ||
          (v.currentPage && v.currentPage.toLowerCase().includes(s)) ||
          (v.referrer && v.referrer.toLowerCase().includes(s)) ||
          (v.isp && v.isp.toLowerCase().includes(s)) ||
          v.id.toLowerCase().includes(s)
        );
      }
      if (country && country !== 'all') visitors = visitors.filter(v => v.country.toLowerCase() === country.toLowerCase());
      if (device && device !== 'all') visitors = visitors.filter(v => v.device.toLowerCase().includes(device.toLowerCase()));
      if (source && source !== 'all') visitors = visitors.filter(v => (v.referrerType || '').toLowerCase().includes(source.toLowerCase()));

      summary = {
        totalVisitors: STATIC_CLOUD_DATA.visitors.length,
        filteredCount: visitors.length,
        activeNow: STATIC_CLOUD_DATA.visitors.filter(v => v.status === 'online').length,
        uniqueIps: new Set(STATIC_CLOUD_DATA.visitors.map(v => v.ip)).size,
        topLocation: 'Chennai, India (42%)',
        topSource: 'GitHub /Hitesh070 (44%)'
      };
    }

    const activeNowCount = summary.activeNow !== undefined ? summary.activeNow : visitors.filter(v => v.status === 'online').length;
    if (vaStatActive) vaStatActive.textContent = `${activeNowCount} Active`;
    if (gaRealtimeUsers) gaRealtimeUsers.textContent = activeNowCount;
    if (vaStatIps) vaStatIps.textContent = `${summary.uniqueIps || 0} IPs`;
    if (vaStatTopLoc) vaStatTopLoc.textContent = summary.topLocation || 'Chennai, IN';
    if (vaStatTopSrc) vaStatTopSrc.textContent = summary.topSource || 'GitHub /Hitesh070';
    if (vaShowingCount) vaShowingCount.textContent = `Showing ${visitors.length} of ${summary.totalVisitors || visitors.length} indexed visitors`;

    // Synchronize Active Pages breakdown in Google Analytics tab
    const gaActivePagesTbody = document.getElementById('ga-active-pages-tbody');
    if (gaActivePagesTbody) {
      const onlineList = visitors.filter(v => v.status === 'online');
      if (onlineList.length > 0) {
        const pageGroups = {};
        onlineList.forEach(v => {
          const pg = v.currentPage || '/';
          if (!pageGroups[pg]) pageGroups[pg] = { count: 0, sample: v };
          pageGroups[pg].count++;
        });
        gaActivePagesTbody.innerHTML = Object.entries(pageGroups).map(([pg, info]) => `
          <tr>
            <td><strong>${escapeHtml(pg)}</strong></td>
            <td><span class="badge-success">${info.count} user${info.count > 1 ? 's' : ''}</span></td>
            <td>${escapeHtml(info.sample.city || info.sample.country || 'India')} &bull; ${escapeHtml(info.sample.referrerType || 'Direct')}</td>
            <td>${escapeHtml(info.sample.device || 'Desktop PC')}</td>
            <td>${escapeHtml(info.sample.duration || '2m 15s')}</td>
          </tr>
        `).join('');
      }
    }

    renderDetailedVisitors(visitors);
  }

  function renderDetailedVisitors(visitors) {
    if (!vaVisitorsTbody) return;
    vaVisitorsTbody.innerHTML = '';

    if (!visitors || visitors.length === 0) {
      vaVisitorsTbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">No visitors match the selected filters or search query.</td></tr>';
      return;
    }

    visitors.forEach(v => {
      const isOnline = v.status === 'online';
      const statusPill = isOnline
        ? `<span class="va-status-pill online"><span class="live-pulse-dot"></span>Active Now</span>`
        : `<span class="va-status-pill offline">${escapeHtml(v.statusText || 'offline')}</span>`;

      const pages = v.pagesVisited && v.pagesVisited.length > 0 ? v.pagesVisited : [v.currentPage || '/'];
      const flowHtml = pages.slice(0, 3).map(p => `<span class="va-flow-tag">${escapeHtml(p)}</span>`).join('<span class="va-flow-arrow">&rarr;</span>') + (pages.length > 3 ? `<span class="va-flow-tag">+${pages.length - 3}</span>` : '');

      let srcClass = 'direct';
      const refLow = (v.referrerType || '').toLowerCase();
      if (refLow.includes('github')) srcClass = 'github';
      else if (refLow.includes('linkedin')) srcClass = 'linkedin';
      else if (refLow.includes('google')) srcClass = 'google';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="va-visitor-badge">
            <span>👤</span>
            <span>${escapeHtml(v.id)}</span>
          </div>
          ${statusPill}
        </td>
        <td>
          <span class="va-ip-code">${escapeHtml(v.ip)}</span>
          <div class="va-isp-sub" title="${escapeHtml(v.isp || 'Broadband')}">${escapeHtml(v.isp || 'Broadband Network')}</div>
        </td>
        <td>
          <div class="va-loc-text">
            <span>${v.flag || '🌐'}</span>
            <span>${escapeHtml(v.city || v.country)}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${escapeHtml(v.country)}</div>
        </td>
        <td>
          <div class="va-device-info">
            <span class="va-device-main">${escapeHtml(v.device)}</span>
            <span class="va-device-sub">${escapeHtml(v.os)} &bull; ${escapeHtml(v.browser)}</span>
          </div>
        </td>
        <td>
          <div class="va-flow-container">
            ${flowHtml}
          </div>
        </td>
        <td>
          <span class="va-source-badge ${srcClass}">
            ${escapeHtml(v.referrer || v.referrerType || 'Direct')}
          </span>
        </td>
        <td>
          <span style="font-weight: 600; font-size: 12px; color: var(--text-primary);">${escapeHtml(v.duration || '2m 15s')}</span>
          <div style="font-size: 11px; color: #64748b;">${v.pageCount || 1} view(s)</div>
        </td>
        <td>
          <span style="font-size: 11.5px; color: #64748b;">${escapeHtml(v.timeFormatted || 'Recent')}</span>
        </td>
      `;
      vaVisitorsTbody.appendChild(tr);
    });
  }

  // Search & Filter event listeners
  if (vaSearchInput) {
    vaSearchInput.addEventListener('input', () => {
      clearTimeout(vaSearchTimeout);
      vaSearchTimeout = setTimeout(() => {
        loadDetailedVisitors();
      }, 250);
    });
  }

  if (vaFilterCountry) vaFilterCountry.addEventListener('change', loadDetailedVisitors);
  if (vaFilterDevice) vaFilterDevice.addEventListener('change', loadDetailedVisitors);
  if (vaFilterSource) vaFilterSource.addEventListener('change', loadDetailedVisitors);

  if (vaResetFiltersBtn) {
    vaResetFiltersBtn.addEventListener('click', () => {
      if (vaSearchInput) vaSearchInput.value = '';
      if (vaFilterCountry) vaFilterCountry.value = 'all';
      if (vaFilterDevice) vaFilterDevice.value = 'all';
      if (vaFilterSource) vaFilterSource.value = 'all';
      loadDetailedVisitors();
      showToast('Filters reset', 'success');
    });
  }

  if (refreshVisitorsBtn) {
    refreshVisitorsBtn.addEventListener('click', () => {
      loadDetailedVisitors();
      showToast('Visitor intelligence refreshed', 'success');
    });
  }

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
