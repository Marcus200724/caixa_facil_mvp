import { NextResponse, type NextRequest } from "next/server"

import { criarClienteServidor } from "@/lib/supabase/server"
import { verificarPin } from "@/lib/pin-servidor"
import { esquemaRequisicaoValidarPin } from "@/lib/validacoes/pin"
import type { RespostaValidarPin } from "@/types/pin"

/**
 * Confere o PIN de um usuário da mesma empresa de quem está autenticado.
 *
 * A regra em si mora em `verificarPin` (src/lib/pin-servidor.ts), compartilhada
 * com as Server Actions que gravam dinheiro. Aqui só há o transporte HTTP.
 *
 * O hash nunca sai daqui — a resposta carrega apenas o veredito e o número de
 * tentativas restantes.
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

  const validacao = esquemaRequisicaoValidarPin.safeParse(corpo)
  if (!validacao.success) {
    // PIN fora do formato também é tentativa inválida, mas não faz sentido
    // gravar no banco: devolvemos direto.
    return NextResponse.json<RespostaValidarPin>({
      valido: false,
      mensagem: validacao.error.issues[0]?.message ?? "PIN inválido.",
    })
  }

  const resultado = await verificarPin(supabase, {
    solicitanteId: user.id,
    usuarioId: validacao.data.usuarioId,
    pin: validacao.data.pin,
  })

  if (resultado.valido) {
    return NextResponse.json<RespostaValidarPin>({ valido: true })
  }

  if (resultado.motivo === "usuario_nao_encontrado") {
    return NextResponse.json({ erro: resultado.mensagem }, { status: 404 })
  }

  if (resultado.motivo === "falha_no_banco") {
    return NextResponse.json({ erro: resultado.mensagem }, { status: 500 })
  }

  return NextResponse.json<RespostaValidarPin>({
    valido: false,
    bloqueado: resultado.motivo === "bloqueado",
    tentativasRestantes: resultado.tentativasRestantes,
    mensagem: resultado.mensagem,
  })
}
