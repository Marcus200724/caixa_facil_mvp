"use client"

import { useRouter } from "next/navigation"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Check, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { salvarTurnos } from "./acoes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { esquemaTurnos, type DadosTurnos } from "@/lib/validacoes/onboarding"

export function EtapaTurnos({
  turnosIniciais,
  aoVoltar,
}: {
  turnosIniciais: DadosTurnos["turnos"]
  aoVoltar: () => void
}) {
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DadosTurnos>({
    resolver: zodResolver(esquemaTurnos),
    defaultValues: { turnos: turnosIniciais },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "turnos" })

  async function aoEnviar(dados: DadosTurnos) {
    const resultado = await salvarTurnos(dados)

    if (!resultado.sucesso) {
      toast.error(resultado.erro)
      return
    }

    toast.success("Tudo pronto. Sua empresa está configurada.")
    router.replace("/painel")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        {fields.map((campo, indice) => {
          const erroTurno = errors.turnos?.[indice]

          return (
            <div
              key={campo.id}
              className="flex flex-col gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-end gap-2">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`turnos.${indice}.nome`}>Nome do turno</Label>
                  <Input
                    id={`turnos.${indice}.nome`}
                    placeholder="Manhã"
                    aria-invalid={!!erroTurno?.nome}
                    {...register(`turnos.${indice}.nome`)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover turno ${indice + 1}`}
                  disabled={fields.length === 1 || isSubmitting}
                  onClick={() => remove(indice)}
                >
                  <Trash2 />
                </Button>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`turnos.${indice}.horaPrevistaAbertura`}>
                    Abertura
                  </Label>
                  <Input
                    id={`turnos.${indice}.horaPrevistaAbertura`}
                    type="time"
                    aria-invalid={!!erroTurno?.horaPrevistaAbertura}
                    {...register(`turnos.${indice}.horaPrevistaAbertura`)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor={`turnos.${indice}.horaPrevistaFechamento`}>
                    Fechamento
                  </Label>
                  <Input
                    id={`turnos.${indice}.horaPrevistaFechamento`}
                    type="time"
                    aria-invalid={!!erroTurno?.horaPrevistaFechamento}
                    {...register(`turnos.${indice}.horaPrevistaFechamento`)}
                  />
                </div>
              </div>

              {erroTurno ? (
                <p role="alert" className="text-xs text-destructive">
                  {erroTurno.nome?.message ??
                    erroTurno.horaPrevistaAbertura?.message ??
                    erroTurno.horaPrevistaFechamento?.message}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {(errors.turnos?.root?.message ?? errors.turnos?.message) ? (
        <p role="alert" className="text-xs text-destructive">
          {errors.turnos.root?.message ?? errors.turnos.message}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            nome: "",
            horaPrevistaAbertura: "19:00",
            horaPrevistaFechamento: "23:00",
          })
        }
        disabled={isSubmitting}
      >
        <Plus data-icon="inline-start" />
        Adicionar turno
      </Button>

      <p className="text-xs text-muted-foreground">
        Você pode editar, criar ou desativar turnos depois em Configurações.
      </p>

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="sm:flex-1"
          onClick={aoVoltar}
          disabled={isSubmitting}
        >
          <ArrowLeft data-icon="inline-start" />
          Voltar
        </Button>
        <Button type="submit" size="lg" className="sm:flex-1" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Check data-icon="inline-start" />}
          Concluir
        </Button>
      </div>
    </form>
  )
}
