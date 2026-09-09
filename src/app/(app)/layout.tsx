import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { CabecalhoApp } from "@/components/cabecalho-app"
import { obterSessaoUsuario } from "@/lib/usuario-atual"

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const sessao = await obterSessaoUsuario()

  // Rede de segurança: o proxy já barra o acesso antes de chegar aqui.
  if (!sessao) redirect("/login")

  return (
    <div className="flex min-h-svh flex-1 flex-col bg-muted/30">
      <CabecalhoApp
        nomeEmpresa={sessao.empresa.nome}
        nomeUsuario={sessao.usuario.nome}
        papel={sessao.usuario.papel}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  )
}
