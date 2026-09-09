import { Wallet } from "lucide-react"

import { cn } from "cn"

export function Marca({
  className,
  tamanho = "padrao",
}: {
  className?: string
  tamanho?: "padrao" | "compacto"
}) {
  const compacto = tamanho === "compacto"

  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-primary-foreground",
          compacto ? "size-7" : "size-9"
        )}
      >
        <Wallet className={compacto ? "size-4" : "size-5"} />
      </span>
      <span
        className={cn(
          "font-heading font-semibold tracking-tight",
          compacto ? "text-base" : "text-xl"
        )}
      >
        Caixa Fácil
      </span>
    </span>
  )
}
