import { ArrowDownLeft, ArrowUpRight, Inbox } from "lucide-react"

import type { MovimentacaoDetalhada } from "@/lib/caixa/consultas"
import { formatarHora } from "@/lib/datas"
import { formatarReais } from "@/lib/dinheiro"
import { cn } from "cn"

export function ListaMovimentacoes({
  movimentacoes,
}: {
  movimentacoes: MovimentacaoDetalhada[]
}) {
  if (movimentacoes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center">
        <Inbox className="size-6 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma movimentação ainda</p>
        <p className="max-w-sm text-xs text-muted-foreground">
          Sangrias e suprimentos deste turno aparecem aqui, do mais recente para
          o mais antigo.
        </p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {movimentacoes.map((movimentacao) => {
        const saida = movimentacao.tipo === "sangria"
        const Icone = saida ? ArrowDownLeft : ArrowUpRight

        return (
          <li
            key={movimentacao.id}
            className="flex items-center gap-3 px-4 py-3"
          >
            {/* O tipo é dito por ícone, texto e posição do sinal — não só por cor. */}
            <span
              aria-hidden
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg",
                saida
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              )}
            >
              <Icone className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-sm font-medium">
                  {saida ? "Sangria" : "Suprimento"}
                </span>
                <span className="text-sm text-muted-foreground">
                  {movimentacao.categoria}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
                <span>
                  {formatarHora(movimentacao.criadoEm)} · autorizado por{" "}
                  {movimentacao.autorizadoPor}
                </span>
              </div>
              {movimentacao.descricao ? (
                <p className="mt-0.5 truncate text-xs text-foreground/80">
                  {movimentacao.descricao}
                </p>
              ) : null}
            </div>

            <span
              className={cn(
                "shrink-0 text-sm font-semibold tabular-nums",
                saida ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"
              )}
            >
              {saida ? "−" : "+"}
              {formatarReais(movimentacao.valor)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
