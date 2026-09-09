"use client"

import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, CircleCheck, Lock, TrendingDown, TrendingUp } from "lucide-react"

import { CampoDinheiro } from "@/components/campo-dinheiro"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  calcularConferencia,
  calcularSaldoTeorico,
  descreverDiferenca,
  type TotaisDoTurno,
} from "@/lib/caixa/calculos"
import { formatarReais } from "@/lib/dinheiro"
import {
  esquemaFormularioFechamento,
  type EntradaFormularioFechamento,
  type SaidaFormularioFechamento,
} from "@/lib/validacoes/caixa"
import { cn } from "cn"

export function DialogoFechamento({
  aberto,
  aoMudarAberto,
  turnoNome,
  fundoInicial,
  totais,
  valoresIniciais,
  aoSolicitarAutorizacao,
}: {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  turnoNome: string
  fundoInicial: number
  totais: TotaisDoTurno
  valoresIniciais?: EntradaFormularioFechamento
  aoSolicitarAutorizacao: (dados: SaidaFormularioFechamento) => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Fechar caixa · {turnoNome}</DialogTitle>
          <DialogDescription>
            Confira os números do turno, conte a gaveta e informe o valor
            encontrado.
          </DialogDescription>
        </DialogHeader>

        <Formulario
          fundoInicial={fundoInicial}
          totais={totais}
          valoresIniciais={valoresIniciais}
          aoSolicitarAutorizacao={aoSolicitarAutorizacao}
          aoCancelar={() => aoMudarAberto(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  fundoInicial,
  totais,
  valoresIniciais,
  aoSolicitarAutorizacao,
  aoCancelar,
}: {
  fundoInicial: number
  totais: TotaisDoTurno
  valoresIniciais?: EntradaFormularioFechamento
  aoSolicitarAutorizacao: (dados: SaidaFormularioFechamento) => void
  aoCancelar: () => void
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EntradaFormularioFechamento, unknown, SaidaFormularioFechamento>({
    resolver: zodResolver(esquemaFormularioFechamento),
    defaultValues: valoresIniciais ?? {
      valorContado: null,
      vendasDinheiro: null,
      observacoes: "",
    },
  })

  const valorContado = useWatch({ control, name: "valorContado" })
  const vendasDinheiro = useWatch({ control, name: "vendasDinheiro" })

  const saldoTeorico = calcularSaldoTeorico(fundoInicial, totais)

  // Conferência só existe quando as vendas em dinheiro forem informadas
  // (CLAUDE.md, seção 3). Em branco, o fechamento apenas registra.
  const conferencia =
    vendasDinheiro !== null && valorContado !== null
      ? calcularConferencia(fundoInicial, totais, vendasDinheiro, valorContado)
      : null

  const diferenca = conferencia ? descreverDiferenca(conferencia.diferenca) : null

  return (
    <form
      onSubmit={handleSubmit(aoSolicitarAutorizacao)}
      className="flex flex-col gap-5"
    >
      <section className="rounded-xl border border-border bg-muted/40 p-3">
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">
          Como o turno fechou
        </h3>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
          <LinhaResumo rotulo="Fundo inicial" valor={formatarReais(fundoInicial)} />
          <LinhaResumo
            rotulo="Sangrias"
            valor={`− ${formatarReais(totais.sangrias)}`}
          />
          <LinhaResumo
            rotulo="Suprimentos"
            valor={`+ ${formatarReais(totais.suprimentos)}`}
          />
          <LinhaResumo
            rotulo="Saldo teórico"
            valor={formatarReais(saldoTeorico)}
            destaque
          />
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">
          O saldo teórico não inclui vendas.
        </p>
      </section>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="valorContado">Valor contado na gaveta</Label>
          <Controller
            control={control}
            name="valorContado"
            render={({ field }) => (
              <CampoDinheiro
                id="valorContado"
                value={field.value}
                onChange={field.onChange}
                invalido={!!errors.valorContado}
                autoFocus
              />
            )}
          />
          {errors.valorContado ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.valorContado.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendasDinheiro">
            Total de vendas em dinheiro (opcional)
          </Label>
          <Controller
            control={control}
            name="vendasDinheiro"
            render={({ field }) => (
              <CampoDinheiro
                id="vendasDinheiro"
                value={field.value}
                onChange={field.onChange}
                invalido={!!errors.vendasDinheiro}
                aria-describedby="dica-vendas"
              />
            )}
          />
          {errors.vendasDinheiro ? (
            <p role="alert" className="text-xs text-destructive">
              {errors.vendasDinheiro.message}
            </p>
          ) : (
            <p id="dica-vendas" className="text-xs text-muted-foreground">
              Preencha se você tem esse número de outra fonte (PDV, caderno de
              pedidos). Deixe em branco para apenas registrar o fechamento.
            </p>
          )}
        </div>
      </div>

      {conferencia && diferenca ? (
        <section
          className={cn(
            "flex flex-col gap-2 rounded-xl border p-3",
            diferenca.tom === "acerto" &&
              "border-emerald-500/40 bg-emerald-500/10",
            diferenca.tom === "sobra" && "border-sky-500/40 bg-sky-500/10",
            diferenca.tom === "falta" && "border-amber-500/40 bg-amber-500/10"
          )}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor esperado</span>
            <span className="font-medium tabular-nums">
              {formatarReais(conferencia.valorEsperado)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor contado</span>
            <span className="font-medium tabular-nums">
              {formatarReais(valorContado ?? 0)}
            </span>
          </div>
          {/* Ícone + texto: o significado nunca depende só da cor. */}
          <p className="flex items-center gap-2 border-t border-current/15 pt-2 text-base font-semibold">
            {diferenca.tom === "acerto" ? (
              <CircleCheck className="size-4" />
            ) : diferenca.tom === "sobra" ? (
              <TrendingUp className="size-4" />
            ) : (
              <TrendingDown className="size-4" />
            )}
            {diferenca.rotulo}
          </p>
        </section>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="observacoes">Observações (opcional)</Label>
        <Textarea
          id="observacoes"
          rows={2}
          placeholder="Algo que explique o fechamento"
          aria-invalid={!!errors.observacoes}
          {...register("observacoes")}
        />
        {errors.observacoes ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.observacoes.message}
          </p>
        ) : null}
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        <span>
          O fechamento é definitivo. Depois de confirmado, este caixa não poderá
          ser editado — correções entram como lançamento de ajuste.
        </span>
      </p>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit">
          Continuar
          <ArrowRight data-icon="inline-end" />
        </Button>
      </DialogFooter>
    </form>
  )
}

function LinhaResumo({
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
          destaque ? "font-semibold" : "font-medium"
        )}
      >
        {valor}
      </dd>
    </div>
  )
}
