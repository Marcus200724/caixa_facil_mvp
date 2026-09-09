import { NextResponse, type NextRequest } from "next/server"

import { criarClienteServidor } from "@/lib/supabase/server"
import {
  conferirPin,
  descreverTempoRestante,
  instanteDeBloqueio,
} from "@/lib/pin-servidor"
import {
  MAX_TENTATIVAS_PIN,
  esquemaRequisicaoValidarPin,
} from "@/lib/validacoes/pin"
import type { RespostaValidarPin } from "@/types/pin"

/**
 * Confere o PIN de um usuário da mesma empresa de quem está autenticado.
 *
 * O hash nunca sai desta função — a resposta carrega apenas o veredito e o
 * número de tentativas restantes.
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
    // PIN fora do formato também conta como tentativa inválida, mas não faz
    // sentido gravar no banco: devolvemos direto.
    return NextResponse.json<RespostaValidarPin>({
      valido: false,
      mensagem: validacao.error.issues[0]?.message ?? "PIN inválido.",
    })
  }

  const { usuarioId, pin } = validacao.data

  const { data: solicitante, error: erroSolicitante } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .maybeSingle()

  if (erroSolicitante || !solicitante) {
    return NextResponse.json(
      { erro: "Não foi possível validar o PIN. Tente de novo." },
      { status: 403 }
    )
  }

  const { data: alvo, error: erroAlvo } = await supabase
    .from("usuarios")
    .select("id, empresa_id, ativo, pin_hash, tentativas_pin, bloqueado_ate")
    .eq("id", usuarioId)
    .maybeSingle()

  // Usuário de outra empresa é tratado como inexistente.
  if (erroAlvo || !alvo || alvo.empresa_id !== solicitante.empresa_id) {
    return NextResponse.json(
      { erro: "Usuário não encontrado." },
      { status: 404 }
    )
  }

  if (!alvo.ativo) {
    return NextResponse.json<RespostaValidarPin>({
      valido: false,
      mensagem: "Este usuário está desativado.",
    })
  }

  const agora = new Date()

  if (alvo.bloqueado_ate) {
    const bloqueadoAte = new Date(alvo.bloqueado_ate)
    if (bloqueadoAte > agora) {
      return NextResponse.json<RespostaValidarPin>({
        valido: false,
        bloqueado: true,
        mensagem: `Muitas tentativas incorretas. Tente de novo em ${descreverTempoRestante(
          bloqueadoAte,
          agora
        )}.`,
      })
    }
  }

  if (!alvo.pin_hash) {
    return NextResponse.json<RespostaValidarPin>({
      valido: false,
      mensagem: "Este usuário ainda não cadastrou um PIN.",
    })
  }

  const correto = await conferirPin(pin, alvo.pin_hash)

  if (correto) {
    const { error } = await supabase
      .from("usuarios")
      .update({ tentativas_pin: 0, bloqueado_ate: null })
      .eq("id", alvo.id)

    if (error) {
      return NextResponse.json(
        { erro: "Não foi possível validar o PIN. Tente de novo." },
        { status: 500 }
      )
    }

    return NextResponse.json<RespostaValidarPin>({ valido: true })
  }

  // O bloqueio anterior já expirou, então a contagem recomeça.
  const bloqueioExpirado =
    !!alvo.bloqueado_ate && new Date(alvo.bloqueado_ate) <= agora
  const tentativas = (bloqueioExpirado ? 0 : alvo.tentativas_pin) + 1
  const atingiuLimite = tentativas >= MAX_TENTATIVAS_PIN
  const bloqueadoAte = atingiuLimite ? instanteDeBloqueio(agora) : null

  const { error } = await supabase
    .from("usuarios")
    .update({
      tentativas_pin: atingiuLimite ? 0 : tentativas,
      bloqueado_ate: bloqueadoAte ? bloqueadoAte.toISOString() : null,
    })
    .eq("id", alvo.id)

  if (error) {
    return NextResponse.json(
      { erro: "Não foi possível validar o PIN. Tente de novo." },
      { status: 500 }
    )
  }

  if (atingiuLimite && bloqueadoAte) {
    return NextResponse.json<RespostaValidarPin>({
      valido: false,
      bloqueado: true,
      tentativasRestantes: 0,
      mensagem: `Muitas tentativas incorretas. Tente de novo em ${descreverTempoRestante(
        bloqueadoAte,
        agora
      )}.`,
    })
  }

  const restantes = MAX_TENTATIVAS_PIN - tentativas
  return NextResponse.json<RespostaValidarPin>({
    valido: false,
    tentativasRestantes: restantes,
    mensagem:
      restantes === 1
        ? "PIN incorreto. Resta 1 tentativa antes do bloqueio."
        : `PIN incorreto. Restam ${restantes} tentativas.`,
  })
}
