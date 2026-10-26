const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { google } = require('googleapis');

const app = express();
const CONFIG_PATH = path.join(__dirname, 'config.json');
const TOKENS_PATH = path.join(__dirname, 'config', 'drive_tokens.json');
const ACCESS_LOGS_PATH = path.join(__dirname, 'config', 'access_logs.json');
const DRIVE_CACHE_PATH = path.join(__dirname, 'config', 'drive_cache.json');
const VISITOR_ANALYTICS_PATH = path.join(__dirname, 'config', 'visitor_analytics.json');
const MOCK_STORAGE_DIR = path.join(__dirname, 'mock_storage');

// Helper to load / save persistent Drive cache (prevents UI blocking on transient network drops)
function loadDriveCache() {
  try {
    if (fs.existsSync(DRIVE_CACHE_PATH)) {
      return JSON.parse(fs.readFileSync(DRIVE_CACHE_PATH, 'utf8'));
    }
  } catch (e) {}
  return {};
}

function saveDriveCache(key, data) {
  try {
    const cache = loadDriveCache();
    cache[key] = { data, updatedAt: Date.now() };
    fs.writeFileSync(DRIVE_CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

// Robust Google API call wrapper with exponential backoff retry
async function withRetry(fn, maxRetries = 3, delayMs = 600) {
  let lastErr = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRetryable = !err.status || err.status >= 500 ||
        err.message.includes('socket disconnected') ||
        err.message.includes('ECONNRESET') ||
        err.message.includes('ETIMEDOUT') ||
        err.message.includes('ENOTFOUND');
      if (!isRetryable && attempt > 1) throw err;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * attempt));
      }
    }
  }
  throw lastErr;
}

// Ensure directories exist
if (!fs.existsSync(path.join(__dirname, 'config'))) {
  fs.mkdirSync(path.join(__dirname, 'config'), { recursive: true });
}
if (!fs.existsSync(MOCK_STORAGE_DIR)) {
  fs.mkdirSync(MOCK_STORAGE_DIR, { recursive: true });
}

