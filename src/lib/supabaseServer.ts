/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;

/**
 * Returns a lazy-initialized Supabase client.
 * Returns null if SUPABASE_URL or SUPABASE_ANON_KEY are missing from environment variables.
 * This guarantees the application starts up safely even without complete configuration.
 */
export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.warn(
        "[SUPABASE WARNING]: Las variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY no están configuradas."
      );
      return null;
    }

    try {
      supabaseClient = createClient(url, anonKey);
      console.log("[SUPABASE INFO]: Cliente de Supabase inicializado con éxito.");
    } catch (err) {
      console.error("[SUPABASE ERROR]: Fallo al inicializar el cliente de Supabase:", err);
      return null;
    }
  }
  return supabaseClient;
}
