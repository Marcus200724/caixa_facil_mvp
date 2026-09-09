import type { ReactNode } from "react"

import { Marca } from "@/components/marca"

export default function LayoutAutenticacao({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <Marca />
      <div className="w-full max-w-sm">{children}</div>
      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Livro-caixa digital por turno. Controle o dinheiro da gaveta sem caderno.
      </p>
    </div>
  )
}
