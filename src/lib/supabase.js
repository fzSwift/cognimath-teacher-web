import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import { authStorageKey, cookieAuthStorage } from "./cookieAuth";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.startsWith("PASTE_")
);

const storageKey = authStorageKey(SUPABASE_URL);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        storageKey,
        storage: cookieAuthStorage({
          migrate: key => {
            try {
              const raw = localStorage.getItem(key);
              if (raw) localStorage.removeItem(key);
              return raw;
            } catch (e) {
              return null;
            }
          },
        }),
      },
    })
  : null;
