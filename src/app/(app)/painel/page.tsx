import type { Metadata } from "next"
import { LayoutDashboard } from "lucide-react"

import { PlaceholderBloco } from "@/components/placeholder-bloco"

export const metadata: Metadata = {
  title: "Painel",
}

export default function PaginaPainel() {
  return (
    <PlaceholderBloco
      titulo="Painel"
      descricao="Sessões recentes com data, turno, operador, valor contado e diferença."
      icone={LayoutDashboard}
      bloco="Bloco 4"
    />
  )
}
