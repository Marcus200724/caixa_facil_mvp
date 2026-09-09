"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { CampoPin } from "@/components/campo-pin"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { definirPinNoServidor } from "@/lib/api-pin"
import {
  PIN_TAMANHO_MAXIMO,
  PIN_TAMANHO_MINIMO,
  esquemaDefinirPin,
} from "@/lib/validacoes/pin"

export function EtapaPin({
  aoVoltar,
  aoConcluir,
}: {
  aoVoltar: () => void
  aoConcluir: () => void
}) {
  const [pin, setPin] = useState("")
  const [confirmacaoPin, setConfirmacaoPin] = useState("")
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function aoEnviar(evento: React.FormEvent) {
    evento.preventDefault()

    const validacao = esquemaDefinirPin.safeParse({ pin, confirmacaoPin })
    if (!validacao.success) {
      setErro(validacao.error.issues[0]?.message ?? "PIN inválido.")
      return
    }

    setSalvando(true)
    setErro(null)

    const resultado = await definirPinNoServidor(validacao.data.pin)
    setSalvando(false)

    if (!resultado.sucesso) {
      const mensagem = resultado.erro ?? "Não foi possível salvar o PIN."
      setErro(mensagem)
      toast.error(mensagem)
      return
    }

    toast.success("PIN cadastrado.")
    aoConcluir()
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="pin">Seu PIN</Label>
        <CampoPin
          id="pin"
          value={pin}
          onChange={(valor) => {
            setPin(valor)
            if (erro) setErro(null)
          }}
          disabled={salvando}
          invalido={!!erro}
          autoFocus
          aria-label="PIN"
        />
      </div>

      <div className="flex flex-col items-center gap-2">
        <Label htmlFor="confirmacaoPin">Confirme o PIN</Label>
        <CampoPin
          id="confirmacaoPin"
          value={confirmacaoPin}
          onChange={(valor) => {
            setConfirmacaoPin(valor)
            if (erro) setErro(null)
          }}
          disabled={salvando}
          invalido={!!erro}
          aria-label="Confirmação do PIN"
        />
      </div>

      {erro ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {erro}
        </p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">
          De {PIN_TAMANHO_MINIMO} a {PIN_TAMANHO_MAXIMO} dígitos. Ele autoriza
          cada lançamento de dinheiro — não compartilhe com a equipe.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="sm:flex-1"
          onClick={aoVoltar}
          disabled={salvando}
        >
          <ArrowLeft data-icon="inline-start" />
          Voltar
        </Button>
        <Button type="submit" size="lg" className="sm:flex-1" disabled={salvando}>
          {salvando ? <Loader2 className="animate-spin" /> : null}
          Continuar
          {!salvando ? <ArrowRight data-icon="inline-end" /> : null}
        </Button>
      </div>
    </form>
  )
}
