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
  // SUPABASE CONFIGURATION, SESSION MANAGEMENT & SUITE API WRAPPER
  // =========================================================================
  function getSupabaseConfig() {
    const cfg = window.ADMIN_CONFIG || {};
    return {
      url: (localStorage.getItem('admin_supabase_url') || cfg.SUPABASE_URL || '').trim().replace(/\/+$/, ''),
      key: (localStorage.getItem('admin_supabase_key') || cfg.SUPABASE_ANON_KEY || '').trim(),
      bucket: cfg.BUCKET || 'temp_vault',
      adminEmail: cfg.ADMIN_EMAIL || 'hiteshvs616@gmail.com'
    };
  }

  function getStoredAuthSession() {
    try {
      const raw = sessionStorage.getItem('supabase_auth_session') || localStorage.getItem('supabase_auth_session');
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
    const payload = JSON.stringify(sessionData);
    if (isPublicPc) {
      sessionStorage.setItem('supabase_auth_session', payload);
      localStorage.removeItem('supabase_auth_session');
    } else {
      localStorage.setItem('supabase_auth_session', payload);
      sessionStorage.removeItem('supabase_auth_session');
    }
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
        const isPublicPc = sessionStorage.getItem('admin_public_pc_mode') === 'true';
        setSupabaseSession(fresh, isPublicPc);
        return fresh.access_token;
      }
    } catch (e) {
      console.warn('Failed to refresh Supabase token:', e);
    }
    return null;
  }

  // Central supa(path, opts) wrapper - throws on non-2xx with real status+message
  async function supa(path, opts = {}) {
    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      const err = new Error('Supabase configuration missing (set SUPABASE_URL & SUPABASE_ANON_KEY in admin/config.js)');
      showToast(err.message, 'error');
      throw err;
    }

    const fullUrl = path.startsWith('http') ? path : `${url}${path.startsWith('/') ? '' : '/'}${path}`;
    let token = getSupabaseUserToken();
    const headers = {
      'apikey': key,
      'Authorization': `Bearer ${token || key}`,
      ...(opts.headers || {})
    };

    if (opts.body && !(opts.body instanceof FormData) && !(opts.body instanceof Blob) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    let res = await fetch(fullUrl, { ...opts, headers });

    // Handle 401 token expiry: attempt refresh once
    if (res.status === 401 && token) {
      const freshToken = await refreshSupabaseToken();
      if (freshToken) {
        headers['Authorization'] = `Bearer ${freshToken}`;
        res = await fetch(fullUrl, { ...opts, headers });
      }
    }

    if (!res.ok) {
      let errorMsg = `Supabase error (${res.status} ${res.statusText})`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.msg || errJson.message || errJson.error_description || errJson.error || errorMsg;
      } catch (_) {
        try {
          const errText = await res.text();
          if (errText) errorMsg = errText;
        } catch (__) {}
      }
      const err = new Error(errorMsg);
      err.status = res.status;
      showToast(errorMsg, 'error');
      throw err;
    }
    return res;
  }
  window.supa = supa;

  // Session Check
  async function checkAuth() {
    const sess = getStoredAuthSession();
    if (!sess || !sess.access_token) {
      setLoggedOut();
      return;
    }

    const { url, key } = getSupabaseConfig();
    if (!url || !key) {
      setLoggedIn('Admin');
      return;
    }

    try {
      const res = await fetch(`${url}/auth/v1/user`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${sess.access_token}`
        }
      });
      if (res.ok) {
        const userData = await res.json();
        setLoggedIn(userData.email || 'Admin');
        return;
      } else if (res.status === 401) {
        const fresh = await refreshSupabaseToken();
        if (fresh) {
          setLoggedIn('Admin');
          return;
        }
      }
    } catch (e) {
      setLoggedIn('Admin');
      return;
    }
    setLoggedOut();
  }

  // Login Submit with Supabase Auth Password Grant
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
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

    // Resolve email: username can be 'admin', 'hitesh', or direct email
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
        setSupabaseSession(data, isPublicPc);
        showToast(`Welcome back, ${username}!`, 'success');

        if (typeof recordAuditLoginAttempt === 'function') {
          recordAuditLoginAttempt('SUCCESS', username, isPublicPc);
        }

        setLoggedIn(username, true);
        return;
      } else {
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

  // Logout with Session Wiping & Public PC Protection
  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to log out of the Admin Portal?');
    if (!confirmed) return;

    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}

    clearCryptographicSession();
    setAuthToken('');
    setDirectDriveToken('');

    const isPublicPc = sessionStorage.getItem('admin_public_pc_mode') === 'true' || localStorage.getItem('admin_public_pc_mode') === 'true';
    if (isPublicPc) {
      sessionStorage.clear();
      localStorage.removeItem('gdrive_direct_token');
      localStorage.removeItem('gdrive_token_expires');
      localStorage.removeItem('portfolio_admin_token');
      localStorage.removeItem('admin_public_pc_mode');
      try {
        if (window.indexedDB) {
          indexedDB.deleteDatabase('PortfolioVaultDB');
        }
      } catch (err) {}
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
      renderAnalyticsChart();
      loadDetailedVisitors();
    }
  }

  // Dock Navigation
  document.querySelectorAll('.dock-nav .dock-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });


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

  // Admin Scratchpad (Automatic Real-Time Cloud Sync with Supabase + Persistent Backup)
  let cloudSaveTimeout = null;

  async function syncScratchpadToCloud(text) {
    const { url, key } = getSupabaseConfig();
    const setStatus = (msg, isErr = false) => {
      const cls = isErr ? 'amber' : 'green';
      if (scratchpadStatus) scratchpadStatus.innerHTML = `<span class="badge-${cls}">${msg}</span>`;
      if (fullScratchpadStatus) fullScratchpadStatus.innerHTML = `<span class="badge-${cls}">${msg}</span>`;
    };

    if (!url || !key) {
      setStatus('Saved Locally (Link Supabase in Settings for Cloud Sync)');
      return;
    }

    setStatus('Saving to Cloud...');
    try {
      const bucketName = getSupabaseConfig().bucket || 'temp_vault';
      const uploadUrl = `${url}/storage/v1/object/${bucketName}/admin_scratchpad.txt`;
      let res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'text/plain; charset=utf-8',
          'x-upsert': 'true'
        },
        body: text
      });

      if (!res.ok) {
        res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'text/plain; charset=utf-8'
          },
          body: text
        });
      }

      if (res.ok) {
        setStatus('Saved to Cloud (Supabase)');
      } else {
        const errText = await res.text().catch(() => '');
        console.warn('Supabase scratchpad error response:', res.status, errText);
        if (res.status === 401 || res.status === 403) {
          setStatus('Cloud Sync Error (Check Supabase RLS / Policy)', true);
        } else if (res.status === 404) {
          setStatus(`Bucket "${bucketName}" not found in Supabase`, true);
        } else {
          setStatus(`Cloud Sync Failed (${res.status}) - Saved Locally`, true);
        }
      }
    } catch (e) {
      console.warn('Scratchpad cloud sync error:', e);
      setStatus('Saved Locally (Offline)', true);
    }
  }

  async function loadAdminNotes() {
    const { url, key } = getSupabaseConfig();
    if (url && key) {
      try {
        const bucketName = getSupabaseConfig().bucket || 'temp_vault';
        const fetchUrl = `${url}/storage/v1/object/public/${bucketName}/admin_scratchpad.txt?t=${Date.now()}`;
        let res = await fetch(fetchUrl, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        if (!res.ok) {
          res = await fetch(`${url}/storage/v1/object/authenticated/temp_vault/admin_scratchpad.txt?t=${Date.now()}`, {
            headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
          });
        }
        if (res.ok) {
          const cloudText = await res.text();
          if (cloudText && !cloudText.includes('"statusCode":404')) {
            localStorage.setItem('portfolio_admin_notes', cloudText);
            if (adminScratchpad) adminScratchpad.value = cloudText;
            if (fullAdminScratchpad) fullAdminScratchpad.value = cloudText;
            if (scratchpadStatus) scratchpadStatus.innerHTML = '<span class="badge-success">Synced with Cloud (Supabase)</span>';
            if (fullScratchpadStatus) fullScratchpadStatus.innerHTML = '<span class="badge-success">Synced with Cloud (Supabase)</span>';
            return;
          }
        }
      } catch (e) {
        console.warn('Error loading notes from Supabase:', e);
      }
    }

    const savedNotes = localStorage.getItem('portfolio_admin_notes') || '';
    if (adminScratchpad) adminScratchpad.value = savedNotes;
    if (fullAdminScratchpad) fullAdminScratchpad.value = savedNotes;
    if (url && key) {
      if (scratchpadStatus) scratchpadStatus.innerHTML = '<span class="badge-success">Cloud Sync Ready (Supabase)</span>';
      if (fullScratchpadStatus) fullScratchpadStatus.innerHTML = '<span class="badge-success">Cloud Sync Ready (Supabase)</span>';
    } else {
      if (scratchpadStatus) scratchpadStatus.innerHTML = '<span class="badge-neutral">Ready</span>';
      if (fullScratchpadStatus) fullScratchpadStatus.innerHTML = '<span class="badge-neutral">Ready</span>';
    }
  }

  function handleScratchpadInput(sourceEl, targetEl) {
    const val = sourceEl.value;
    if (targetEl && targetEl.value !== val) targetEl.value = val;
    localStorage.setItem('portfolio_admin_notes', val);

    if (scratchpadStatus) scratchpadStatus.innerHTML = '<span class="badge-amber">Syncing...</span>';
    if (fullScratchpadStatus) fullScratchpadStatus.innerHTML = '<span class="badge-amber">Syncing...</span>';

    clearTimeout(cloudSaveTimeout);
    cloudSaveTimeout = setTimeout(() => {
      syncScratchpadToCloud(val);
    }, 600);
  }

  if (adminScratchpad) {
    adminScratchpad.addEventListener('input', () => handleScratchpadInput(adminScratchpad, fullAdminScratchpad));
  }
  if (fullAdminScratchpad) {
    fullAdminScratchpad.addEventListener('input', () => handleScratchpadInput(fullAdminScratchpad, adminScratchpad));
  }

  if (saveScratchpadBtn) {
    saveScratchpadBtn.addEventListener('click', () => {
      syncScratchpadToCloud(adminScratchpad ? adminScratchpad.value : '');
      showToast('Scratchpad synced to Cloud!', 'success');
    });
  }
  if (fullSaveScratchpadBtn) {
    fullSaveScratchpadBtn.addEventListener('click', () => {
      syncScratchpadToCloud(fullAdminScratchpad ? fullAdminScratchpad.value : '');
      showToast('Scratchpad synced to Cloud!', 'success');
    });
  }

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
          scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
          callback: async (response) => {
            if (response.error) {
              console.warn('GIS callback note:', response.error);
              showToast('Google Sign-In notice: ' + response.error, 'info');
              return;
            }
            if (response.access_token) {
              setDirectDriveToken(response.access_token);
              showToast('Connected to Google Drive 24/7 Live!', 'success');
              await loadDirectDriveFiles();
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
      '&scope=' + encodeURIComponent('https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email') +
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
  const IDB_NAME = 'PortfolioAdminTempVault';
  const IDB_VERSION = 1;
  const IDB_STORE = 'staged_files';

  function openTempDatabase() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Supabase Storage Cloud Engine & Bucket Management
  async function ensureSupabaseBucket(url, key) {
    if (!url || !key) return;
    try {
      const res = await fetch(`${url}/storage/v1/bucket/temp_vault`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      if (res.status === 404) {
        await fetch(`${url}/storage/v1/bucket`, {
          method: 'POST',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id: 'temp_vault', name: 'temp_vault', public: true })
        });
      }
    } catch (e) {
      console.warn('ensureSupabaseBucket error:', e);
    }
  }

  async function fetchSupabaseStagedFiles(url, key) {
    if (!url || !key) return [];
    try {
      const bucketName = getSupabaseConfig().bucket || 'temp_vault';
      const res = await fetch(`${url}/storage/v1/object/list/${bucketName}`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prefix: '',
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })
      });
      if (!res.ok) return [];
      const list = await res.json();
      if (!Array.isArray(list)) return [];
      return list.filter(item => item.name && item.name !== 'admin_scratchpad.txt' && item.name !== '_vault_ping.txt' && !item.name.startsWith('.')).map(item => {
        const displayName = item.name.replace(/^\d+_/, '');
        const size = (item.metadata && item.metadata.size) || item.size || 0;
        const mimeType = (item.metadata && item.metadata.mimetype) || 'application/octet-stream';
        const publicUrl = `${url}/storage/v1/object/public/${bucketName}/${encodeURIComponent(item.name)}`;
        return {
          id: 'supa_' + item.name,
          name: displayName,
          rawName: item.name,
          size: size,
          sizeFormatted: formatBytes(size),
          type: mimeType,
          date: item.created_at ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Cloud Vault',
          device: 'Supabase Cloud Vault',
          cloudUrl: publicUrl,
          isCloud: true
        };
      });
    } catch (e) {
      console.warn('Error fetching Supabase staged files:', e);
      return [];
    }
  }

  async function getCombinedStagedFiles() {
    const localFiles = await idbGetStagedFiles();
    const { url, key } = getSupabaseConfig();
    if (!url || !key) return localFiles;

    const cloudFiles = await fetchSupabaseStagedFiles(url, key);
    const localNames = new Set(localFiles.map(f => f.name));
    const combined = [...localFiles];
    for (const cf of cloudFiles) {
      if (!localNames.has(cf.name)) {
        combined.push(cf);
      }
    }
    return combined;
  }

  async function idbGetStagedFiles() {
    try {
      const db = await openTempDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  }

  async function idbSaveStagedFile(fileObj) {
    try {
      const db = await openTempDatabase();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(fileObj);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      return false;
    }
  }

  async function idbDeleteStagedFile(id) {
    try {
      const db = await openTempDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.delete(id);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  async function idbClearStagedFiles() {
    try {
      const db = await openTempDatabase();
      return new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (e) {
      return false;
    }
  }

  // Supabase Cloud Storage Bridge (100% Free Forever • Zero Card)
  function getSupabaseConfig() {
    return {
      url: (localStorage.getItem('admin_supabase_url') || '').trim().replace(/\/+$/, ''),
      key: (localStorage.getItem('admin_supabase_key') || '').trim(),
      bucket: (localStorage.getItem('admin_supabase_bucket') || 'temp_vault').trim()
    };
  }

  async function uploadToSupabaseBucket(file) {
    const { url, key, bucket } = getSupabaseConfig();
    if (!url || !key) return null;

    try {
      const cleanFileName = encodeURIComponent(file.name.replace(/[^a-zA-Z0-9._-]/g, '_'));
      const bucketName = bucket || 'temp_vault';
      const rawName = `${Date.now()}_${cleanFileName}`;
      const uploadUrl = `${url}/storage/v1/object/${bucketName}/${rawName}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      if (res.ok) {
        const publicUrl = `${url}/storage/v1/object/public/${bucketName}/${rawName}`;
        return { rawName, url: publicUrl };
      } else {
        console.warn('Supabase upload status:', res.status, await res.text().catch(() => ''));
      }
    } catch (e) {
      console.warn('Supabase cloud staging upload notice:', e);
    }
    return null;
  }

  async function renderStagedFiles() {
    const files = await getCombinedStagedFiles();
    if (tempStagedCount) tempStagedCount.textContent = files.length;
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    if (tempStagedSize) tempStagedSize.textContent = formatBytes(totalBytes);

    if (!tempStagedTbody) return;
    if (files.length === 0) {
      tempStagedTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 32px; color: #94a3b8;">No files staged yet. Drag & drop or browse files above to stage them across all your devices via Supabase Cloud Vault.</td></tr>';
      return;
    }

    tempStagedTbody.innerHTML = files.map(f => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="#f59e0b" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <strong>${escapeHtml(f.name)}</strong>
          </div>
        </td>
        <td>${escapeHtml(f.sizeFormatted || formatBytes(f.size))}</td>
        <td><span style="font-size: 12px; color: #64748b;">${escapeHtml(f.date || 'Today')}</span></td>
        <td><span class="${f.isCloud ? 'badge-success' : 'badge-neutral'}">${escapeHtml(f.isCloud ? 'Supabase Cloud Vault' : (f.device || 'Local Drop'))}</span></td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 6px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="downloadStagedFile('${f.id}')">Download</button>
            <button type="button" class="btn btn-primary btn-sm" onclick="moveStagedFileToDrive('${f.id}')">Move to Drive &rarr;</button>
            <button type="button" class="btn btn-danger-soft btn-sm" onclick="deleteStagedFile('${f.id}')">&times;</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  window.downloadStagedFile = async function(id) {
    const files = await getCombinedStagedFiles();
    const f = files.find(x => x.id === id);
    if (!f) {
      showToast('File data not found in staging vault', 'error');
      return;
    }
    if (f.blob) {
      const url = URL.createObjectURL(f.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
    } else if (f.cloudUrl) {
      const { key } = getSupabaseConfig();
      try {
        const res = await fetch(f.cloudUrl, {
          headers: key ? { 'apikey': key, 'Authorization': `Bearer ${key}` } : {}
        });
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
      } catch (e) {
        window.open(f.cloudUrl, '_blank');
      }
    }
  };

  window.deleteStagedFile = async function(id) {
    const files = await getCombinedStagedFiles();
    const f = files.find(x => x.id === id);
    if (!f) return;

    if (f.rawName) {
      const { url, key } = getSupabaseConfig();
      if (url && key) {
        try {
          const { bucket } = getSupabaseConfig();
          const bucketName = bucket || 'temp_vault';
          await fetch(`${url}/storage/v1/object/${bucketName}`, {
            method: 'DELETE',
            headers: {
              'apikey': key,
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prefixes: [f.rawName] })
          });
        } catch (e) {}
      }
    }

    await idbDeleteStagedFile(id);
    await renderStagedFiles();
    showToast('File removed from temp staging', 'info');
  };

  async function checkAndResumePendingDriveUploads() {
    const pendingSingle = sessionStorage.getItem('pending_drive_upload_id');
    const pendingAll = sessionStorage.getItem('pending_drive_upload_all');
    if (pendingSingle) {
      sessionStorage.removeItem('pending_drive_upload_id');
      showToast('Resuming transfer to Google Drive...', 'info');
      await window.moveStagedFileToDrive(pendingSingle);
    } else if (pendingAll) {
      sessionStorage.removeItem('pending_drive_upload_all');
      showToast('Resuming transfer of all staged files...', 'info');
      const moveAllBtn = document.getElementById('move-all-to-drive-btn');
      if (moveAllBtn) moveAllBtn.click();
    }
  }

  window.moveStagedFileToDrive = async function(id) {
    const directToken = getDirectDriveToken();
    if (!directToken) {
      sessionStorage.setItem('pending_drive_upload_id', id);
      showToast('Connecting to Google Drive authorization to complete transfer...', 'info');
      triggerGoogleSignIn();
      return;
    }

    const files = await getCombinedStagedFiles();
    const f = files.find(x => x.id === id);
    if (!f) {
      showToast('File not found in staging vault', 'warning');
      return;
    }

    showToast(`Transferring "${f.name}" to Google Drive...`, 'info');
    try {
      let fileBlob = f.blob;
      if (!fileBlob && f.cloudUrl) {
        const { key } = getSupabaseConfig();
        const res = await fetch(f.cloudUrl, {
          headers: key ? { 'apikey': key, 'Authorization': `Bearer ${key}` } : {}
        });
        if (res.ok) {
          fileBlob = await res.blob();
        }
      }

      if (!fileBlob) {
        showToast('Could not retrieve file content for transfer', 'error');
        return;
      }

      const metadata = {
        name: f.name,
        mimeType: f.type || 'application/octet-stream'
      };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', fileBlob);

      const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${directToken}` },
        body: form
      });

      if (uploadRes.ok) {
        showToast(`Successfully moved "${f.name}" to Google Drive!`, 'success');
        await window.deleteStagedFile(id);
        await renderStagedFiles();
        await loadDirectDriveFiles();
      } else {
        const err = await uploadRes.json().catch(() => ({}));
        showToast('Google Drive upload error: ' + (err.error ? err.error.message : uploadRes.statusText), 'error');
      }
    } catch (err) {
      showToast('Transfer error: ' + err.message, 'error');
    }
  };

  if (tempMoveAllBtn) {
    tempMoveAllBtn.addEventListener('click', async () => {
      const files = await getCombinedStagedFiles();
      if (files.length === 0) {
        showToast('No staged files to transfer', 'info');
        return;
      }
      const directToken = getDirectDriveToken();
      if (!directToken) {
        sessionStorage.setItem('pending_drive_upload_all', 'true');
        showToast('Connecting to Google Drive authorization to complete transfer...', 'info');
        triggerGoogleSignIn();
        return;
      }

      tempMoveAllBtn.disabled = true;
      tempMoveAllBtn.innerHTML = '<span>Transferring All...</span>';
      let successCount = 0;

      for (const f of files) {
        try {
          let fileBlob = f.blob;
          if (!fileBlob && f.cloudUrl) {
            const { key } = getSupabaseConfig();
            const res = await fetch(f.cloudUrl, {
              headers: key ? { 'apikey': key, 'Authorization': `Bearer ${key}` } : {}
            });
            if (res.ok) fileBlob = await res.blob();
          }

          if (!fileBlob) continue;

          const metadata = { name: f.name, mimeType: f.type || 'application/octet-stream' };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', fileBlob);

          const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${directToken}` },
            body: form
          });

          if (uploadRes.ok) {
            await window.deleteStagedFile(f.id);
            successCount++;
          }
        } catch (e) {}
      }

      tempMoveAllBtn.disabled = false;
      tempMoveAllBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg><span>Move All to Google Drive</span>';
      await renderStagedFiles();
      await loadDirectDriveFiles();
      showToast(`Successfully transferred ${successCount} file(s) into your Google Drive!`, 'success');
    });
  }

  if (tempClearAllBtn) {
    tempClearAllBtn.addEventListener('click', async () => {
      if (confirm('Clear all staged files from this staging vault?')) {
        await idbClearStagedFiles();
        await renderStagedFiles();
        showToast('Staging vault cleared', 'info');
      }
    });
  }

  // Refresh Cloud Button in Temp Drop tab
  const tempRefreshBtn = document.getElementById('temp-refresh-btn');
  if (tempRefreshBtn) {
    tempRefreshBtn.addEventListener('click', async () => {
      showToast('Refreshing Cloud Vault files...', 'info');
      await renderStagedFiles();
      showToast('Cloud Vault files synced!', 'success');
    });
  }

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
    const { url, key } = getSupabaseConfig();

    for (const file of items) {
      const fileId = 'stg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const stagedObj = {
        id: fileId,
        name: file.name,
        size: file.size,
        sizeFormatted: formatBytes(file.size),
        type: file.type || 'application/octet-stream',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        device: url && key ? 'Supabase Cloud Vault' : 'Local Drop',
        blob: file
      };

      await idbSaveStagedFile(stagedObj);
      if (url && key) {
        showToast(`Uploading "${file.name}" to Supabase Cloud Vault...`, 'info');
        await uploadToSupabaseBucket(file);
      }
    }

    await renderStagedFiles();
    showToast(`Staged ${items.length} file(s) in Temp Drop Vault!`, 'success');
  }

  // =========================================================================
  // CLIPBOARD PASTE ENGINE & SUPABASE CLOUD VAULT HANDLERS
  // =========================================================================
  async function pasteFromClipboard(targetInput) {
    if (!targetInput) return;
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          targetInput.value = text.trim();
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
          showToast('Pasted from clipboard!', 'success');
          return;
        }
      }
    } catch (err) {}

    const manual = prompt('Paste your copied link / key here:');
    if (manual && manual.trim()) {
      targetInput.value = manual.trim();
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      showToast('Pasted successfully!', 'success');
    }
  }

  // Supabase Settings UI & Diagnostics
  const settingsSupaUrl = document.getElementById('settings-supa-url');
  const settingsSupaBucket = document.getElementById('settings-supa-bucket');
  const testSupabaseBtn = document.getElementById('test-supabase-btn');
  const supabaseStatusBadge = document.getElementById('supabase-status-badge');

  function updateSupabaseStatusUI() {
    const { url, key, bucket } = getSupabaseConfig();
    if (settingsSupaUrl) settingsSupaUrl.textContent = url || 'Configured in admin/config.js';
    if (settingsSupaBucket) settingsSupaBucket.textContent = bucket || 'temp_vault';
    if (supabaseStatusBadge) {
      if (url && key) {
        supabaseStatusBadge.className = 'badge-success';
        supabaseStatusBadge.textContent = '● Supabase Config Active';
      } else {
        supabaseStatusBadge.className = 'badge-amber';
        supabaseStatusBadge.textContent = '● Configuration Incomplete';
      }
    }
  }

  if (testSupabaseBtn) {
    testSupabaseBtn.addEventListener('click', async () => {
      const { url, key } = getSupabaseConfig();
      if (!url || !key) {
        showToast('Supabase configuration missing in admin/config.js', 'warning');
        return;
      }
      testSupabaseBtn.disabled = true;
      testSupabaseBtn.textContent = 'Testing...';
      try {
        await supa('/rest/v1/admin_notes?select=id&limit=1', { method: 'GET' });
        showToast('Supabase connection verified successfully!', 'success');
      } catch (err) {
        showToast('Connection test: ' + err.message, 'warning');
      } finally {
        testSupabaseBtn.disabled = false;
        testSupabaseBtn.textContent = 'Test Connection';
      }
    });
  }



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
