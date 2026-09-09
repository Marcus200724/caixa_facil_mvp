import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AbrirCaixa } from "./abrir-caixa"
import { SessaoAberta } from "./sessao-aberta"
import { SessaoFechada } from "./sessao-fechada"
import { carregarDadosDoCaixa } from "@/lib/caixa/consultas"

export const metadata: Metadata = {
  title: "Caixa",
}

/**
 * Rota única do ciclo de caixa: renderiza um de três estados conforme o turno.
 * Abrir e fechar não têm rota própria — o operador não navega, ele age.
 */
export default async function PaginaCaixa() {
  const dados = await carregarDadosDoCaixa()

  // Rede de segurança: o proxy já barra o acesso antes de chegar aqui.
  if (!dados) redirect("/login")

  const { estado, categorias, usuario } = dados

  if (estado.estado === "aberta") {
    return (
      <SessaoAberta
        sessao={estado.sessao}
        categorias={categorias}
        usuarioId={usuario.id}
      />
    )
  }

  if (estado.estado === "fechada_hoje") {
    return (
      <SessaoFechada
        sessao={estado.sessao}
        turnos={estado.turnos}
        turnoSugeridoId={estado.turnoSugeridoId}
        usuarioId={usuario.id}
      />
    )
  }

  return (
    <AbrirCaixa
      turnos={estado.turnos}
      turnoSugeridoId={estado.turnoSugeridoId}
      usuarioId={usuario.id}
    />
  )
}
