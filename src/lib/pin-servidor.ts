import "server-only"

import { compare, hash } from "bcryptjs"

import { MINUTOS_BLOQUEIO_PIN } from "@/lib/validacoes/pin"

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
