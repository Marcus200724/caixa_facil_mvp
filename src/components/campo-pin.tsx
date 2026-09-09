"use client"

import * as React from "react"
import { OTPInputContext, REGEXP_ONLY_DIGITS } from "input-otp"

import { InputOTP, InputOTPGroup } from "@/components/ui/input-otp"
import { PIN_TAMANHO_MAXIMO } from "@/lib/validacoes/pin"
import { cn } from "cn"

/**
 * Slot de PIN: mostra apenas um ponto no lugar do dígito.
 * O caixa é usado em pé, com fila na frente — o PIN não pode ficar exposto.
 */
function SlotPin({ index }: { index: number }) {
  const contexto = React.useContext(OTPInputContext)
  const { char, hasFakeCaret, isActive } = contexto?.slots[index] ?? {}

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      aria-hidden
      className={cn(
        "relative flex size-11 items-center justify-center border-y border-r border-input text-lg transition-all outline-none",
        "first:rounded-l-lg first:border-l last:rounded-r-lg",
        "data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50",
        "dark:bg-input/30"
      )}
    >
      {char ? <span className="text-xl leading-none">•</span> : null}
      {hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground duration-1000" />
        </div>
      ) : null}
    </div>
  )
}

export interface CampoPinProps {
  id?: string
  value: string
  onChange: (valor: string) => void
  onComplete?: (valor: string) => void
  disabled?: boolean
  invalido?: boolean
  autoFocus?: boolean
  "aria-label"?: string
}

/** Campo de PIN de 4 a 6 dígitos, mascarado e restrito a números. */
export function CampoPin({
  id,
  value,
  onChange,
  onComplete,
  disabled,
  invalido,
  autoFocus,
  "aria-label": ariaLabel = "PIN",
}: CampoPinProps) {
  return (
    <InputOTP
      id={id}
      maxLength={PIN_TAMANHO_MAXIMO}
      pattern={REGEXP_ONLY_DIGITS}
      inputMode="numeric"
      autoComplete="one-time-code"
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      aria-invalid={invalido}
      containerClassName="justify-center"
    >
      <InputOTPGroup
        className={cn(
          invalido &&
            "border-destructive ring-3 ring-destructive/20 dark:ring-destructive/40"
        )}
      >
        {Array.from({ length: PIN_TAMANHO_MAXIMO }, (_, indice) => (
          <SlotPin key={indice} index={indice} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}
