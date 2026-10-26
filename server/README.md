# Portfolio Admin Portal Backend Server

Node.js Express backend powering the hidden Admin Portal, Google Drive OAuth integration, security audit logs, and visitor intelligence analytics for Hitesh's Portfolio.

---

## Quick Setup

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Configure Credentials
Copy `config.example.json` to `config.json`:
```bash
cp config.example.json config.json
```

Edit `config.json` with your credentials:
* **Admin Login:** Set your desired `username` and `password`.
* **Google Drive OAuth:** Add your Google Cloud `clientId` and `clientSecret`.
* **Redirect URI:** Set `http://localhost:3000/oauth2callback`.

> **Note:** `config.json`, `drive_tokens.json`, and access logs are protected in `.gitignore` and will never be pushed to version control.

### 3. Start the Server
```bash
npm start
```

* **Main Portfolio:** `http://localhost:3000/`
* **Admin Portal:** `http://localhost:3000/admin/`

---

## Features
* **Google Drive Cloud Explorer:** Browse, open, upload, and organize Google Drive files with automatic TLS retry and local caching.
* **Storage Allocation Bar:** Displays accurate Google One breakdown across Google Drive, Google Photos, and free capacity.
* **Security & Access Audit Logs:** Tracks IP, OS, browser, device, timestamp, and status for login attempts.
* **Visitor Intelligence Analytics:** Real-time visitor tracking with IP address, geolocation, ISP, device, and page journey flow.
* **One-Click CSV Export:** Export detailed visitor audit logs for reporting.
