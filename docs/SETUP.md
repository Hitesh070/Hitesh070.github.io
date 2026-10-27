# Admin Portal & Supabase Setup Guide

This project is a static site hosted on GitHub Pages that interacts directly with **Supabase** (Auth, Storage, Postgres REST, and Realtime WebSocket) and **Google Cloud APIs** (Drive v3 REST API, Google Analytics Data & Admin APIs).

Follow these steps to set up and configure your backend:

---

## 1. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a free project (or sign into your existing project).
2. Navigate to **Project Settings > API**:
   - Copy your **Project URL** (e.g. `https://your-project.supabase.co`).
   - Copy your **`anon` public key** (`eyJhbGciOi...`).
3. Open `admin/config.js` and set:
   ```javascript
   export const CONFIG = {
     SUPABASE_URL: 'https://your-project.supabase.co',
     SUPABASE_ANON_KEY: 'your-anon-public-key',
     BUCKET: 'temp_vault',
     GOOGLE_CLIENT_ID: 'your-google-oauth-client-id.apps.googleusercontent.com',
     GA_PROPERTY_ID: '', // Optional numeric property ID
     GA_MEASUREMENT_ID: 'G-KVRYQ5NBK4',
     ADMIN_EMAIL: 'hiteshvs616@gmail.com'
   };
   ```

---

## 2. Execute SQL Database & Storage Schema

1. In your Supabase dashboard, click **SQL Editor** on the left navigation bar.
2. Click **New query**, paste the entire content of [`docs/supabase-setup.sql`](supabase-setup.sql), and click **Run**.
3. This creates:
   - Private storage bucket `temp_vault` with authenticated RLS policy `vault_all_auth`.
   - `public.admin_notes` and `public.admin_notes_history` with RLS.
   - `public.vault_files` metadata table for multi-device staging.
   - `public.audit_log` with IP geolocation telemetry.
   - `public.contact_submissions` with anonymous insertion policy for the main site contact form.
   - Realtime publication on `admin_notes` and `vault_files`.

---

## 3. Create Admin User in Supabase Auth

1. Go to **Authentication > Users** in the Supabase Dashboard.
2. Click **Add User** > **Create User**:
   - **Email:** `hiteshvs616@gmail.com` (or matching `CONFIG.ADMIN_EMAIL`).
   - **Password:** Choose a strong password.
   - **Auto-confirm User:** Check this box (or verify email).
3. Under **Authentication > URL Configuration**:
   - Set **Site URL** to `https://hitesh070.github.io` (and `http://localhost:3000` / `http://127.0.0.1:5500` for local dev).
   - Add redirect URLs: `https://hitesh070.github.io/**`.

---

## 4. Google Cloud OAuth Setup (Drive & Analytics)

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Enable:
   - **Google Drive API**
   - **Google Analytics Data API**
   - **Google Analytics Admin API**
3. In **APIs & Services > Credentials**:
   - Create an **OAuth 2.0 Client ID** (Web application).
   - Authorized JavaScript origins:
     - `https://hitesh070.github.io`
     - `http://localhost:3000` (optional)
   - Authorized redirect URIs:
     - `https://hitesh070.github.io/admin/`
     - `https://hitesh070.github.io/admin/index.html`
4. Put the Client ID in `admin/config.js` (`GOOGLE_CLIENT_ID`).

---

## 5. Security & Public PC Mode

- **Public / College Lab PC Mode:**
  When checking "Public / College Lab PC Mode" on the login screen:
  - Auth tokens are held strictly in `sessionStorage`.
  - IndexedDB caching and localStorage writes are disabled.
  - Logging out immediately wipes all session tokens, Drive tokens, and temporary files.
- **Service Role Keys:**
  Never put a `service_role` key in `admin/config.js` or any client-side file. All security is enforced server-side by Row Level Security (RLS) policies.
