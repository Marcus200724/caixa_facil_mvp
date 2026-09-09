import { z } from "zod"

export const PIN_TAMANHO_MINIMO = 4
export const PIN_TAMANHO_MAXIMO = 6
export const MAX_TENTATIVAS_PIN = 5
export const MINUTOS_BLOQUEIO_PIN = 5

const MENSAGEM_PIN = `O PIN deve ter de ${PIN_TAMANHO_MINIMO} a ${PIN_TAMANHO_MAXIMO} dígitos numéricos.`

/**
 * Só dígitos — como literal, nunca via `new RegExp` com template string.
 * Num template literal `\d` não é escape reconhecido e colapsa para `d`, o que
 * produz um regex que casa a letra "d" e rejeita todo PIN numérico.
 */
const APENAS_DIGITOS = /^\d+$/

/**
 * PIN de 4 a 6 dígitos.
 *
 * O comprimento vem de `.min()`/`.max()` em vez de um quantificador no regex,
 * para os limites continuarem amarrados às constantes acima.
 */
export const esquemaPin = z
  .string()
  .regex(APENAS_DIGITOS, MENSAGEM_PIN)
  .min(PIN_TAMANHO_MINIMO, MENSAGEM_PIN)
  .max(PIN_TAMANHO_MAXIMO, MENSAGEM_PIN)

export const esquemaDefinirPin = z
  .object({
    pin: esquemaPin,
    confirmacaoPin: z.string(),
  })
  .refine((dados) => dados.pin === dados.confirmacaoPin, {
    message: "Os PINs não conferem.",
    path: ["confirmacaoPin"],
  })

export type DadosDefinirPin = z.infer<typeof esquemaDefinirPin>

/** Corpo aceito por POST /api/pin/definir */
export const esquemaRequisicaoDefinirPin = z.object({
  pin: esquemaPin,
})

/** Corpo aceito por POST /api/pin/validar */
export const esquemaRequisicaoValidarPin = z.object({
  usuarioId: z.uuid("Usuário inválido."),
  pin: esquemaPin,
})
