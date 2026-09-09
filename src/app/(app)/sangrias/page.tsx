import type { Metadata } from "next"
import { ArrowDownLeft } from "lucide-react"

import { PlaceholderBloco } from "@/components/placeholder-bloco"

export const metadata: Metadata = {
  title: "Sangrias do período",
}

export default function PaginaSangrias() {
  return (
    <PlaceholderBloco
      titulo="Sangrias do período"
      descricao="Quanto saiu de dinheiro no período e para quê, com filtro por data e categoria."
      icone={ArrowDownLeft}
      bloco="Bloco 4"
    />
  )
}
