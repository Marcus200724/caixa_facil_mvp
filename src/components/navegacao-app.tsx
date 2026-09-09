"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowDownLeft, LayoutDashboard, Settings, Wallet } from "lucide-react"

import type { Papel } from "@/types/database"
import { cn } from "cn"

const ITENS = {
  dono: [
    { href: "/painel", rotulo: "Painel", icone: LayoutDashboard },
    { href: "/caixa", rotulo: "Caixa", icone: Wallet },
    { href: "/sangrias", rotulo: "Sangrias", icone: ArrowDownLeft },
    { href: "/configuracoes", rotulo: "Configurações", icone: Settings },
  ],
  operador: [{ href: "/caixa", rotulo: "Caixa", icone: Wallet }],
} as const

export function NavegacaoApp({ papel }: { papel: Papel }) {
  const pathname = usePathname()
  const itens = ITENS[papel]

  return (
    <nav aria-label="Navegação principal" className="-mb-px overflow-x-auto">
      <ul className="flex items-center gap-1">
        {itens.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icone = item.icone

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                  ativo
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icone className="size-4" />
                {item.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
