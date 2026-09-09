"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { entrar } from "../acoes"
import { CampoFormulario } from "@/components/campo-formulario"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { esquemaLogin, type DadosLogin } from "@/lib/validacoes/auth"

export function FormularioLogin() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DadosLogin>({
    resolver: zodResolver(esquemaLogin),
    defaultValues: { email: "", senha: "" },
  })

  async function aoEnviar(dados: DadosLogin) {
    const resultado = await entrar(dados)

    if (!resultado.sucesso) {
      setError("root", { message: resultado.erro })
      toast.error(resultado.erro)
      return
    }

    router.replace(resultado.dados.destino)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-4">
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

      <CampoFormulario id="senha" rotulo="Senha" erro={errors.senha?.message}>
        <Input
          id="senha"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.senha}
          {...register("senha")}
        />
      </CampoFormulario>

      {errors.root?.message ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        Entrar
      </Button>
    </form>
  )
}
