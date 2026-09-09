/** Leitura centralizada e validada das variáveis de ambiente do Supabase. */
export function lerEnvSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url || !chave) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    )
  }

  return { url, chave }
}
