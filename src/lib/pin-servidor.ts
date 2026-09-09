import "server-only"

import { compare, hash } from "bcryptjs"
import type { SupabaseClient } from "@supabase/supabase-js"

import { MAX_TENTATIVAS_PIN, MINUTOS_BLOQUEIO_PIN } from "@/lib/validacoes/pin"
import type { Database } from "@/types/database"

const CUSTO_BCRYPT = 10

/**
 * Hash irreversível do PIN. O PIN em texto puro nunca é persistido nem logado.
 */
export function gerarHashPin(pin: string): Promise<string> {
  return hash(pin, CUSTO_BCRYPT)
}

export function conferirPin(pin: string, pinHash: string): Promise<boolean> {
  return compare(pin, pinHash)
}

export function instanteDeBloqueio(agora = new Date()): Date {
  return new Date(agora.getTime() + MINUTOS_BLOQUEIO_PIN * 60_000)
}

/** Texto amigável para o tempo restante de bloqueio. */
export function descreverTempoRestante(bloqueadoAte: Date, agora = new Date()) {
  const segundos = Math.max(
    0,
    Math.ceil((bloqueadoAte.getTime() - agora.getTime()) / 1000)
  )
  if (segundos >= 60) {
    const minutos = Math.ceil(segundos / 60)
    return minutos === 1 ? "1 minuto" : `${minutos} minutos`
  }
  return segundos === 1 ? "1 segundo" : `${segundos} segundos`
}

export type MotivoPinRecusado =
  | "pin_incorreto"
  | "bloqueado"
  | "sem_pin"
  | "usuario_inativo"
  | "usuario_nao_encontrado"
  | "falha_no_banco"

export type ResultadoVerificacaoPin =
  | { valido: true }
  | {
      valido: false
      motivo: MotivoPinRecusado
      mensagem: string
      tentativasRestantes?: number
    }

function recusar(
  motivo: MotivoPinRecusado,
  mensagem: string,
  tentativasRestantes?: number
): ResultadoVerificacaoPin {
  return { valido: false, motivo, mensagem, tentativasRestantes }
}

/**
 * Confere o PIN de um usuário e mantém a contagem de tentativas e o bloqueio.
 *
 * Esta é a ÚNICA implementação da regra de PIN no servidor. Tanto a rota
 * /api/pin/validar quanto as Server Actions que gravam dinheiro passam por
 * aqui, então não existe caminho de escrita que dependa apenas de o cliente ter
 * recebido `valido: true` em algum momento anterior.
 *
 * `solicitanteId` é sempre o usuário da sessão autenticada: um usuário só pode
 * conferir o PIN de alguém da própria empresa.
 */
export async function verificarPin(
  supabase: SupabaseClient<Database>,
  parametros: { solicitanteId: string; usuarioId: string; pin: string }
): Promise<ResultadoVerificacaoPin> {
  const { solicitanteId, usuarioId, pin } = parametros

  const { data: solicitante, error: erroSolicitante } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", solicitanteId)
    .maybeSingle()

  if (erroSolicitante || !solicitante) {
    return recusar(
      "usuario_nao_encontrado",
      "Não foi possível validar o PIN. Tente de novo."
    )
  }

  const { data: alvo, error: erroAlvo } = await supabase
    .from("usuarios")
    .select("id, empresa_id, ativo, pin_hash, tentativas_pin, bloqueado_ate")
    .eq("id", usuarioId)
    .maybeSingle()

  // Usuário de outra empresa é tratado como inexistente.
  if (erroAlvo || !alvo || alvo.empresa_id !== solicitante.empresa_id) {
    return recusar("usuario_nao_encontrado", "Usuário não encontrado.")
  }

  if (!alvo.ativo) {
    return recusar("usuario_inativo", "Este usuário está desativado.")
  }

  const agora = new Date()

  if (alvo.bloqueado_ate) {
    const bloqueadoAte = new Date(alvo.bloqueado_ate)
    if (bloqueadoAte > agora) {
      return recusar(
        "bloqueado",
        `Muitas tentativas incorretas. Tente de novo em ${descreverTempoRestante(
          bloqueadoAte,
          agora
        )}.`,
        0
      )
    }
  }

  if (!alvo.pin_hash) {
    return recusar("sem_pin", "Este usuário ainda não cadastrou um PIN.")
  }

  if (await conferirPin(pin, alvo.pin_hash)) {
    const { error } = await supabase
      .from("usuarios")
      .update({ tentativas_pin: 0, bloqueado_ate: null })
      .eq("id", alvo.id)

    if (error) {
      return recusar(
        "falha_no_banco",
        "Não foi possível validar o PIN. Tente de novo."
      )
    }

    return { valido: true }
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
    return recusar(
      "falha_no_banco",
      "Não foi possível validar o PIN. Tente de novo."
    )
  }

  if (atingiuLimite && bloqueadoAte) {
    return recusar(
      "bloqueado",
      `Muitas tentativas incorretas. Tente de novo em ${descreverTempoRestante(
        bloqueadoAte,
        agora
      )}.`,
      0
    )
  }

  const restantes = MAX_TENTATIVAS_PIN - tentativas
  return recusar(
    "pin_incorreto",
    restantes === 1
      ? "PIN incorreto. Resta 1 tentativa antes do bloqueio."
      : `PIN incorreto. Restam ${restantes} tentativas.`,
    restantes
  )
}
