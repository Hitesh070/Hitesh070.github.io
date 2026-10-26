// =========================================================================
// Admin Portal Configuration (Client-Side Public Settings)
// Note: Supabase Project URL, anon key, and Google OAuth Client ID are
// safe to expose in client source code. Service-role keys must NEVER appear here.
// =========================================================================

const ADMIN_CONFIG = {
  // 1. Supabase Backend
  // Set your Supabase project URL and anon public key below, or configure via Settings.
  SUPABASE_URL: window.localStorage.getItem('admin_supabase_url') || 'https://xyzcompany.supabase.co',
  SUPABASE_ANON_KEY: window.localStorage.getItem('admin_supabase_key') || '',
  BUCKET: 'temp_vault',

  // 2. Fixed Admin Authentication
  ADMIN_EMAIL: 'hiteshvs616@gmail.com',

  // 3. Google OAuth & Analytics Integration
  GOOGLE_CLIENT_ID: '216288105966-av9qgm44ubfpg1l3374ldqg4m4uaif9u.apps.googleusercontent.com',
  GA_PROPERTY_ID: window.localStorage.getItem('ga_property_id') || '', // Numeric GA4 property ID (e.g. '123456789')
  GA_MEASUREMENT_ID: 'G-KVRYQ5NBK4' // Stream tag tracked on portfolio site
};

if (typeof window !== 'undefined') {
  window.ADMIN_CONFIG = ADMIN_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ADMIN_CONFIG;
}