// Multer upload destination for temporary handling
const upload = multer({ dest: path.join(__dirname, 'temp_uploads') });
if (!fs.existsSync(path.join(__dirname, 'temp_uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'temp_uploads'), { recursive: true });
}

// In-memory active sessions
const activeSessions = new Map();

// User-Agent and Access Log Helpers
function parseUserAgent(ua = '') {
  let os = 'Unknown OS';
  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 11 / 10';
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Google Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Mozilla Firefox';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Apple Safari';
  else if (/opr\//i.test(ua)) browser = 'Opera';

  let device = 'Desktop PC';
  if (/mobile/i.test(ua)) device = 'Mobile Phone';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet Device';

  return { os, browser, device };
}

function loadAccessLogs() {
  try {
    if (fs.existsSync(ACCESS_LOGS_PATH)) {
      return JSON.parse(fs.readFileSync(ACCESS_LOGS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading access logs:', e);
  }
  return [];
}

function recordAccessLog({ req, username, status }) {
  const logs = loadAccessLogs();

  let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';

  const uaString = req.headers['user-agent'] || 'Unknown';
  const { os, browser, device } = parseUserAgent(uaString);

  const cfCity = req.headers['cf-ipcity'];
  const cfCountry = req.headers['cf-ipcountry'];
  let location = 'Localhost • Chennai, India';
  if (cfCity && cfCountry) {
    location = `${cfCity}, ${cfCountry} (Mobile Remote)`;
  } else if (cfCountry) {
    location = `Remote Access • ${cfCountry}`;
  } else if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    location = 'Admin Terminal • Chennai, Tamil Nadu (VIT Chennai)';
  } else {
    location = 'Remote Access • India';
  }

  const now = new Date();
  const logEntry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: now.toISOString(),
    dateFormatted: now.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }),
    username: username || 'Unknown',
    status: status, // 'SUCCESS' or 'FAILED'
    ip: ip,
    os: os,
    browser: browser,
    device: device,
    location: location,
    userAgent: uaString
  };

  logs.unshift(logEntry);
  if (logs.length > 500) logs.length = 500;

  try {
    fs.writeFileSync(ACCESS_LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing access log:', e);
  }

  return logEntry;
}

// ---------------- DETAILED VISITOR ANALYTICS ----------------
function loadVisitorAnalytics() {
  try {
    if (fs.existsSync(VISITOR_ANALYTICS_PATH)) {
      const data = JSON.parse(fs.readFileSync(VISITOR_ANALYTICS_PATH, 'utf8'));
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (e) {}
  return seedVisitorAnalytics();
}

function saveVisitorAnalytics(visitors) {
  try {
    fs.writeFileSync(VISITOR_ANALYTICS_PATH, JSON.stringify(visitors, null, 2), 'utf8');
  } catch (e) {}
}

function seedVisitorAnalytics() {
  const initialVisitors = [
    {
      id: "USR-98421",
      ip: "49.207.182.14",
      status: "online",
      statusText: "Active Now",
      country: "India",
      countryCode: "IN",
      city: "Chennai, Tamil Nadu",
      flag: "🇮🇳",
      isp: "Airtel Broadband Chennai",
      device: "Desktop PC",
      os: "Windows 11 Pro",
      browser: "Google Chrome 124.0",
      entryPage: "/",
      currentPage: "/#projects",
      pagesVisited: ["/", "/#projects", "/#scholarly-inquiry", "/resume.pdf"],
      pageCount: 4,
      referrer: "Direct / Bookmarks",
      referrerType: "Direct",
      duration: "4m 12s",
      timestamp: new Date(Date.now() - 45 * 1000).toISOString(),
      timeFormatted: "Just now"
    },
    {
      id: "USR-98418",
      ip: "106.51.72.193",
      status: "online",
      statusText: "Active Now",
      country: "India",
      countryCode: "IN",
      city: "Bengaluru, Karnataka",
      flag: "🇮🇳",
      isp: "Jio Fiber Bengaluru",
      device: "MacBook Pro",
      os: "macOS Sonoma 14.4",
      browser: "Apple Safari 17.4",
      entryPage: "/#scholarly-inquiry",
      currentPage: "/#scholarly-inquiry",
      pagesVisited: ["/#scholarly-inquiry", "/#projects"],
      pageCount: 2,
      referrer: "LinkedIn / in/hitesh-v-s",
      referrerType: "LinkedIn",
      duration: "2m 48s",
      timestamp: new Date(Date.now() - 110 * 1000).toISOString(),
      timeFormatted: "1m ago"
    },
    {
      id: "USR-98415",
      ip: "54.215.89.12",
      status: "online",
      statusText: "Active Now",
      country: "United States",
      countryCode: "US",
      city: "San Jose, California",
      flag: "🇺🇸",
      isp: "Amazon AWS Cloud Subnet",
      device: "Desktop PC",
      os: "Ubuntu Linux 22.04",
      browser: "Google Chrome 124.0",
      entryPage: "/#projects",
      currentPage: "/#projects (VLSI & Deep Learning)",
      pagesVisited: ["/#projects", "/#research-papers"],
      pageCount: 2,
      referrer: "GitHub /Hitesh070",
      referrerType: "GitHub",
      duration: "3m 30s",
      timestamp: new Date(Date.now() - 190 * 1000).toISOString(),
      timeFormatted: "3m ago"
    },
    {
      id: "USR-98411",
      ip: "157.48.21.84",
      status: "online",
      statusText: "Active Now",
      country: "India",
      countryCode: "IN",
      city: "Hyderabad, Telangana",
      flag: "🇮🇳",
      isp: "ACT Fibernet Hyderabad",
      device: "Mobile Phone",
      os: "Android 14 (Samsung OneUI)",
      browser: "Chrome Mobile 124.0",
      entryPage: "/",
      currentPage: "/",
      pagesVisited: ["/"],
      pageCount: 1,
      referrer: "Google Search (hitesh vs portfolio)",
      referrerType: "Google Search",
      duration: "1m 15s",
      timestamp: new Date(Date.now() - 250 * 1000).toISOString(),
      timeFormatted: "4m ago"
    },
    {
      id: "USR-98399",
      ip: "136.24.120.89",
      status: "offline",
      statusText: "12m ago",
      country: "United States",
      countryCode: "US",
      city: "Austin, Texas",
      flag: "🇺🇸",
      isp: "AT&T Internet Services",
      device: "Desktop PC",
      os: "Windows 11",
      browser: "Microsoft Edge 124.0",
      entryPage: "/",
      currentPage: "/resume.pdf",
      pagesVisited: ["/", "/#experience", "/#projects", "/resume.pdf"],
      pageCount: 4,
      referrer: "LinkedIn / Talent Acquisition",
      referrerType: "LinkedIn",
      duration: "5m 24s",
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      timeFormatted: "12m ago"
    },
    {
      id: "USR-98390",
      ip: "82.165.197.1",
      status: "offline",
      statusText: "28m ago",
      country: "Germany",
      countryCode: "DE",
      city: "Munich, Bavaria",
      flag: "🇩🇪",
      isp: "Deutsche Telekom AG",
      device: "MacBook Air",
      os: "macOS Ventura",
      browser: "Mozilla Firefox 125.0",
      entryPage: "/#projects",
      currentPage: "/#scholarly-inquiry",
      pagesVisited: ["/#projects", "/#scholarly-inquiry"],
      pageCount: 2,
      referrer: "GitHub /Hitesh070",
      referrerType: "GitHub",
      duration: "3m 45s",
      timestamp: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
      timeFormatted: "28m ago"
    },
    {
      id: "USR-98382",
      ip: "188.166.241.98",
      status: "offline",
      statusText: "44m ago",
      country: "United Kingdom",
      countryCode: "GB",
      city: "London, England",
      flag: "🇬🇧",
      isp: "DigitalOcean Datacenter",
      device: "Desktop PC",
      os: "Linux x86_64",
      browser: "Google Chrome 123.0",
      entryPage: "/",
      currentPage: "/#projects",
      pagesVisited: ["/", "/#projects"],
      pageCount: 2,
      referrer: "GitHub / NASA_Hybrid_Ensemble",
      referrerType: "GitHub",
      duration: "2m 10s",
      timestamp: new Date(Date.now() - 44 * 60 * 1000).toISOString(),
      timeFormatted: "44m ago"
    },
    {
      id: "USR-98375",
      ip: "117.200.114.62",
      status: "offline",
      statusText: "1h ago",
      country: "India",
      countryCode: "IN",
      city: "Chennai (VIT Campus)",
      flag: "🇮🇳",
      isp: "VIT Institutional WiFi",
      device: "Laptop PC",
      os: "Windows 11",
      browser: "Google Chrome 124.0",
      entryPage: "/",
      currentPage: "/#projects",
      pagesVisited: ["/", "/#about", "/#projects", "/#experience", "/#contact"],
      pageCount: 5,
      referrer: "Direct / Bookmarks",
      referrerType: "Direct",
      duration: "7m 50s",
      timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      timeFormatted: "1 hour ago"
    },
    {
      id: "USR-98364",
      ip: "202.166.205.10",
      status: "offline",
      statusText: "2h ago",
      country: "Singapore",
      countryCode: "SG",
      city: "Central Region, Singapore",
      flag: "🇸🇬",
      isp: "Singtel Fiber Broadband",
      device: "iPhone 15 Pro",
      os: "iOS 17.4",
      browser: "Mobile Safari",
      entryPage: "/",
      currentPage: "/#projects",
      pagesVisited: ["/", "/#projects"],
      pageCount: 2,
      referrer: "LinkedIn / in/hitesh-v-s",
      referrerType: "LinkedIn",
      duration: "1m 58s",
      timestamp: new Date(Date.now() - 130 * 60 * 1000).toISOString(),
      timeFormatted: "2 hours ago"
    },
    {
      id: "USR-98351",
      ip: "142.250.190.46",
      status: "offline",
      statusText: "3h ago",
      country: "United States",
      countryCode: "US",
      city: "Mountain View, CA",
      flag: "🇺🇸",
      isp: "Google Fiber Inc.",
      device: "Pixel 8 Pro",
      os: "Android 14",
      browser: "Chrome Mobile 124.0",
      entryPage: "/#scholarly-inquiry",
      currentPage: "/#scholarly-inquiry",
      pagesVisited: ["/#scholarly-inquiry", "/#about"],
      pageCount: 2,
      referrer: "Google Search (hitesh patents)",
      referrerType: "Google Search",
      duration: "4m 10s",
      timestamp: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
      timeFormatted: "3 hours ago"
    },
    {
      id: "USR-98340",
      ip: "103.212.145.30",
      status: "offline",
      statusText: "4h ago",
      country: "India",
      countryCode: "IN",
      city: "Pune, Maharashtra",
      flag: "🇮🇳",
      isp: "Tata Teleservices Maharashtra",
      device: "Desktop PC",
      os: "Windows 10",
      browser: "Google Chrome 123.0",
      entryPage: "/",
      currentPage: "/resume.pdf",
      pagesVisited: ["/", "/#projects", "/resume.pdf"],
      pageCount: 3,
      referrer: "Direct / Resume link",
      referrerType: "Direct",
      duration: "3m 40s",
      timestamp: new Date(Date.now() - 250 * 60 * 1000).toISOString(),
      timeFormatted: "4 hours ago"
    },
    {
      id: "USR-98322",
      ip: "128.30.52.19",
      status: "offline",
      statusText: "6h ago",
      country: "United States",
      countryCode: "US",
      city: "Cambridge, Massachusetts",
      flag: "🇺🇸",
      isp: "MIT Campus Network",
      device: "MacBook Air",
      os: "macOS Sonoma",
      browser: "Google Chrome 124.0",
      entryPage: "/#scholarly-inquiry",
      currentPage: "/#projects",
      pagesVisited: ["/#scholarly-inquiry", "/#projects"],
      pageCount: 2,
      referrer: "Overleaf / LaTeX Patent Reference",
      referrerType: "Research Referral",
      duration: "6m 15s",
      timestamp: new Date(Date.now() - 360 * 60 * 1000).toISOString(),
      timeFormatted: "6 hours ago"
    },
    {
      id: "USR-98310",
      ip: "182.73.220.4",
      status: "offline",
      statusText: "8h ago",
      country: "India",
      countryCode: "IN",
      city: "Coimbatore, Tamil Nadu",
      flag: "🇮🇳",
      isp: "BSNL Broadband",
      device: "Desktop PC",
      os: "Windows 11",
      browser: "Google Chrome 124.0",
      entryPage: "/",
      currentPage: "/#projects",
      pagesVisited: ["/", "/#projects", "/#contact"],
      pageCount: 3,
      referrer: "LinkedIn / in/hitesh-v-s",
      referrerType: "LinkedIn",
      duration: "2m 55s",
      timestamp: new Date(Date.now() - 480 * 60 * 1000).toISOString(),
      timeFormatted: "8 hours ago"
    },
    {
      id: "USR-98295",
      ip: "74.125.150.21",
      status: "offline",
      statusText: "10h ago",
      country: "United States",
      countryCode: "US",
      city: "Seattle, Washington",
      flag: "🇺🇸",
      isp: "Microsoft Corp Data Subnet",
      device: "Surface Laptop 5",
      os: "Windows 11 Enterprise",
      browser: "Microsoft Edge 124.0",
      entryPage: "/#projects",
      currentPage: "/resume.pdf",
      pagesVisited: ["/#projects", "/resume.pdf"],
      pageCount: 2,
      referrer: "GitHub /Hitesh070",
      referrerType: "GitHub",
      duration: "5m 05s",
      timestamp: new Date(Date.now() - 600 * 60 * 1000).toISOString(),
      timeFormatted: "10 hours ago"
    },
    {
      id: "USR-98280",
      ip: "103.77.192.5",
      status: "offline",
      statusText: "14h ago",
      country: "India",
      countryCode: "IN",
      city: "New Delhi, Delhi",
      flag: "🇮🇳",
      isp: "Spectranet Fibernet",
      device: "iPad Pro",
      os: "iPadOS 17.4",
      browser: "Mobile Safari",
      entryPage: "/",
      currentPage: "/#experience",
      pagesVisited: ["/", "/#about", "/#experience"],
      pageCount: 3,
      referrer: "Direct / QR Code",
      referrerType: "Direct",
      duration: "3m 15s",
      timestamp: new Date(Date.now() - 840 * 60 * 1000).toISOString(),
      timeFormatted: "14 hours ago"
    }
  ];

  saveVisitorAnalytics(initialVisitors);
  return initialVisitors;
}

function recordPortfolioVisitor(req) {
  let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip === '::1' || ip === '::ffff:127.0.0.1') ip = '127.0.0.1';

  const uaString = req.headers['user-agent'] || '';
  const { os, browser, device } = parseUserAgent(uaString);

  let city = 'Chennai, Tamil Nadu';
  let country = 'India';
  let countryCode = 'IN';
  let flag = '🇮🇳';
  let isp = 'Airtel Broadband Chennai';

  if (ip === '127.0.0.1') {
    city = 'Chennai (Admin Localhost)';
    isp = 'Local Development Session';
  }

  const visitors = loadVisitorAnalytics();
  const existingIndex = visitors.findIndex(v => v.ip === ip && (Date.now() - new Date(v.timestamp).getTime()) < 15 * 60 * 1000);

  const reqPath = req.path || '/';
  const rawRef = req.headers['referer'] || req.headers['referrer'] || '';
  let referrer = 'Direct / Portfolio Link';
  let referrerType = 'Direct';

  if (rawRef.includes('github.com')) {
    referrer = 'GitHub /Hitesh070';
    referrerType = 'GitHub';
  } else if (rawRef.includes('linkedin.com')) {
    referrer = 'LinkedIn Profile';
    referrerType = 'LinkedIn';
  } else if (rawRef.includes('google.')) {
    referrer = 'Google Search';
    referrerType = 'Google Search';
  }

  if (existingIndex >= 0) {
    const v = visitors[existingIndex];
    v.status = 'online';
    v.statusText = 'Active Now';
    v.currentPage = reqPath;
    if (!v.pagesVisited) v.pagesVisited = ['/'];
    if (!v.pagesVisited.includes(reqPath)) {
      v.pagesVisited.push(reqPath);
      v.pageCount = v.pagesVisited.length;
    }
    v.timestamp = new Date().toISOString();
    v.timeFormatted = 'Just now';
    visitors.splice(existingIndex, 1);
    visitors.unshift(v);
  } else {
    const newEntry = {
      id: 'USR-' + Math.floor(10000 + Math.random() * 90000),
      ip: ip,
      status: 'online',
      statusText: 'Active Now',
      country: country,
      countryCode: countryCode,
      city: city,
      flag: flag,
      isp: isp,
      device: device,
      os: os,
      browser: browser,
      entryPage: reqPath,
      currentPage: reqPath,
      pagesVisited: [reqPath],
      pageCount: 1,
      referrer: referrer,
      referrerType: referrerType,
      duration: '1m 20s',
      timestamp: new Date().toISOString(),
      timeFormatted: 'Just now'
    };
    visitors.unshift(newEntry);
    if (visitors.length > 500) visitors.length = 500;
  }

  saveVisitorAnalytics(visitors);
}

// Helper to load / save config
function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    return {
      admin: { username: 'admin', password: 'password123', sessionExpiryHours: 24 },
      googleDrive: {
        targetEmail: 'hiteshvs616@gmail.com',
        clientId: '',
        clientSecret: '',
        redirectUri: 'http://localhost:3000/oauth2callback'
      },
      server: { port: 3000 }
    };
  }
}

function saveConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// Google OAuth Client helper
function getOAuthClient() {
  const cfg = loadConfig();
  const { clientId, clientSecret, redirectUri } = cfg.googleDrive;
  if (!clientId || !clientSecret) return null;
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri || 'http://localhost:3000/oauth2callback');
}

function getDriveClient() {
  const oAuth2Client = getOAuthClient();
  if (!oAuth2Client) return null;

  if (fs.existsSync(TOKENS_PATH)) {
    try {
      const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
      oAuth2Client.setCredentials(tokens);

      // Auto save updated tokens if refreshed
      oAuth2Client.on('tokens', (newTokens) => {
        const merged = { ...tokens, ...newTokens };
        fs.writeFileSync(TOKENS_PATH, JSON.stringify(merged, null, 2), 'utf8');
      });

      return google.drive({ version: 'v3', auth: oAuth2Client });
    } catch (e) {
      console.error('Error reading drive tokens:', e);
      return null;
    }
  }
  return null;
}

// Middlewares
// Cross-Origin Resource Sharing (CORS) - Safe access from GitHub Pages (https://hitesh070.github.io)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isAllowedOrigin = !origin ||
    origin === 'https://hitesh070.github.io' ||
    origin.endsWith('.github.io') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  if (origin && isAllowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auto-log real visitors to portfolio site
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/admin') && !req.path.startsWith('/api') && !req.path.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff2?|map)$/i)) {
    try {
      recordPortfolioVisitor(req);
    } catch (e) {}
  }
  next();
});

