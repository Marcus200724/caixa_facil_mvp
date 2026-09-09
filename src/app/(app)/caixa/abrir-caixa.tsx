"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Controller, useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { LockKeyhole, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { abrirCaixa } from "./acoes"
import { CampoDinheiro } from "@/components/campo-dinheiro"
import { PinDialog } from "@/components/pin-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TurnoDisponivel } from "@/lib/caixa/consultas"
import { formatarData, formatarHoraDoTurno } from "@/lib/datas"
import { formatarReais } from "@/lib/dinheiro"
import {
  esquemaFormularioAbertura,
  type EntradaFormularioAbertura,
  type SaidaFormularioAbertura,
} from "@/lib/validacoes/caixa"

export function AbrirCaixa({
  turnos,
  turnoSugeridoId,
  usuarioId,
  titulo = "Nenhum caixa aberto",
  descricao = "Escolha o turno, conte o dinheiro da gaveta e informe o fundo de caixa.",
}: {
  turnos: TurnoDisponivel[]
  turnoSugeridoId: string | null
  usuarioId: string
  titulo?: string
  descricao?: string
}) {
  const router = useRouter()
  const [pinAberto, setPinAberto] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EntradaFormularioAbertura, unknown, SaidaFormularioAbertura>({
    resolver: zodResolver(esquemaFormularioAbertura),
    defaultValues: {
      turnoId: turnoSugeridoId ?? (turnos.length === 1 ? turnos[0].id : ""),
      fundoInicial: null,
    },
  })

  // useWatch em vez de watch(): watch() devolve função não memoizável e o
  // React Compiler desliga a otimização do componente inteiro por causa dela.
  const turnoId = useWatch({ control, name: "turnoId" })
  const fundoInicial = useWatch({ control, name: "fundoInicial" })

  const turnoSelecionado = turnos.find((turno) => turno.id === turnoId)
  const referencia = turnoSelecionado?.ultimoFechamento ?? null

  // Divergir da referência não impede nada — a divergência é informação, e o
  // fundo é sempre o que foi contado fisicamente (CLAUDE.md, seção 5).
  const divergeDaReferencia =
    referencia !== null &&
    fundoInicial !== null &&
    fundoInicial !== referencia.valorContado

  // Guardado no submit: já passou pelo schema, então o fundo não é mais nulo.
  const [validado, setValidado] = useState<SaidaFormularioAbertura | null>(null)

  function aoSubmeter(dados: SaidaFormularioAbertura) {
    setValidado(dados)
    setPinAberto(true)
  }

  async function confirmarComPin(pin: string) {
    if (!validado) return { erro: "Informe o fundo de caixa contado." }

    const resultado = await abrirCaixa({
      turnoId: validado.turnoId,
      fundoInicial: validado.fundoInicial,
      pin,
    })

    if (!resultado.sucesso) return { erro: resultado.erro }

    toast.success("Caixa aberto.")
    router.refresh()
  }

  if (turnos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titulo}</CardTitle>
          <CardDescription>
            Nenhum turno ativo cadastrado. Peça ao dono para cadastrar um turno
            em Configurações.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card className="mx-auto w-full max-w-3xl">
        <CardHeader>
          <CardTitle className="text-xl">{titulo}</CardTitle>
          <CardDescription>{descricao}</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(aoSubmeter)}
            className="flex flex-col gap-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="turnoId">Turno</Label>
                <Controller
                  control={control}
                  name="turnoId"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(valor) => field.onChange(valor ?? "")}
                    >
                      <SelectTrigger
                        id="turnoId"
                        className="h-14"
                        aria-invalid={!!errors.turnoId}
                      >
                        <SelectValue>
                          {(valor: string) => {
                            const turno = turnos.find((t) => t.id === valor)
                            return turno ? (
                              <span className="text-base font-medium">
                                {turno.nome}
                                <span className="ml-2 text-sm font-normal text-muted-foreground">
                                  {formatarHoraDoTurno(turno.horaAbertura)} às{" "}
                                  {formatarHoraDoTurno(turno.horaFechamento)}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Escolha o turno
                              </span>
                            )
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {turnos.map((turno) => (
                          <SelectItem key={turno.id} value={turno.id}>
                            {turno.nome} ·{" "}
                            {formatarHoraDoTurno(turno.horaAbertura)} às{" "}
                            {formatarHoraDoTurno(turno.horaFechamento)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.turnoId ? (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.turnoId.message}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fundoInicial">Fundo de caixa contado</Label>
                <Controller
                  control={control}
                  name="fundoInicial"
                  render={({ field }) => (
                    <CampoDinheiro
                      id="fundoInicial"
                      value={field.value}
                      onChange={field.onChange}
                      invalido={!!errors.fundoInicial}
                      autoFocus
                      aria-describedby="dica-fundo"
                    />
                  )}
                />
                {errors.fundoInicial ? (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.fundoInicial.message}
                  </p>
                ) : (
                  <p id="dica-fundo" className="text-xs text-muted-foreground">
                    Conte o dinheiro da gaveta agora e digite o que encontrou.
                  </p>
                )}
              </div>
            </div>

            {referencia ? (
              <p className="rounded-lg bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                No último fechamento deste turno restaram{" "}
                <strong className="font-semibold text-foreground">
                  {formatarReais(referencia.valorContado)}
                </strong>{" "}
                ({formatarData(referencia.data)}). Confira contando — este valor
                é só referência.
              </p>
            ) : null}

            {divergeDaReferencia ? (
              <p
                role="status"
                className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <span>
                  O valor contado está diferente do último fechamento. Você pode
                  seguir assim mesmo — a diferença fica registrada.
                </span>
              </p>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" size="lg" disabled={isSubmitting}>
                <LockKeyhole data-icon="inline-start" />
                Abrir caixa
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <PinDialog
        aberto={pinAberto}
        aoMudarAberto={setPinAberto}
        usuarioId={usuarioId}
        titulo="Confirme para abrir o caixa"
        descricao={
          fundoInicial !== null
            ? `Fundo de ${formatarReais(fundoInicial)} em ${
                turnoSelecionado?.nome ?? "turno"
              }.`
            : undefined
        }
        rotuloConfirmar="Abrir caixa"
        aoConfirmar={confirmarComPin}
      />
    </>
  )
}
