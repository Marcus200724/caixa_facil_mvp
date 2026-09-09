import { z } from "zod"

import { CENTAVOS_MAXIMO } from "@/lib/dinheiro"
import { esquemaPin } from "@/lib/validacoes/pin"

const LIMITE_DESCRICAO = 280

/**
 * Campo de dinheiro obrigatório num formulário.
 *
 * O `<CampoDinheiro />` guarda `number | null` (null = campo em branco), então o
 * schema do formulário precisa aceitar null para conseguir emitir a mensagem
 * certa em vez do "expected number, received null" do Zod.
 */
function valorObrigatorio(mensagemVazio: string) {
  return z
    .number()
    .int()
    .min(0, "O valor não pode ser negativo.")
    .max(CENTAVOS_MAXIMO, "Valor muito alto. Confira o que foi digitado.")
    .nullable()
    .refine((valor) => valor !== null, mensagemVazio)
}

const textoOpcional = z
  .string()
  .trim()
  .max(LIMITE_DESCRICAO, `Use no máximo ${LIMITE_DESCRICAO} caracteres.`)

/* ------------------------------------------------------------------ *
 * Formulários (cliente)
 * ------------------------------------------------------------------ */

export const esquemaFormularioAbertura = z.object({
  turnoId: z.string().min(1, "Escolha o turno."),
  fundoInicial: valorObrigatorio("Informe o fundo de caixa contado."),
})

/**
 * O campo de dinheiro guarda `number | null`, mas o schema garante não-nulo na
 * saída. Por isso entrada e saída são tipos diferentes, e o `useForm` recebe os
 * dois — o terceiro genérico é o que o `handleSubmit` entrega já validado.
 */
export type EntradaFormularioAbertura = z.input<typeof esquemaFormularioAbertura>
export type SaidaFormularioAbertura = z.output<typeof esquemaFormularioAbertura>

export const esquemaFormularioMovimentacao = z.object({
  categoriaId: z.string().min(1, "Escolha a categoria."),
  valor: z
    .number()
    .int()
    .min(1, "O valor deve ser maior que zero.")
    .max(CENTAVOS_MAXIMO, "Valor muito alto. Confira o que foi digitado.")
    .nullable()
    .refine((valor) => valor !== null, "Informe o valor."),
  descricao: textoOpcional,
})

export type EntradaFormularioMovimentacao = z.input<
  typeof esquemaFormularioMovimentacao
>
export type SaidaFormularioMovimentacao = z.output<
  typeof esquemaFormularioMovimentacao
>

export const esquemaFormularioFechamento = z.object({
  valorContado: valorObrigatorio("Informe o valor contado na gaveta."),
  // Opcional por decisão de produto (CLAUDE.md, seção 3): nunca obrigatório,
  // nunca bloqueia o fechamento.
  vendasDinheiro: z
    .number()
    .int()
    .min(0, "O valor não pode ser negativo.")
    .max(CENTAVOS_MAXIMO, "Valor muito alto. Confira o que foi digitado.")
    .nullable(),
  observacoes: textoOpcional,
})

export type EntradaFormularioFechamento = z.input<
  typeof esquemaFormularioFechamento
>
export type SaidaFormularioFechamento = z.output<
  typeof esquemaFormularioFechamento
>

/* ------------------------------------------------------------------ *
 * Entradas das Server Actions (servidor)
 * ------------------------------------------------------------------ */

export const esquemaAbrirCaixa = z.object({
  turnoId: z.uuid("Turno inválido."),
  fundoInicial: z.number().int().min(0).max(CENTAVOS_MAXIMO),
  pin: esquemaPin,
})

export type EntradaAbrirCaixa = z.infer<typeof esquemaAbrirCaixa>

export const esquemaRegistrarMovimentacao = z.object({
  tipo: z.enum(["sangria", "suprimento"]),
  categoriaId: z.uuid("Categoria inválida."),
  valor: z.number().int().min(1).max(CENTAVOS_MAXIMO),
  descricao: textoOpcional.nullable(),
  pin: esquemaPin,
})

export type EntradaRegistrarMovimentacao = z.infer<
  typeof esquemaRegistrarMovimentacao
>

export const esquemaFecharCaixa = z.object({
  sessaoId: z.uuid("Sessão inválida."),
  valorContado: z.number().int().min(0).max(CENTAVOS_MAXIMO),
  vendasDinheiro: z.number().int().min(0).max(CENTAVOS_MAXIMO).nullable(),
  observacoes: textoOpcional.nullable(),
  pin: esquemaPin,
})

export type EntradaFecharCaixa = z.infer<typeof esquemaFecharCaixa>
