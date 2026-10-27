// =========================================================================
// Admin Portal Configuration (Client-Side Public Settings)
// Note: Supabase Project URL, anon key, and Google OAuth Client ID are
// safe to expose in client source code. Service-role keys must NEVER appear here.
// =========================================================================

export const CONFIG = {
  // 1. Supabase Backend
  // Set your Supabase project URL and anon public key below.
  SUPABASE_URL: (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('admin_supabase_url')) || 'https://xyzcompany.supabase.co',
  SUPABASE_ANON_KEY: (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('admin_supabase_key')) || '',
  BUCKET: 'temp_vault',

  // 2. Fixed Admin Authentication
  ADMIN_EMAIL: 'hiteshvs616@gmail.com',

  // 3. Google OAuth & Analytics Integration
  GOOGLE_CLIENT_ID: '216288105966-av9qgm44ubfpg1l3374ldqg4m4uaif9u.apps.googleusercontent.com',
  GA_PROPERTY_ID: (typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('ga_property_id')) || '',
  GA_MEASUREMENT_ID: 'G-KVRYQ5NBK4' // Stream tag tracked on portfolio site
};

if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CONFIG };
}
