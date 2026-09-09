import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "cn"

export function CampoFormulario({
  id,
  rotulo,
  erro,
  dica,
  children,
  className,
}: {
  id: string
  rotulo: string
  erro?: string
  dica?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{rotulo}</Label>
      {children}
      {erro ? (
        <p className="text-xs text-destructive" role="alert">
          {erro}
        </p>
      ) : dica ? (
        <p className="text-xs text-muted-foreground">{dica}</p>
      ) : null}
    </div>
  )
}
