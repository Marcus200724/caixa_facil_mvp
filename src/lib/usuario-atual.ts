import { cache } from "react"

import { criarClienteServidor } from "@/lib/supabase/server"
import type { Empresa, Usuario } from "@/types/database"

export interface SessaoUsuario {
  usuario: Usuario
  empresa: Empresa
}

/**
 * Carrega o usuário logado e sua empresa.
 *
 * Retorna null quando não há sessão ou quando o usuário ainda não concluiu o
 * onboarding (nesse caso o proxy já redireciona para /onboarding).
 *
 * Memoizado por requisição com `cache` para não repetir a consulta entre o
 * layout e as páginas.
 */
export const obterSessaoUsuario = cache(
  async (): Promise<SessaoUsuario | null> => {
    const supabase = await criarClienteServidor()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
      .from("usuarios")
      .select("*, empresas(*)")
      .eq("id", user.id)
      .maybeSingle<Usuario & { empresas: Empresa | null }>()

    if (error || !data || !data.empresas) return null

    const { empresas, ...usuario } = data
    return { usuario, empresa: empresas }
  }
)
