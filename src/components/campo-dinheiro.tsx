"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import {
  CENTAVOS_MAXIMO,
  adicionarDigito,
  centavosParaDigitos,
  digitosParaCentavos,
  formatarParaEdicao,
  paraCentavos,
  removerUltimoDigito,
} from "@/lib/dinheiro"
import { cn } from "cn"

export interface CampoDinheiroProps {
  id?: string
  /** Valor em CENTAVOS. `null` quando o campo está vazio. */
  value: number | null
  onChange: (centavos: number | null) => void
  disabled?: boolean
  invalido?: boolean
  autoFocus?: boolean
  placeholder?: string
  className?: string
  "aria-describedby"?: string
}

/**
 * Campo de valor em reais que guarda CENTAVOS.
 *
 * Digitação em acumulador, como máquina de caixa: teclar 1, 2, 3, 4 percorre
 * R$ 0,01 → R$ 0,12 → R$ 1,23 → R$ 12,34. Não existe estado intermediário
 * inválido nem ambiguidade de separador, o que importa para quem digita rápido
 * em pé com cliente esperando.
 *
 * A fonte da verdade é a sequência de dígitos, não o texto exibido: "0,05"
 * mostra quatro caracteres para um dígito só, então interpretar o texto depois
 * de um backspace daria o valor errado.
 *
 * Colar um valor formatado ("1.234,56", "R$ 1234.56") também funciona.
 */
export function CampoDinheiro({
  id,
  value,
  onChange,
  disabled,
  invalido,
  autoFocus,
  placeholder = "0,00",
  className,
  "aria-describedby": ariaDescribedBy,
}: CampoDinheiroProps) {
  const referencia = React.useRef<HTMLInputElement>(null)
  const [digitos, setDigitos] = React.useState(() => centavosParaDigitos(value))

  // O pai pode trocar o valor por fora (reset de formulário, valores
  // preservados ao voltar do PIN). Ajuste na renderização, não em efeito.
  const [valorAnterior, setValorAnterior] = React.useState(value)
  if (value !== valorAnterior) {
    setValorAnterior(value)
    if (value !== digitosParaCentavos(digitos)) {
      setDigitos(centavosParaDigitos(value))
    }
  }

  function aplicar(novosDigitos: string) {
    setDigitos(novosDigitos)
    onChange(digitosParaCentavos(novosDigitos))
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return

    if (/^\d$/.test(evento.key)) {
      evento.preventDefault()
      aplicar(adicionarDigito(digitos, evento.key))
      return
    }

    if (evento.key === "Backspace" || evento.key === "Delete") {
      evento.preventDefault()
      aplicar(removerUltimoDigito(digitos))
      return
    }

    // Teclas imprimíveis que não são dígito não entram. Teclas de navegação
    // (Tab, Enter, setas) têm nome com mais de um caractere e passam direto.
    if (evento.key.length === 1) evento.preventDefault()
  }

  /**
   * Rede de segurança para entradas que não passam por keydown (teclado
   * virtual, autofill). Aqui o texto é a única pista disponível.
   */
  function aoDigitar(evento: React.ChangeEvent<HTMLInputElement>) {
    const doTexto = evento.target.value.replace(/\D/g, "")
    if (doTexto === digitos.replace(/^0+(?=\d)/, "")) return
    aplicar(doTexto)
  }

  function aoColar(evento: React.ClipboardEvent<HTMLInputElement>) {
    const centavos = paraCentavos(evento.clipboardData.getData("text"))
    if (Number.isNaN(centavos)) return

    evento.preventDefault()
    aplicar(centavosParaDigitos(Math.min(Math.abs(centavos), CENTAVOS_MAXIMO)))
  }

  /** O cursor fica sempre no fim: editar no meio de um valor mascarado confunde. */
  function moverCursorParaOFim() {
    const campo = referencia.current
    if (!campo) return
    const fim = campo.value.length
    campo.setSelectionRange(fim, fim)
  }

  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-medium",
          disabled ? "text-muted-foreground/50" : "text-muted-foreground"
        )}
      >
        R$
      </span>
      <Input
        id={id}
        ref={referencia}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        value={formatarParaEdicao(digitosParaCentavos(digitos))}
        onKeyDown={aoTeclar}
        onChange={aoDigitar}
        onPaste={aoColar}
        onFocus={moverCursorParaOFim}
        onSelect={moverCursorParaOFim}
        disabled={disabled}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={invalido}
        aria-describedby={ariaDescribedBy}
        className="h-14 pl-11 text-right text-2xl font-semibold tabular-nums md:text-2xl"
      />
    </div>
  )
}
