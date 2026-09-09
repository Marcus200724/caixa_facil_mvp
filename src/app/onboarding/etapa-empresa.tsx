"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { salvarEmpresa } from "./acoes"
import { CampoFormulario } from "@/components/campo-formulario"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { esquemaEmpresa, type DadosEmpresa } from "@/lib/validacoes/onboarding"

export function EtapaEmpresa({
  nomeInicial,
  aoConcluir,
}: {
  nomeInicial: string
  aoConcluir: (nome: string) => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DadosEmpresa>({
    resolver: zodResolver(esquemaEmpresa),
    defaultValues: { nome: nomeInicial },
  })

  async function aoEnviar(dados: DadosEmpresa) {
    const resultado = await salvarEmpresa(dados)

    if (!resultado.sucesso) {
      setError("nome", { message: resultado.erro })
      toast.error(resultado.erro)
      return
    }

    aoConcluir(dados.nome.trim())
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-5">
      <CampoFormulario
        id="nomeEmpresa"
        rotulo="Nome da empresa"
        erro={errors.nome?.message}
        dica="É o nome que aparece no topo do sistema."
      >
        <Input
          id="nomeEmpresa"
          autoComplete="organization"
          placeholder="Cantina da Praça"
          aria-invalid={!!errors.nome}
          {...register("nome")}
        />
      </CampoFormulario>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Continuar
        {!isSubmitting ? <ArrowRight data-icon="inline-end" /> : null}
      </Button>
    </form>
  )
}
