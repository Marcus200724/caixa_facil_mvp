import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

import type { Database, Papel } from "@/types/database"
import { lerEnvSupabase } from "./env"

/** Rotas de autenticação — acessíveis apenas por quem NÃO está logado. */
const ROTAS_AUTENTICACAO = ["/login", "/cadastro"]

/** Rotas exclusivas do dono. */
const ROTAS_DONO = ["/painel", "/sangrias", "/configuracoes"]

const ROTA_ONBOARDING = "/onboarding"

/** Rota inicial de cada papel após o login. */
export function rotaInicialDoPapel(papel: Papel): string {
  return papel === "dono" ? "/painel" : "/caixa"
}

function comecaCom(pathname: string, rotas: string[]) {
  return rotas.some(
    (rota) => pathname === rota || pathname.startsWith(`${rota}/`)
  )
}

interface UsuarioDoProxy {
  empresa_id: string
  papel: Papel
  ativo: boolean
  pin_hash: string | null
  empresas: { turnos: { id: string }[] } | null
}

/**
 * Renova a sessão do Supabase e aplica as regras de proteção de rota.
 *
 * IMPORTANTE: nunca crie um NextResponse novo do zero depois de chamar esta
 * função sem copiar os cookies retornados — a sessão renovada seria perdida.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request })

  const { url, chave } = lerEnvSupabase()

  const supabase = createServerClient<Database>(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesParaDefinir) {
        for (const { name, value } of cookiesParaDefinir) {
          request.cookies.set(name, value)
        }
        resposta = NextResponse.next({ request })
        for (const { name, value, options } of cookiesParaDefinir) {
          resposta.cookies.set(name, value, options)
        }
      },
    },
  })

  // Não coloque nenhum código entre a criação do client e o getUser():
  // isso pode causar logout aleatório por corrida na renovação do token.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  /** Redireciona preservando os cookies de sessão renovados. */
  const redirecionarPara = (destino: string) => {
    const destinoUrl = request.nextUrl.clone()
    destinoUrl.pathname = destino
    destinoUrl.search = ""
    const redirecionamento = NextResponse.redirect(destinoUrl)
    for (const cookie of resposta.cookies.getAll()) {
      redirecionamento.cookies.set(cookie)
    }
    return redirecionamento
  }

  const emRotaDeAutenticacao = comecaCom(pathname, ROTAS_AUTENTICACAO)

  // 1. Visitante sem sessão só pode acessar as telas de autenticação.
  if (!user) {
    if (emRotaDeAutenticacao) return resposta
    return redirecionarPara("/login")
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("empresa_id, papel, ativo, pin_hash, empresas(turnos(id))")
    .eq("id", user.id)
    .maybeSingle<UsuarioDoProxy>()

  // 2. Onboarding incompleto: sem empresa, sem PIN ou sem nenhum turno.
  //    Enquanto não terminar, /onboarding é a única rota disponível.
  const onboardingConcluido =
    !!usuario &&
    !!usuario.pin_hash &&
    (usuario.empresas?.turnos.length ?? 0) > 0

  if (!onboardingConcluido) {
    if (pathname === ROTA_ONBOARDING) return resposta
    return redirecionarPara(ROTA_ONBOARDING)
  }

  // 3. Usuário desativado pelo dono perde o acesso imediatamente.
  if (!usuario.ativo) {
    await supabase.auth.signOut()
    return redirecionarPara("/login")
  }

  const rotaInicial = rotaInicialDoPapel(usuario.papel)

  // 4. Já autenticado e configurado: telas de auth e onboarding não fazem sentido.
  if (emRotaDeAutenticacao || pathname === ROTA_ONBOARDING || pathname === "/") {
    return redirecionarPara(rotaInicial)
  }

  // 5. Operador não acessa as telas do dono.
  if (usuario.papel === "operador" && comecaCom(pathname, ROTAS_DONO)) {
    return redirecionarPara("/caixa")
  }

  return resposta
}
