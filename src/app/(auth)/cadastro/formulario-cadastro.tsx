"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"

import { cadastrar } from "../acoes"
import { CampoFormulario } from "@/components/campo-formulario"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { esquemaCadastro, type DadosCadastro } from "@/lib/validacoes/auth"

export function FormularioCadastro() {
  const router = useRouter()
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DadosCadastro>({
    resolver: zodResolver(esquemaCadastro),
    defaultValues: { nome: "", email: "", senha: "", confirmacaoSenha: "" },
  })

  async function aoEnviar(dados: DadosCadastro) {
    const resultado = await cadastrar(dados)

    if (!resultado.sucesso) {
      setError("root", { message: resultado.erro })
      toast.error(resultado.erro)
      return
    }

    if (resultado.dados.precisaConfirmarEmail) {
      setAguardandoConfirmacao(true)
      return
    }

    toast.success("Conta criada. Vamos configurar sua empresa.")
    router.replace("/onboarding")
    router.refresh()
  }

  if (aguardandoConfirmacao) {
    return (
      <Alert>
        <MailCheck />
        <AlertTitle>Confirme seu e-mail</AlertTitle>
        <AlertDescription>
          Enviamos um link de confirmação para o e-mail informado. Abra o link e
          depois entre para configurar sua empresa.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-4">
      <CampoFormulario
        id="nome"
        rotulo="Nome completo"
        erro={errors.nome?.message}
      >
        <Input
          id="nome"
          autoComplete="name"
          placeholder="Maria da Silva"
          aria-invalid={!!errors.nome}
          {...register("nome")}
        />
      </CampoFormulario>

      <CampoFormulario id="email" rotulo="E-mail" erro={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@exemplo.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </CampoFormulario>

      <CampoFormulario
        id="senha"
        rotulo="Senha"
        erro={errors.senha?.message}
        dica="No mínimo 8 caracteres."
      >
        <Input
          id="senha"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.senha}
          {...register("senha")}
        />
      </CampoFormulario>

      <CampoFormulario
        id="confirmacaoSenha"
        rotulo="Confirmar senha"
        erro={errors.confirmacaoSenha?.message}
      >
        <Input
          id="confirmacaoSenha"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          aria-invalid={!!errors.confirmacaoSenha}
          {...register("confirmacaoSenha")}
        />
      </CampoFormulario>

      {errors.root?.message ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Criar conta
      </Button>
    </form>
  )
}