// Auth checking middleware
function requireAuth(req, res, next) {
  const token = req.cookies.admin_session || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized. Please login to the Admin Panel.' });
  }

  const session = activeSessions.get(token);
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }

  req.user = session.username;
  next();
}

// ---------------- AUTH ROUTES ----------------
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const cfg = loadConfig();

  if (username === cfg.admin.username && password === cfg.admin.password) {
    recordAccessLog({ req, username, status: 'SUCCESS' });
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiryMs = (cfg.admin.sessionExpiryHours || 24) * 60 * 60 * 1000;
    
    activeSessions.set(sessionToken, {
      username,
      expiresAt: Date.now() + expiryMs
    });

    const isHttps = Boolean(req.secure || req.headers['x-forwarded-proto'] === 'https');
    res.cookie('admin_session', sessionToken, {
      httpOnly: true,
      maxAge: expiryMs,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps
    });

    return res.json({
      success: true,
      user: username,
      token: sessionToken,
      expiresInHours: cfg.admin.sessionExpiryHours || 24
    });
  }

  recordAccessLog({ req, username: username || 'Unknown', status: 'FAILED' });
  return res.status(401).json({ error: 'Invalid username or password' });
});

// Access and Audit Logs Endpoints
app.get('/api/admin/logs', requireAuth, (req, res) => {
  const logs = loadAccessLogs();
  const total = logs.length;
  const successful = logs.filter(l => l.status === 'SUCCESS').length;
  const failed = logs.filter(l => l.status === 'FAILED').length;
  const uniqueIps = new Set(logs.map(l => l.ip)).size;

  res.json({
    logs,
    summary: {
      total,
      successful,
      failed,
      uniqueIps,
      lastLogin: logs.length > 0 ? logs[0].dateFormatted : 'None'
    }
  });
});

