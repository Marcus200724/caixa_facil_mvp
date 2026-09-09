import { NextResponse, type NextRequest } from "next/server"

import { criarClienteServidor } from "@/lib/supabase/server"
import { gerarHashPin } from "@/lib/pin-servidor"
import { esquemaRequisicaoDefinirPin } from "@/lib/validacoes/pin"

/**
 * Define (ou troca) o PIN do usuário autenticado.
 *
 * O PIN só existe em texto puro dentro desta requisição: é convertido em hash
 * bcrypt antes de tocar o banco e nunca volta na resposta.
 */
export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { erro: "Sessão expirada. Entre de novo." },
      { status: 401 }
    )
  }

  let corpo: unknown
  try {
    corpo = await request.json()
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 })
  }

  const validacao = esquemaRequisicaoDefinirPin.safeParse(corpo)
  if (!validacao.success) {
    return NextResponse.json(
      { erro: validacao.error.issues[0]?.message ?? "PIN inválido." },
      { status: 400 }
    )
  }

  const pinHash = await gerarHashPin(validacao.data.pin)

  const { data: atualizado, error } = await supabase
    .from("usuarios")
    .update({ pin_hash: pinHash, tentativas_pin: 0, bloqueado_ate: null })
    .eq("id", user.id)
    .select("id")
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { erro: "Não foi possível salvar o PIN. Tente de novo." },
      { status: 500 }
    )
  }

  if (!atualizado) {
    return NextResponse.json(
      { erro: "Cadastre sua empresa antes de definir o PIN." },
      { status: 409 }
    )
  }

  return NextResponse.json({ sucesso: true })
}
