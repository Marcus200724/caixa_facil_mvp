"use client"

import { useState } from "react"
import {
  CircleCheck,
  Clock,
  Lock,
  Plus,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react"

import { AbrirCaixa } from "./abrir-caixa"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { descreverDiferenca } from "@/lib/caixa/calculos"
import type { SessaoFechadaDetalhada, TurnoDisponivel } from "@/lib/caixa/consultas"
import { formatarHora } from "@/lib/datas"
import { formatarReais } from "@/lib/dinheiro"
import { cn } from "cn"

export function SessaoFechada({
  sessao,
  turnos,
  turnoSugeridoId,
  usuarioId,
}: {
  sessao: SessaoFechadaDetalhada
  turnos: TurnoDisponivel[]
  turnoSugeridoId: string | null
  usuarioId: string
}) {
  const [abrindoNovo, setAbrindoNovo] = useState(false)

  const diferenca =
    sessao.diferenca === null ? null : descreverDiferenca(sessao.diferenca)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <Card>
        <CardHeader>
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Lock className="size-4" />
          </div>
          <CardTitle className="text-xl">
            Caixa fechado · {sessao.turnoNome}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {sessao.fechadoEm ? (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Fechado às {formatarHora(sessao.fechadoEm)}
              </span>
            ) : null}
            {sessao.fechadaPorNome ? (
              <span className="flex items-center gap-1.5">
                <User className="size-3.5" />
                por {sessao.fechadaPorNome}
              </span>
            ) : null}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Item rotulo="Fundo inicial" valor={formatarReais(sessao.fundoInicial)} />
            <Item
              rotulo="Valor contado"
              valor={
                sessao.valorContado === null
                  ? "—"
                  : formatarReais(sessao.valorContado)
              }
              destaque
            />
            <Item
              rotulo="Vendas em dinheiro"
              valor={
                sessao.vendasDinheiro === null
                  ? "Não informado"
                  : formatarReais(sessao.vendasDinheiro)
              }
            />
            <Item
              rotulo="Valor esperado"
              valor={
                sessao.valorEsperado === null
                  ? "—"
                  : formatarReais(sessao.valorEsperado)
              }
            />
          </dl>

          {diferenca ? (
            <p
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold",
                diferenca.tom === "acerto" &&
                  "border-emerald-500/40 bg-emerald-500/10",
                diferenca.tom === "sobra" && "border-sky-500/40 bg-sky-500/10",
                diferenca.tom === "falta" && "border-amber-500/40 bg-amber-500/10"
              )}
            >
              {diferenca.tom === "acerto" ? (
                <CircleCheck className="size-4" />
              ) : diferenca.tom === "sobra" ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              {diferenca.rotulo}
            </p>
          ) : (
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
              As vendas em dinheiro não foram informadas, então este fechamento
              apenas registra o valor contado — sem conferência.
            </p>
          )}

          {sessao.observacoes ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-medium text-muted-foreground">
                Observações
              </h3>
              <p className="text-sm">{sessao.observacoes}</p>
            </div>
          ) : null}

          {/* Sessão fechada é imutável: nenhum caminho de edição é oferecido. */}
          {!abrindoNovo && turnos.length > 0 ? (
            <div className="flex justify-end pt-1">
              <Button size="lg" onClick={() => setAbrindoNovo(true)}>
                <Plus data-icon="inline-start" />
                Abrir novo caixa
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {abrindoNovo ? (
        <AbrirCaixa
          turnos={turnos}
          turnoSugeridoId={turnoSugeridoId}
          usuarioId={usuarioId}
          titulo="Abrir novo caixa"
          descricao="Escolha o turno, conte o dinheiro da gaveta e informe o fundo de caixa."
        />
      ) : null}
    </div>
  )
}

function Item({
  rotulo,
  valor,
  destaque,
}: {
  rotulo: string
  valor: string
  destaque?: boolean
}) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd
        className={cn(
          "tabular-nums",
          destaque ? "text-lg font-semibold" : "font-medium"
        )}
      >
        {valor}
      </dd>
    </div>
  )
}
