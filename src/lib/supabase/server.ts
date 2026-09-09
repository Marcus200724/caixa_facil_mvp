import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import type { Database } from "@/types/database"
import { lerEnvSupabase } from "./env"

/**
 * Client do Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Sempre crie um novo client por requisição — não reaproveite entre requisições,
 * pois ele carrega a sessão do usuário atual.
 */
export async function criarClienteServidor() {
  const { url, chave } = lerEnvSupabase()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, chave, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesParaDefinir) {
        try {
          for (const { name, value, options } of cookiesParaDefinir) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Chamado a partir de um Server Component, onde não é possível escrever
          // cookies. O proxy já se encarrega de renovar a sessão, então ignorar
          // aqui é seguro.
        }
      },
    },
  })
}
