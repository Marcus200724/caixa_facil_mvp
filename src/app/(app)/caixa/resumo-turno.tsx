import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react"

import { calcularSaldoTeorico, type TotaisDoTurno } from "@/lib/caixa/calculos"
import { formatarReais } from "@/lib/dinheiro"
import { cn } from "cn"

/**
 * Indicadores do turno.
 *
 * O saldo teórico é a figura-herói: é o número que o operador confere contra a
 * gaveta. Os outros três são apoio.
 */
export function ResumoTurno({
  fundoInicial,
  totais,
  className,
}: {
  fundoInicial: number
  totais: TotaisDoTurno
  className?: string
}) {
  const saldo = calcularSaldoTeorico(fundoInicial, totais)

  return (
    <div
      className={cn(
        "grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
        className
      )}
    >
      <section className="flex flex-col justify-center gap-1 rounded-xl border border-border bg-card px-5 py-4">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
          <Wallet className="size-4" />
          Saldo teórico em gaveta
        </h3>
        <p className="text-4xl font-semibold tracking-tight">
          {formatarReais(saldo)}
        </p>
        {/* O operador não lança vendas (CLAUDE.md, seção 3). Sem este aviso o
            número passa a ser lido como faturamento do turno. */}
        <p className="text-xs text-muted-foreground">
          Não inclui vendas — considera apenas fundo, sangrias e suprimentos.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador rotulo="Fundo inicial" valor={fundoInicial} />
        <Indicador
          rotulo="Sangrias"
          valor={totais.sangrias}
          icone={<ArrowDownLeft className="size-3.5" />}
          sinal="saida"
        />
        <Indicador
          rotulo="Suprimentos"
          valor={totais.suprimentos}
          icone={<ArrowUpRight className="size-3.5" />}
          sinal="entrada"
        />
      </div>
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  icone,
  sinal,
}: {
  rotulo: string
  valor: number
  icone?: React.ReactNode
  sinal?: "entrada" | "saida"
}) {
  return (
    <section className="flex flex-col justify-center gap-0.5 rounded-xl border border-border bg-card px-4 py-3">
      <h3 className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        {icone}
        {rotulo}
      </h3>
      <p className="text-xl font-semibold tracking-tight">
        {sinal === "saida" && valor > 0 ? "−" : null}
        {sinal === "entrada" && valor > 0 ? "+" : null}
        {formatarReais(valor)}
      </p>
    </section>
  )
}
