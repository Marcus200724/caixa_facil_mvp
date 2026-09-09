import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/types/database"
import { lerEnvSupabase } from "./env"

/** Client do Supabase para uso em Client Components. */
export function criarClienteBrowser() {
  const { url, chave } = lerEnvSupabase()
  return createBrowserClient<Database>(url, chave)
}
