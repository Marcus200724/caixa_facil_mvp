import { formatarReais } from "@/lib/dinheiro"
import type { TipoMovimentacao } from "@/types/database"

/**
 * Cálculos da sessão de caixa (CLAUDE.md, seção 5).
 *
 * Módulo puro, sem acesso a banco: o servidor usa para gravar e o cliente usa
 * para mostrar a prévia da conferência. Tendo uma fonte só, a prévia nunca
 * discorda do que foi gravado.
 *
 * Tudo em centavos, tudo inteiro.
 */

export interface TotaisDoTurno {
  /** Soma das sangrias, em centavos. Sempre positiva. */
  sangrias: number
  /** Soma dos suprimentos, em centavos. Sempre positiva. */
  suprimentos: number
}

export function somarMovimentacoes(
  movimentacoes: readonly { tipo: TipoMovimentacao; valor: number }[]
): TotaisDoTurno {
  return movimentacoes.reduce<TotaisDoTurno>(
    (totais, movimentacao) => {
      if (movimentacao.tipo === "sangria") {
        totais.sangrias += movimentacao.valor
      } else {
        totais.suprimentos += movimentacao.valor
      }
      return totais
    },
    { sangrias: 0, suprimentos: 0 }
  )
}

/**
 * Dinheiro que deveria estar na gaveta considerando apenas o que o operador
 * lançou — fundo, sangrias e suprimentos.
 *
 * NÃO inclui vendas: o operador não registra venda a venda (CLAUDE.md, seção 3).
 * A interface precisa deixar isso explícito para ninguém ler como faturamento.
 */
export function calcularSaldoTeorico(
  fundoInicial: number,
  totais: TotaisDoTurno
): number {
  return fundoInicial - totais.sangrias + totais.suprimentos
}

export interface Conferencia {
  valorEsperado: number
  diferenca: number
}

/**
 * valor_esperado = fundo_inicial + vendas_dinheiro − Σ sangrias + Σ suprimentos
 * diferenca      = valor_contado − valor_esperado
 *
 * Só faz sentido quando o fechamento informou as vendas em dinheiro.
 */
export function calcularConferencia(
  fundoInicial: number,
  totais: TotaisDoTurno,
  vendasDinheiro: number,
  valorContado: number
): Conferencia {
  const valorEsperado =
    calcularSaldoTeorico(fundoInicial, totais) + vendasDinheiro
  return { valorEsperado, diferenca: valorContado - valorEsperado }
}

export type TomDaDiferenca = "acerto" | "sobra" | "falta"

export interface DiferencaDescrita {
  tom: TomDaDiferenca
  /** Texto que carrega o significado sozinho, sem depender da cor. */
  rotulo: string
}

/**
 * Descreve a diferença em texto. O sistema informa, não acusa — daí "Sobra" e
 * "Falta" em vez de qualquer palavra que sugira culpa de quem operou.
 */
export function descreverDiferenca(diferenca: number): DiferencaDescrita {
  if (diferenca === 0) return { tom: "acerto", rotulo: "Caixa bateu" }
  if (diferenca > 0) {
    return { tom: "sobra", rotulo: `Sobra de ${formatarReais(diferenca)}` }
  }
  return { tom: "falta", rotulo: `Falta de ${formatarReais(-diferenca)}` }
}
