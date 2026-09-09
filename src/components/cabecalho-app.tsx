import { LogOut } from "lucide-react"

import { Marca } from "@/components/marca"
import { NavegacaoApp } from "@/components/navegacao-app"
import { Button } from "@/components/ui/button"
import { sair } from "@/lib/acoes/sessao"
import type { Papel } from "@/types/database"

export function CabecalhoApp({
  nomeEmpresa,
  nomeUsuario,
  papel,
}: {
  nomeEmpresa: string
  nomeUsuario: string
  papel: Papel
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4">
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <Marca tamanho="compacto" />
            <span
              aria-hidden
              className="hidden h-5 w-px shrink-0 bg-border sm:block"
            />
            <span className="hidden truncate text-sm font-medium sm:block">
              {nomeEmpresa}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-sm font-medium">{nomeUsuario}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {papel}
              </span>
            </div>
            <form action={sair}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut data-icon="inline-start" />
                Sair
              </Button>
            </form>
          </div>
        </div>

        <NavegacaoApp papel={papel} />
      </div>
    </header>
  )
}
