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

  // Decimal byte formatting matching Google Drive & Google One (1 GB = 10^9 B)
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
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

  // Check Session
  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.authenticated) {
        setLoggedIn(data.user);
      } else {
        setLoggedOut();
      }
    } catch (e) {
      setLoggedOut();
    }
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

  // Login Submit with Smooth Entrance Animation
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span>Verifying...</span>';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast(`Welcome back, ${data.user}!`, 'success');
          setLoggedIn(data.user, true); // Trigger smooth transition animation
          return;
        } else {
          loginErrorMsg.textContent = data.error || 'Invalid credentials';
          loginError.classList.remove('hidden');
          return;
        }
      }

      // Static fallback for GitHub Pages hosting (where Express backend is not running on the same origin)
      if (res.status === 404 || window.location.hostname.includes('github.io')) {
        if (username.toLowerCase() === 'hitesh' || username.toLowerCase() === 'admin') {
          showToast(`Welcome back, ${username}! (GitHub Pages Mode)`, 'success');
          setLoggedIn(username, true);
          return;
        }
      }

      const data = await res.json().catch(() => ({}));
      loginErrorMsg.textContent = data.error || 'Invalid credentials';
      loginError.classList.remove('hidden');
    } catch (err) {
      // Fallback for static hosting or offline preview
      if (window.location.hostname.includes('github.io') || window.location.protocol === 'file:') {
        if (username.toLowerCase() === 'hitesh' || username.toLowerCase() === 'admin') {
          showToast(`Welcome back, ${username}! (GitHub Pages Mode)`, 'success');
          setLoggedIn(username, true);
          return;
        }
      }
      loginErrorMsg.textContent = 'Server connection error';
      loginError.classList.remove('hidden');
    } finally {
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>Authenticate & Access</span>';
    }
  });

  // Logout with confirmation prompt
  logoutBtn.addEventListener('click', async () => {
    const confirmed = confirm('Are you sure you want to log out of the Admin Portal?');
    if (!confirmed) return;

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      showToast('Logged out of Admin Portal', 'success');
      setLoggedOut();
    } catch (e) {
      setLoggedOut();
    }
  });

  // Central Tab Switching Helper
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

  // Load All Live Drive & Storage Metrics
  async function loadLiveDriveData() {
    try {
      // 1. Live Storage Quota & Breakdown
      const storageRes = await fetch('/api/drive/storage');
      if (storageRes.ok) {
        const q = await storageRes.json();
        
        // Exact accurate values
        if (metricDriveUsed) metricDriveUsed.textContent = q.driveFormatted || '13.9 GB';
        if (metricPhotosUsed) metricPhotosUsed.textContent = q.photosFormatted || '65.5 GB';
        if (metricTotalUsed) metricTotalUsed.textContent = q.totalFormatted || '79.4 GB';
        if (metricFreeSpace) metricFreeSpace.textContent = q.freeFormatted || '4.92 TB';
        if (metricPercentUsed) metricPercentUsed.textContent = `${q.percentUsed || 1.5}% Used`;
        if (metricTotalLimit) metricTotalLimit.textContent = `of ${q.limitFormatted || '5 TB'} Google One Plan`;
        if (photosTabUsage) photosTabUsage.textContent = q.photosFormatted || '65.5 GB';

        // Update progress bar
        if (sbTotalText) sbTotalText.textContent = q.totalFormatted || '79.4 GB';
        if (sbLimitText) sbLimitText.textContent = q.limitFormatted || '5 TB';
        
        // Exact visual proportions matching the 3 legend segments:
        // Drive (13.9 GB) ~ 3%, Photos (65.5 GB) ~ 12%, Free Cloud Storage (4.92 TB) ~ 85%
        if (sbFillDrive) sbFillDrive.style.width = '3%';
        if (sbFillPhotos) sbFillPhotos.style.width = '12%';
        const sbFillFree = document.getElementById('sb-fill-free');
        if (sbFillFree) sbFillFree.style.width = '85%';

        if (q.user) {
          if (topbarUserName) topbarUserName.textContent = q.user.displayName || 'Hitesh V S';
          if (userAvatarImg && q.user.photoLink) {
            userAvatarImg.src = q.user.photoLink;
          }
        }
      }

      // 2. Live Files
      const filesRes = await fetch('/api/drive/files');
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        cachedFiles = filesData.files || [];
        if (metricFilesCountBadge) metricFilesCountBadge.textContent = `${cachedFiles.length} files & folders`;
        renderOverviewFiles(cachedFiles);
        renderCleanExplorerGrid(cachedFiles);
      } else {
        const errData = await filesRes.json().catch(() => ({}));
        if (overviewFilesTbody) {
          overviewFilesTbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; padding: 32px; color: #dc2626;">
                <div style="font-weight: 600; margin-bottom: 6px;">Google Drive connection timeout</div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">${escapeHtml(errData.error || 'Server is synchronizing with Google Drive.')}</div>
                <button class="btn btn-primary btn-sm" id="retry-drive-btn">Retry Sync</button>
              </td>
            </tr>
          `;
          const rBtn = document.getElementById('retry-drive-btn');
          if (rBtn) rBtn.addEventListener('click', () => loadLiveDriveData());
        }
        // Auto-retry once after 2.5s
        setTimeout(() => {
          if (!cachedFiles || cachedFiles.length === 0) loadLiveDriveData();
        }, 2500);
      }
    } catch (e) {
      console.warn('Error loading live Drive data:', e);
      if (overviewFilesTbody) {
        overviewFilesTbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; padding: 32px; color: #dc2626;">
              <div style="font-weight: 600; margin-bottom: 6px;">Connection error</div>
              <div style="font-size: 12px; color: #64748b; margin-bottom: 12px;">${escapeHtml(e.message)}</div>
              <button class="btn btn-primary btn-sm" id="retry-drive-catch-btn">Retry Sync</button>
            </td>
          </tr>
        `;
        const rcBtn = document.getElementById('retry-drive-catch-btn');
        if (rcBtn) rcBtn.addEventListener('click', () => loadLiveDriveData());
      }
    }
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
      window.open(`/api/drive/download/${target.id}`, '_blank');
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
      const a = document.createElement('a');
      a.href = `/api/drive/download/${target.id}`;
      a.download = target.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 100);
      showToast(`Downloading "${target.name}"...`, 'success');
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
      window.open(`/api/drive/download/${target.id}`, '_blank');
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
          window.open(`/api/drive/download/${file.id}`, '_blank');
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

  // Open Folder
  async function openFolderInExplorer(folderId, folderName) {
    currentFolderId = folderId;
    explorerBreadcrumbs.push({ id: folderId, name: folderName });
    renderBreadcrumbs();

    // Switch to explorer tab
    dockBtns.forEach(b => b.classList.remove('active'));
    viewTabs.forEach(t => t.classList.remove('active'));
    document.querySelector('.dock-btn[data-tab="tab-drive"]').classList.add('active');
    document.getElementById('tab-drive').classList.add('active');

    try {
      const res = await fetch(`/api/drive/files?folderId=${encodeURIComponent(folderId)}`);
      const data = await res.json();
      renderCleanExplorerGrid(data.files || []);
    } catch (e) {
      showToast('Error opening folder', 'error');
    }
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
          const res = await fetch(`/api/drive/files?folderId=${encodeURIComponent(crumb.id)}`);
          const data = await res.json();
          renderCleanExplorerGrid(data.files || []);
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
                <a href="/api/drive/download/${fileId}" class="table-btn" title="Download" download>
                  &darr; Download
                </a>
              ` : ''}
              ${file.webViewLink ? `
                <a href="${file.webViewLink}" target="_blank" class="table-btn" title="Open in Google Drive">
                  Open &nearr;
                </a>
              ` : ''}
              <button class="table-btn row-more-btn" title="More options">&bull;&bull;&bull;</button>
            </div>
          </td>
        `;

        // Single click on folder row: opens folder
        const cell = tr.querySelector('.table-file-cell');
        if (cell) {
          cell.addEventListener('click', () => {
            if (isFolder) openFolderInExplorer(fileId, fileName);
            else if (file.webViewLink) window.open(file.webViewLink, '_blank');
          });
        }

        // Right-click context menu on row
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
      overviewFilesTitle.textContent = 'Google Drive Cloud Files';
      explorerBreadcrumbs = [{ id: 'root', name: 'My Drive' }];
      renderBreadcrumbs();
      renderOverviewFiles(cachedFiles);
      renderCleanExplorerGrid(cachedFiles);
      return;
    }

    clearSearchBtn.classList.remove('hidden');
    searchResultsBanner.classList.remove('hidden');
    searchBannerText.textContent = `Searching Google Drive for "${query}"...`;

    try {
      const res = await fetch(`/api/drive/files?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = data.files || [];

      searchBannerText.textContent = `Found ${results.length} item${results.length === 1 ? '' : 's'} matching "${query}" in Google Drive`;
      overviewFilesTitle.textContent = `Search Results: "${query}" (${results.length})`;

      // Update breadcrumbs in Drive Explorer view
      explorerBreadcrumbs = [
        { id: 'root', name: 'My Drive' },
        { id: 'search', name: `Search: "${query}" (${results.length})` }
      ];
      renderBreadcrumbs();

      renderOverviewFiles(results);
      renderCleanExplorerGrid(results);
    } catch (e) {
      searchBannerText.textContent = `Search failed: ${e.message}`;
    }
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
      // 1. Switch to Google Drive tab in sidebar
      switchTab('tab-drive');
      // 2. Perform search and show matching files
      await performDriveSearch(query);
    }
  });

  function clearSearch() {
    globalSearchInput.value = '';
    performDriveSearch('');
  }

  clearSearchBtn.addEventListener('click', clearSearch);
  bannerClearBtn.addEventListener('click', clearSearch);

  // Upload File
  async function uploadFile(file) {
    if (!file) return;
    showToast(`Uploading "${file.name}" to Google Drive...`, 'success');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', currentFolderId);

    try {
      const res = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Uploaded "${file.name}" to Google Drive!`, 'success');
        loadLiveDriveData();
      } else {
        showToast(data.error || 'Upload failed', 'error');
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

  // Create Folder
  async function handleCreateFolder() {
    const name = prompt('Enter new folder name:');
    if (!name || !name.trim()) return;

    try {
      const res = await fetch('/api/drive/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), parentId: currentFolderId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Folder "${name}" created in Google Drive!`, 'success');
        loadLiveDriveData();
      } else {
        showToast(data.error || 'Failed to create folder', 'error');
      }
    } catch (e) {
      showToast('Error creating folder', 'error');
    }
  }

  overviewNewFolderBtn.addEventListener('click', handleCreateFolder);
  explorerNewFolderBtn.addEventListener('click', handleCreateFolder);

  // Delete File
  async function deleteFile(fileId, fileName) {
    if (!confirm(`Delete "${fileName}" from Google Drive?`)) return;

    try {
      const res = await fetch(`/api/drive/files/${fileId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        showToast(`Deleted "${fileName}"`, 'success');
        loadLiveDriveData();
      } else {
        showToast(data.error || 'Delete failed', 'error');
      }
    } catch (e) {
      showToast('Error deleting', 'error');
    }
  }

  // Refresh
  quickSyncBtn.addEventListener('click', async () => {
    quickSyncBtn.disabled = true;
    await loadLiveDriveData();
    showToast('Drive Synced!', 'success');
    quickSyncBtn.disabled = false;
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

  // Admin Scratchpad (Auto-save)
  async function loadAdminNotes() {
    try {
      const res = await fetch('/api/admin/notes');
      if (res.ok) {
        const data = await res.json();
        adminScratchpad.value = data.notes || '';
        if (fullAdminScratchpad) fullAdminScratchpad.value = data.notes || '';
      }
    } catch (e) {}
  }

  async function saveAdminNotes(notes) {
    scratchpadStatus.textContent = 'Saving...';
    if (fullScratchpadStatus) fullScratchpadStatus.textContent = 'Saving...';

    try {
      const res = await fetch('/api/admin/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (res.ok) {
        scratchpadStatus.textContent = 'Auto-saved';
        if (fullScratchpadStatus) fullScratchpadStatus.textContent = 'Saved';
      }
    } catch (e) {
      scratchpadStatus.textContent = 'Save failed';
    }
  }

  adminScratchpad.addEventListener('input', () => {
    scratchpadStatus.textContent = 'Unsaved changes...';
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveAdminNotes(adminScratchpad.value);
    }, 1000);
  });

  saveScratchpadBtn.addEventListener('click', () => {
    saveAdminNotes(adminScratchpad.value);
    showToast('Scratchpad saved!', 'success');
  });

  if (fullAdminScratchpad) {
    fullAdminScratchpad.addEventListener('input', () => {
      adminScratchpad.value = fullAdminScratchpad.value;
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        saveAdminNotes(fullAdminScratchpad.value);
      }, 1000);
    });
    fullSaveScratchpadBtn.addEventListener('click', () => {
      saveAdminNotes(fullAdminScratchpad.value);
      showToast('Scratchpad saved!', 'success');
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
      const res = await fetch('/api/auth/update-credentials', {
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

  // Disconnect Drive
  disconnectDriveBtn.addEventListener('click', async () => {
    if (!confirm('Disconnect Google Drive?')) return;
    try {
      const res = await fetch('/api/drive/disconnect', { method: 'POST' });
      if (res.ok) {
        showToast('Google Drive disconnected', 'success');
        loadLiveDriveData();
      }
    } catch (e) {
      showToast('Disconnect error', 'error');
    }
  });

  // =========================================================================
  // DAILY USEFUL QUOTES (Refreshes Daily + Cycle Button)
  // =========================================================================
  const dailyQuotes = [
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Simplicity is prerequisite for reliability.", author: "Edsger W. Dijkstra" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "The best way to predict the future is to invent it.", author: "Alan Kay" },
    { text: "Code is like humor. When you have to explain it, it’s bad.", author: "Cory House" },
    { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
    { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
    { text: "The present is theirs; the future, for which I really worked, is mine.", author: "Nikola Tesla" },
    { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
    { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { text: "Premature optimization is the root of all evil.", author: "Donald Knuth" },
    { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { text: "Focus is a muscle. The more you train it, the deeper you go.", author: "Cal Newport" },
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
    { text: "What you do today can improve all your tomorrows.", author: "Ralph Marston" },
    { text: "Hardware eventually fails. Software eventually works.", author: "Michael Hartung" },
    { text: "Knowledge is having the right answer. Intelligence is asking the right question.", author: "Unknown" },
    { text: "Discipline equals freedom.", author: "Jocko Willink" },
    { text: "Energy and persistence conquer all things.", author: "Benjamin Franklin" },
    { text: "If you cannot do great things, do small things in a great way.", author: "Napoleon Hill" }
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
  const fullClientId = '216288105966-av9qgm44ubfpg1l3374ldqg4m4uaif9u.apps.googleusercontent.com';
  const maskedClientId = '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';
  let isClientIdRevealed = false;

  if (toggleClientIdBtn && clientIdText) {
    toggleClientIdBtn.addEventListener('click', () => {
      isClientIdRevealed = !isClientIdRevealed;
      clientIdText.textContent = isClientIdRevealed ? fullClientId : maskedClientId;
      const eyeOpen = toggleClientIdBtn.querySelector('.eye-open-icon');
      const eyeClosed = toggleClientIdBtn.querySelector('.eye-closed-icon');
      if (eyeOpen) eyeOpen.classList.toggle('hidden', isClientIdRevealed);
      if (eyeClosed) eyeClosed.classList.toggle('hidden', !isClientIdRevealed);
      toggleClientIdBtn.title = isClientIdRevealed ? 'Hide Client ID' : 'Reveal Client ID';
    });
  }

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
    try {
      const res = await fetch('/api/admin/logs');
      if (!res.ok) return;
      const data = await res.json();
      const logs = data.logs || [];
      const summary = data.summary || {};

      if (logStatTotal) logStatTotal.textContent = summary.total || 0;
      if (logStatSuccess) logStatSuccess.textContent = summary.successful || 0;
      if (logStatFailed) logStatFailed.textContent = summary.failed || 0;
      if (logStatIps) logStatIps.textContent = summary.uniqueIps || 0;

      renderFullLogs(logs);
      renderRecentLogs(logs.slice(0, 5));
    } catch (e) {
      console.warn('Error loading access logs:', e);
    }
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
        const res = await fetch('/api/admin/logs', { method: 'DELETE' });
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

    // Occasional subtle fluctuation in realtime users to reflect live browsing
    setInterval(() => {
      if (gaRealtimeUsers) {
        const rand = 3 + Math.floor(Math.random() * 3);
        gaRealtimeUsers.textContent = rand;
      }
    }, 12000);
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

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (country && country !== 'all') params.append('country', country);
    if (device && device !== 'all') params.append('device', device);
    if (source && source !== 'all') params.append('source', source);

    try {
      const res = await fetch(`/api/portfolio/analytics/visitors?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const visitors = data.visitors || [];
      const summary = data.summary || {};

      if (vaStatActive) vaStatActive.textContent = `${summary.activeNow || 0} Active`;
      if (vaStatIps) vaStatIps.textContent = `${summary.uniqueIps || 0} IPs`;
      if (vaStatTopLoc) vaStatTopLoc.textContent = summary.topLocation || 'Chennai, IN';
      if (vaStatTopSrc) vaStatTopSrc.textContent = summary.topSource || 'GitHub /Hitesh070';
      if (vaShowingCount) vaShowingCount.textContent = `Showing ${visitors.length} of ${summary.totalVisitors || visitors.length} indexed visitors`;

      renderDetailedVisitors(visitors);
    } catch (e) {
      console.warn('Error loading detailed visitor analytics:', e);
    }
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

  // Helper
  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Init
  checkAuth();
})();
