import type { Metadata } from "next"
import { Settings } from "lucide-react"

import { PlaceholderBloco } from "@/components/placeholder-bloco"

export const metadata: Metadata = {
  title: "Configurações",
}

export default function PaginaConfiguracoes() {
  return (
    <PlaceholderBloco
      titulo="Configurações"
      descricao="Turnos, categorias, usuários e PINs da empresa."
      icone={Settings}
      bloco="Bloco 3"
    />
  )
}