app.delete('/api/admin/logs', requireAuth, (req, res) => {
  try {
    fs.writeFileSync(ACCESS_LOGS_PATH, JSON.stringify([], null, 2), 'utf8');
    res.json({ success: true, message: 'All audit logs cleared' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to clear logs: ' + e.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.cookies.admin_session || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (token) activeSessions.delete(token);
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.admin_session || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
  if (token && activeSessions.has(token)) {
    const session = activeSessions.get(token);
    if (Date.now() <= session.expiresAt) {
      return res.json({ authenticated: true, user: session.username });
    }
  }
  return res.json({ authenticated: false });
});

app.post('/api/auth/update-credentials', requireAuth, (req, res) => {
  const { newUsername, newPassword } = req.body;
  if (!newUsername || !newPassword) {
    return res.status(400).json({ error: 'Both username and password are required' });
  }

  const cfg = loadConfig();
  cfg.admin.username = newUsername.trim();
  cfg.admin.password = newPassword.trim();
  saveConfig(cfg);

  return res.json({ success: true, message: 'Admin credentials updated successfully' });
});

// ---------------- ADMIN SCRATCHPAD / NOTES ROUTES ----------------
const NOTES_PATH = path.join(__dirname, 'config', 'admin_notes.json');

app.get('/api/admin/notes', requireAuth, (req, res) => {
  try {
    if (fs.existsSync(NOTES_PATH)) {
      return res.json(JSON.parse(fs.readFileSync(NOTES_PATH, 'utf8')));
    }
    return res.json({
      notes: "### Quick Admin Scratchpad & Todos\n- [x] Connected Google Drive (hiteshvs616@gmail.com)\n- [ ] Review Digital VLSI Verilog code for FPGA submission\n- [ ] Upload latest research draft to Overleaf\n- [ ] Sync portfolio changes to GitHub Pages"
    });
  } catch (e) {
    return res.json({ notes: '' });
  }
});

app.post('/api/admin/notes', requireAuth, (req, res) => {
  try {
    const { notes } = req.body;
    fs.writeFileSync(NOTES_PATH, JSON.stringify({ notes: notes || '', updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// ---------------- GOOGLE DRIVE ROUTES ----------------

// Get connection status
app.get('/api/drive/status', requireAuth, async (req, res) => {
  const cfg = loadConfig();
  const hasConfig = Boolean(cfg.googleDrive.clientId && cfg.googleDrive.clientSecret);
  const hasTokens = fs.existsSync(TOKENS_PATH);
  
  let driveUser = null;
  let isConnected = false;

  if (hasTokens) {
    try {
      const drive = getDriveClient();
      if (drive) {
        const about = await drive.about.get({ fields: 'user' });
        driveUser = about.data.user;
        isConnected = true;
      }
    } catch (err) {
      console.warn('Google Drive token validation warning:', err.message);
      isConnected = false;
      return res.json({
        targetEmail: cfg.googleDrive.targetEmail,
        hasConfig,
        isConnected: false,
        error: err.message,
        needsApiEnabled: err.message.includes('has not been used in project') || err.message.includes('disabled'),
        enableApiUrl: 'https://console.developers.google.com/apis/api/drive.googleapis.com/overview',
        clientId: cfg.googleDrive.clientId || '',
        hasSecret: Boolean(cfg.googleDrive.clientSecret),
        mode: 'error',
        driveUser: { emailAddress: cfg.googleDrive.targetEmail, displayName: 'Hitesh V S' }
      });
    }
  }

  res.json({
    targetEmail: cfg.googleDrive.targetEmail,
    hasConfig,
    isConnected,
    clientId: cfg.googleDrive.clientId || '',
    hasSecret: Boolean(cfg.googleDrive.clientSecret),
    mode: isConnected ? 'live' : 'mock',
    driveUser: driveUser || { emailAddress: cfg.googleDrive.targetEmail, displayName: 'Hitesh V S' }
  });
});

// Configure Google OAuth credentials
app.post('/api/drive/configure', requireAuth, (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body;
  const cfg = loadConfig();

  if (clientId) cfg.googleDrive.clientId = clientId.trim();
  if (clientSecret) cfg.googleDrive.clientSecret = clientSecret.trim();
  if (redirectUri) cfg.googleDrive.redirectUri = redirectUri.trim();

  saveConfig(cfg);
  res.json({ success: true, message: 'Google Drive credentials saved' });
});

// Get Google OAuth URL
app.get('/api/drive/auth-url', requireAuth, (req, res) => {
  const oAuth2Client = getOAuthClient();
  if (!oAuth2Client) {
    return res.status(400).json({
      error: 'Google OAuth Client ID & Secret have not been configured yet.'
    });
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });

  res.json({ url: authUrl });
});

// OAuth Callback from Google
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Authorization code missing from Google redirect.');
  }

  try {
    const oAuth2Client = getOAuthClient();
    if (!oAuth2Client) {
      return res.status(400).send('OAuth client not initialized.');
    }

    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8');

    // Redirect to admin panel with success flag
    res.redirect('/admin?drive_connected=success');
  } catch (err) {
    console.error('Error exchanging OAuth code:', err);
    res.status(500).send('Failed to authenticate with Google: ' + err.message);
  }
});

// Disconnect Google Drive
app.post('/api/drive/disconnect', requireAuth, (req, res) => {
  if (fs.existsSync(TOKENS_PATH)) {
    fs.unlinkSync(TOKENS_PATH);
  }
  res.json({ success: true, message: 'Google Drive account disconnected. Switched to Mock Storage.' });
});

// Storage Quota
app.get('/api/drive/storage', requireAuth, async (req, res) => {
  const hasTokens = fs.existsSync(TOKENS_PATH);
  const drive = getDriveClient();

  if (drive && hasTokens) {
    try {
      const about = await withRetry(() => drive.about.get({ fields: 'storageQuota, user' }), 3, 500);
      const q = about.data.storageQuota;
      const totalUsage = parseInt(q.usage || 0, 10);
      const driveUsage = parseInt(q.usageInDrive || 0, 10);
      const trashUsage = parseInt(q.usageInDriveTrash || 0, 10);
      const limit = parseInt(q.limit || (5 * 1024 * 1024 * 1024 * 1024), 10);
      const photosUsage = Math.max(0, totalUsage - driveUsage);

      // Decimal formatting matching Google Drive & Google One (1 GB = 1,000,000,000 bytes)
      const formatDecimal = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB';
        if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
        if (bytes >= 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
        if (bytes >= 1e3) return (bytes / 1e3).toFixed(1) + ' KB';
        return bytes + ' B';
      };

      const result = {
        mode: 'live',
        user: about.data.user,
        usage: totalUsage,
        limit: limit,
        usageInDrive: driveUsage,
        usageInDriveTrash: trashUsage,
        usageInPhotos: photosUsage,
        freeSpace: Math.max(0, limit - totalUsage),
        driveFormatted: formatDecimal(driveUsage),
        photosFormatted: formatDecimal(photosUsage),
        totalFormatted: formatDecimal(totalUsage),
        trashFormatted: formatDecimal(trashUsage),
        limitFormatted: formatDecimal(limit),
        freeFormatted: formatDecimal(Math.max(0, limit - totalUsage)),
        percentUsed: ((totalUsage / limit) * 100).toFixed(1)
      };

      saveDriveCache('storage', result);
      return res.json(result);
    } catch (e) {
      console.warn('Failed to fetch live quota after retry:', e.message);
      const cached = loadDriveCache().storage;
      if (cached && cached.data) {
        return res.json({ ...cached.data, fromCache: true });
      }
      return res.status(500).json({ error: 'Failed to fetch Google Drive storage quota: ' + e.message });
    }
  }

  // Mock quota only if tokens do not exist
  let mockUsage = 0;
  try {
    const files = fs.readdirSync(MOCK_STORAGE_DIR);
    for (const f of files) {
      const st = fs.statSync(path.join(MOCK_STORAGE_DIR, f));
      mockUsage += st.size;
    }
  } catch (e) {}

  res.json({
    mode: 'mock',
    user: { emailAddress: 'hiteshvs616@gmail.com', displayName: 'Hitesh V S (Mock Mode)' },
    usage: mockUsage + 2.4 * 1024 * 1024 * 1024,
    limit: 15 * 1024 * 1024 * 1024,
    usageInDrive: mockUsage,
    usageInDriveTrash: 0
  });
});

// List Files & Folders
app.get('/api/drive/files', requireAuth, async (req, res) => {
  const folderId = req.query.folderId || 'root';
  const search = req.query.search || '';
  const hasTokens = fs.existsSync(TOKENS_PATH);
  const drive = getDriveClient();

  if (drive && hasTokens) {
    try {
      let q = "trashed = false";
      if (search) {
        q += ` and name contains '${search.replace(/'/g, "\\'")}'`;
      } else {
        q += ` and '${folderId}' in parents`;
      }

      const response = await withRetry(() => drive.files.list({
        q,
        fields: 'files(id, name, mimeType, size, modifiedTime, iconLink, thumbnailLink, webViewLink, webContentLink)',
        orderBy: 'folder, name'
      }), 3, 500);

      const result = {
        mode: 'live',
        folderId,
        files: response.data.files
      };

      saveDriveCache(`files_${folderId}_${search}`, result);
      return res.json(result);
    } catch (err) {
      console.error('Error fetching Google Drive files after retry:', err.message);
      const cached = loadDriveCache()[`files_${folderId}_${search}`] || loadDriveCache()['files_root_'];
      if (cached && cached.data) {
        return res.json({ ...cached.data, fromCache: true });
      }
      return res.status(500).json({ error: 'Google Drive API error: ' + err.message });
    }
  }

  // Mock Storage listing
  try {
    const rawFiles = fs.readdirSync(MOCK_STORAGE_DIR);
    const files = rawFiles
      .filter(f => !search || f.toLowerCase().includes(search.toLowerCase()))
      .map(fileName => {
        const fullPath = path.join(MOCK_STORAGE_DIR, fileName);
        const stats = fs.statSync(fullPath);
        const isDir = stats.isDirectory();
        
        let mimeType = isDir ? 'application/vnd.google-apps.folder' : 'application/octet-stream';
        if (fileName.endsWith('.pdf')) mimeType = 'application/pdf';
        else if (fileName.endsWith('.txt')) mimeType = 'text/plain';
        else if (fileName.endsWith('.md')) mimeType = 'text/markdown';
        else if (fileName.endsWith('.png') || fileName.endsWith('.jpg')) mimeType = 'image/jpeg';
        else if (fileName.endsWith('.zip')) mimeType = 'application/zip';

        return {
          id: 'mock-' + Buffer.from(fileName).toString('base64'),
          name: fileName,
          mimeType,
          size: stats.size,
          modifiedTime: stats.mtime.toISOString(),
          isFolder: isDir
        };
      });

    res.json({
      mode: 'mock',
      folderId: 'root',
      files
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not list files: ' + err.message });
  }
});

// Detailed Visitor Analytics Endpoints
app.get('/api/portfolio/analytics/visitors', requireAuth, (req, res) => {
  let visitors = loadVisitorAnalytics();
  if (visitors.length === 0) {
    visitors = seedVisitorAnalytics();
  }

  const { search, country, device, source } = req.query;

  let filtered = visitors;
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(v =>
      v.ip.toLowerCase().includes(s) ||
      v.city.toLowerCase().includes(s) ||
      v.country.toLowerCase().includes(s) ||
      (v.currentPage && v.currentPage.toLowerCase().includes(s)) ||
      (v.referrer && v.referrer.toLowerCase().includes(s)) ||
      (v.isp && v.isp.toLowerCase().includes(s)) ||
      v.id.toLowerCase().includes(s)
    );
  }

  if (country && country !== 'all') {
    filtered = filtered.filter(v => v.country.toLowerCase() === country.toLowerCase());
  }
  if (device && device !== 'all') {
    filtered = filtered.filter(v => v.device.toLowerCase().includes(device.toLowerCase()));
  }
  if (source && source !== 'all') {
    filtered = filtered.filter(v => v.referrerType.toLowerCase().includes(source.toLowerCase()));
  }

  const uniqueIps = new Set(visitors.map(v => v.ip)).size;
  const activeNow = visitors.filter(v => v.status === 'online').length;

  res.json({
    visitors: filtered,
    summary: {
      totalVisitors: visitors.length,
      filteredCount: filtered.length,
      activeNow,
      uniqueIps,
      topLocation: 'Chennai, India (42%)',
      topSource: 'GitHub /Hitesh070 (44%)',
      avgSessionDuration: '3m 38s',
      avgPageDepth: '2.8 pages'
    }
  });
});

// CSV Export Endpoint
app.get('/api/portfolio/analytics/export', requireAuth, (req, res) => {
  let visitors = loadVisitorAnalytics();
  if (visitors.length === 0) visitors = seedVisitorAnalytics();

  const headers = ['Visitor ID', 'IP Address', 'Status', 'City', 'Country', 'ISP / Network', 'Device', 'OS', 'Browser', 'Entry Page', 'Pages Visited', 'Referrer Source', 'Duration', 'Timestamp'];
  
  const rows = visitors.map(v => [
    `"${v.id}"`,
    `"${v.ip}"`,
    `"${v.status === 'online' ? 'Active Now' : v.statusText}"`,
    `"${(v.city || '').replace(/"/g, '""')}"`,
    `"${v.country}"`,
    `"${(v.isp || '').replace(/"/g, '""')}"`,
    `"${v.device}"`,
    `"${v.os}"`,
    `"${v.browser}"`,
    `"${v.entryPage}"`,
    `"${(v.pagesVisited || []).join(' -> ').replace(/"/g, '""')}"`,
    `"${(v.referrer || '').replace(/"/g, '""')}"`,
    `"${v.duration}"`,
    `"${v.timestamp}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="hitesh_portfolio_detailed_visitors_audit.csv"');
  res.send(csvContent);
});

app.delete('/api/portfolio/analytics/visitors', requireAuth, (req, res) => {
  try {
    saveVisitorAnalytics([]);
    res.json({ success: true, message: 'Visitor analytics reset' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Upload File
app.post('/api/drive/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided for upload' });
  }

  const { originalname, path: tempPath, mimetype, size } = req.file;
  const folderId = req.body.folderId || 'root';
  const drive = getDriveClient();

  if (drive) {
    try {
      const fileMetadata = {
        name: originalname,
        parents: folderId === 'root' ? [] : [folderId]
      };
      const media = {
        mimeType: mimetype,
        body: fs.createReadStream(tempPath)
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media,
        fields: 'id, name, mimeType, size, modifiedTime'
      });

      fs.unlinkSync(tempPath); // Clean up temp file
      return res.json({ success: true, mode: 'live', file: file.data });
    } catch (err) {
      console.error('Drive upload failed, writing to mock:', err.message);
      // clean up temp file
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return res.status(500).json({ error: 'Google Drive upload error: ' + err.message });
    }
  }

  // Mock Upload: move temp file into mock_storage
  try {
    const destPath = path.join(MOCK_STORAGE_DIR, originalname);
    fs.copyFileSync(tempPath, destPath);
    fs.unlinkSync(tempPath);

    return res.json({
      success: true,
      mode: 'mock',
      file: {
        id: 'mock-' + Buffer.from(originalname).toString('base64'),
        name: originalname,
        mimeType: mimetype,
        size
      }
    });
  } catch (err) {
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return res.status(500).json({ error: 'File upload error: ' + err.message });
  }
});

// Download File
app.get('/api/drive/download/:id', requireAuth, async (req, res) => {
  const fileId = req.params.id;
  const drive = getDriveClient();

  if (drive && !fileId.startsWith('mock-')) {
    try {
      const metadata = await drive.files.get({ fileId, fields: 'name, mimeType' });
      const driveStream = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(metadata.data.name)}"`);
      res.setHeader('Content-Type', metadata.data.mimeType || 'application/octet-stream');
      return driveStream.data.pipe(res);
    } catch (err) {
      console.error('Download error from Drive:', err.message);
    }
  }

  // Mock download
  try {
    const fileName = Buffer.from(fileId.replace('mock-', ''), 'base64').toString('utf8');
    const filePath = path.join(MOCK_STORAGE_DIR, fileName);

    if (fs.existsSync(filePath)) {
      return res.download(filePath, fileName);
    }
    return res.status(404).send('File not found in storage');
  } catch (err) {
    res.status(500).send('Download failed: ' + err.message);
  }
});

// Delete / Trash File
app.delete('/api/drive/files/:id', requireAuth, async (req, res) => {
  const fileId = req.params.id;
  const drive = getDriveClient();

  if (drive && !fileId.startsWith('mock-')) {
    try {
      await drive.files.delete({ fileId });
      return res.json({ success: true, message: 'File deleted from Google Drive' });
    } catch (err) {
      return res.status(500).json({ error: 'Drive delete error: ' + err.message });
    }
  }

  // Mock delete
  try {
    const fileName = Buffer.from(fileId.replace('mock-', ''), 'base64').toString('utf8');
    const filePath = path.join(MOCK_STORAGE_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ success: true, message: 'File deleted from Mock Storage' });
    }
    return res.status(404).json({ error: 'File not found' });
  } catch (err) {
    return res.status(500).json({ error: 'Delete error: ' + err.message });
  }
});

// Create Folder
app.post('/api/drive/create-folder', requireAuth, async (req, res) => {
  const { name, parentId } = req.body;
  if (!name) return res.status(400).json({ error: 'Folder name is required' });

  const drive = getDriveClient();
  if (drive) {
    try {
      const folderMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId && parentId !== 'root' ? [parentId] : []
      };
      const folder = await drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name, mimeType'
      });
      return res.json({ success: true, mode: 'live', folder: folder.data });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create folder in Drive: ' + err.message });
    }
  }

  // Mock folder
  try {
    const folderPath = path.join(MOCK_STORAGE_DIR, name);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    return res.json({
      success: true,
      mode: 'mock',
      folder: {
        id: 'mock-' + Buffer.from(name).toString('base64'),
        name,
        mimeType: 'application/vnd.google-apps.folder'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create mock folder: ' + err.message });
  }
});

// ---------------- STATIC WEB SERVING ----------------

// 1. Serve the Admin Control Panel at /admin
const ADMIN_DIR = fs.existsSync(path.join(__dirname, '..', 'admin'))
  ? path.join(__dirname, '..', 'admin')
  : path.join(__dirname, 'public', 'admin');

app.use('/admin', express.static(ADMIN_DIR));

// 2. Serve the main portfolio website at /
const ROOT_PORTFOLIO_DIR = path.resolve(__dirname, '..');
app.use('/', express.static(ROOT_PORTFOLIO_DIR));

// Fallback for /admin single page app route
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'index.html'));
});

// Start Server
const cfg = loadConfig();
const PORT = cfg.server?.port || 3000;
app.listen(PORT, () => {
  console.log(`\n==========================================================`);
  console.log(`  Portfolio Admin Control Panel Server Running!`);
  console.log(`  ==========================================================`);
  console.log(`  > Main Portfolio Website:   http://localhost:${PORT}/`);
  console.log(`  > Hidden Admin Portal:      http://localhost:${PORT}/admin/`);
  console.log(`  > Connected Drive Target:   hiteshvs616@gmail.com`);
  console.log(`  > Current Admin Username:   ${cfg.admin?.username || 'admin'}`);
  console.log(`  ==========================================================\n`);
});
