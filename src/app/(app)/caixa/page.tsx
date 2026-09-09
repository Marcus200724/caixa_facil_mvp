import type { Metadata } from "next"
import { Wallet } from "lucide-react"

import { PlaceholderBloco } from "@/components/placeholder-bloco"

export const metadata: Metadata = {
  title: "Caixa",
}

export default function PaginaCaixa() {
  return (
    <PlaceholderBloco
      titulo="Caixa"
      descricao="Abertura do turno, sangrias, suprimentos e fechamento."
      icone={Wallet}
      bloco="Bloco 2"
    />
  )
}
