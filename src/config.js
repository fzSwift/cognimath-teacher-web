/* ============================================================
   CogniMath Teacher — config.js
   Same public Supabase project as the student app.
   The anon / publishable key is public by design; RLS + the
   role-protection trigger are the access wall.
   Never put the service_role / secret key here.
   ============================================================ */

export const SUPABASE_URL = "https://sjnrdkkfijlkkuslnwxy.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_yZ5eMLaiangefugmTqs5Lg_kKvBlnjZ";

/* Same Turnstile site key as cognimath-app/src/config.js. Secret stays
   in the Supabase dashboard (Authentication → Attack protection). */
export const TURNSTILE_SITE_KEY = "";
