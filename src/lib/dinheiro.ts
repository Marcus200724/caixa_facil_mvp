/**
 * Utilitários monetários.
 *
 * Regra do projeto: dinheiro é sempre inteiro em CENTAVOS. Nenhum cálculo
 * financeiro passa por ponto flutuante — as conversões aqui trabalham com os
 * dígitos como texto justamente para não introduzir erro de arredondamento.
 */

/** Maior valor aceito num campo: R$ 9.999.999,99. Evita digitação acidental absurda. */
export const CENTAVOS_MAXIMO = 999_999_999

/**
 * Converte um valor em reais para centavos.
 *
 * Aceita as formas que aparecem na prática: "1.234,56", "1234,56", "1234.56",
 * "1234", "R$ 1.234,56". Retorna `NaN` quando não há número reconhecível.
 *
 * Quando há vírgula e ponto, o separador decimal é o que aparece por último.
 * Um ponto sozinho seguido de exatamente 3 dígitos é lido como separador de
 * milhar ("1.234" = mil duzentos e trinta e quatro reais), que é a leitura
 * correta em pt-BR.
 */
export function paraCentavos(valorEmReais: string | number): number {
  if (typeof valorEmReais === "number") {
    if (!Number.isFinite(valorEmReais)) return NaN
    return Math.round(valorEmReais * 100)
  }

  const limpo = valorEmReais.replace(/[^\d,.-]/g, "")
  if (limpo === "") return NaN

  const negativo = limpo.startsWith("-")
  const semSinal = limpo.replace(/-/g, "")
  if (semSinal === "") return NaN

  const ultimaVirgula = semSinal.lastIndexOf(",")
  const ultimoPonto = semSinal.lastIndexOf(".")

  let posicaoDecimal = -1
  if (ultimaVirgula >= 0 && ultimaVirgula > ultimoPonto) {
    posicaoDecimal = ultimaVirgula
  } else if (ultimoPonto >= 0 && ultimoPonto > ultimaVirgula) {
    const digitosDepois = semSinal.length - ultimoPonto - 1
    // "1.234" é milhar; "1.23" e "1.2" são decimais.
    if (digitosDepois !== 3) posicaoDecimal = ultimoPonto
  }

  const parteInteira =
    posicaoDecimal >= 0
      ? semSinal.slice(0, posicaoDecimal).replace(/\D/g, "")
      : semSinal.replace(/\D/g, "")

  const parteDecimal =
    posicaoDecimal >= 0
      ? semSinal
          .slice(posicaoDecimal + 1)
          .replace(/\D/g, "")
          .slice(0, 2)
          .padEnd(2, "0")
      : "00"

  if (parteInteira === "" && parteDecimal === "00" && posicaoDecimal < 0) {
    return NaN
  }

  const inteiro = parteInteira === "" ? 0 : Number(parteInteira)
  const centavos = inteiro * 100 + Number(parteDecimal)

  if (!Number.isSafeInteger(centavos)) return NaN

  return negativo ? -centavos : centavos
}

/** Formata centavos como "R$ 1.234,56". Negativos saem como "-R$ 12,34". */
export function formatarReais(centavos: number): string {
  return `${centavos < 0 ? "-" : ""}R$ ${formatarSemSimbolo(centavos)}`
}

/** Formata centavos como "1.234,56", sem o prefixo de moeda e sem sinal. */
export function formatarSemSimbolo(centavos: number): string {
  const absoluto = Math.abs(Math.trunc(centavos))
  const reais = Math.trunc(absoluto / 100)
  const resto = absoluto % 100
  return `${reais.toLocaleString("pt-BR")},${String(resto).padStart(2, "0")}`
}

/**
 * Formata para edição dentro de um input: "1.234,56".
 * Retorna string vazia quando não há valor, para o campo poder ficar em branco.
 */
export function formatarParaEdicao(centavos: number | null): string {
  if (centavos === null) return ""
  return formatarSemSimbolo(centavos)
}

/** Quantos dígitos cabem em CENTAVOS_MAXIMO. */
const MAXIMO_DIGITOS = String(CENTAVOS_MAXIMO).length

/**
 * Converte uma sequência de dígitos em centavos. "" vira null (campo vazio),
 * "0" vira 0 (zero de verdade). Essa distinção importa: um fundo de caixa de
 * R$ 0,00 é um valor legítimo, diferente de campo não preenchido.
 */
export function digitosParaCentavos(digitos: string): number | null {
  const limpos = digitos.replace(/\D/g, "").slice(0, MAXIMO_DIGITOS)
  if (limpos === "") return null
  const centavos = Number(limpos)
  return Number.isSafeInteger(centavos) ? centavos : null
}

/** Inverso de `digitosParaCentavos`. */
export function centavosParaDigitos(centavos: number | null): string {
  if (centavos === null) return ""
  return String(Math.abs(Math.trunc(centavos)))
}

/**
 * Acrescenta um dígito ao acumulador, como numa máquina de caixa: teclar
 * 1, 2, 3, 4 percorre R$ 0,01 → R$ 0,12 → R$ 1,23 → R$ 12,34.
 *
 * Zeros à esquerda não entram, senão o campo encheria sem o valor mudar.
 */
export function adicionarDigito(digitos: string, digito: string): string {
  if (!/^\d$/.test(digito)) return digitos
  const proximo = digitos === "0" ? digito : digitos + digito
  if (proximo.replace(/^0+/, "").length > MAXIMO_DIGITOS) return digitos
  return proximo
}

/**
 * Remove o último dígito.
 *
 * O apagar precisa mexer no acumulador, não no texto exibido: "0,05" mostra
 * quatro caracteres para um único dígito, então reinterpretar o texto depois de
 * um backspace devolveria o valor errado — e travaria o campo no zero.
 */
export function removerUltimoDigito(digitos: string): string {
  return digitos.slice(0, -1)
}
