import type { NextRequest } from "next/server"

import { atualizarSessao } from "@/lib/supabase/middleware"

/**
 * A partir do Next.js 16 o antigo `middleware.ts` passou a se chamar `proxy.ts`.
 * A função é a mesma: roda antes de cada requisição, renova a sessão do Supabase
 * e redireciona conforme o estado de autenticação do usuário.
 */
export async function proxy(request: NextRequest) {
  return atualizarSessao(request)
}

export const config = {
  matcher: [
    /*
     * Roda em todas as rotas, exceto:
     * - /api            (Route Handlers cuidam da própria autorização)
     * - _next/static    (arquivos estáticos)
     * - _next/image     (otimização de imagens)
     * - favicon e demais arquivos de imagem
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
