import type { LucideIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Espaço reservado para telas que chegam nos próximos blocos do MVP. */
export function PlaceholderBloco({
  titulo,
  descricao,
  icone: Icone,
  bloco,
}: {
  titulo: string
  descricao: string
  icone: LucideIcon
  bloco: string
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icone className="size-5" />
        </div>
        <CardTitle>{titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Tela em construção — chega no {bloco}.
        </p>
      </CardContent>
    </Card>
  )
}
