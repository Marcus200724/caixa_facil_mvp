"use client"

import * as React from "react"
import { Loader2, ShieldAlert } from "lucide-react"

import { CampoPin } from "@/components/campo-pin"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { validarPinNoServidor } from "@/lib/api-pin"
import { PIN_TAMANHO_MAXIMO, PIN_TAMANHO_MINIMO } from "@/lib/validacoes/pin"

export interface PinDialogProps {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  /** Usuário que precisa autorizar a ação. */
  usuarioId: string
  /** Ex.: "Confirme para registrar a sangria". */
  titulo: string
  descricao?: string
  rotuloConfirmar?: string
  /**
   * Executado somente depois que o servidor confirma o PIN.
   *
   * Recebe o PIN digitado para que a ação financeira possa reconferi-lo no
   * servidor, na mesma operação que grava. Sem isso a autorização dependeria de
   * o cliente ter recebido `valido: true` num passo anterior, que é justamente
   * o que não pode acontecer.
   *
   * Devolver `{ erro }` mantém o diálogo aberto exibindo a mensagem — é o
   * caminho para recusas de negócio, como turno que já tem caixa aberto.
   */
  aoConfirmar: (pin: string) => ResultadoAutorizacao | Promise<ResultadoAutorizacao>
}

export type ResultadoAutorizacao = void | { erro?: string }

/**
 * Diálogo de autorização por PIN.
 *
 * Toda ação que cria ou altera registro financeiro passa por aqui. O PIN é
 * enviado para /api/pin/validar e conferido no servidor — o cliente nunca vê o
 * hash nem decide sozinho se o PIN está correto.
 */
export function PinDialog({
  aberto,
  aoMudarAberto,
  usuarioId,
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  aoConfirmar,
}: PinDialogProps) {
  const [pin, setPin] = React.useState("")
  const [erro, setErro] = React.useState<string | null>(null)
  const [bloqueado, setBloqueado] = React.useState(false)
  const [carregando, setCarregando] = React.useState(false)

  // Cada abertura começa do zero: nenhum dígito e nenhum erro antigo na tela.
  // Ajuste durante a renderização (e não em um efeito) para o diálogo já abrir
  // limpo, sem um quadro intermediário com o estado da abertura anterior.
  const [abertoAnteriormente, setAbertoAnteriormente] = React.useState(aberto)
  if (aberto !== abertoAnteriormente) {
    setAbertoAnteriormente(aberto)
    if (aberto) {
      setPin("")
      setErro(null)
      setBloqueado(false)
      setCarregando(false)
    }
  }

  const podeEnviar =
    pin.length >= PIN_TAMANHO_MINIMO && !carregando && !bloqueado

  async function enviar(valor: string) {
    if (valor.length < PIN_TAMANHO_MINIMO || carregando || bloqueado) return

    setCarregando(true)
    setErro(null)

    try {
      const resposta = await validarPinNoServidor(usuarioId, valor)

      if (!resposta.valido) {
        setPin("")
        setBloqueado(!!resposta.bloqueado)
        setErro(resposta.mensagem ?? "PIN incorreto.")
        return
      }

      const resultado = await aoConfirmar(valor)

      // Recusa de negócio depois do PIN correto: mantém o diálogo aberto para
      // o operador ler o motivo sem perder o contexto da ação.
      if (resultado && resultado.erro) {
        setPin("")
        setErro(resultado.erro)
        return
      }

      aoMudarAberto(false)
    } catch {
      setPin("")
      setErro("Falha de conexão. Verifique a internet e tente de novo.")
    } finally {
      setCarregando(false)
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(valor) => {
        if (carregando) return
        aoMudarAberto(valor)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>
            {descricao ??
              `Digite seu PIN de ${PIN_TAMANHO_MINIMO} a ${PIN_TAMANHO_MAXIMO} dígitos para autorizar.`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 py-2">
          <CampoPin
            value={pin}
            onChange={(valor) => {
              setPin(valor)
              if (erro) setErro(null)
            }}
            onComplete={enviar}
            disabled={carregando || bloqueado}
            invalido={!!erro}
            autoFocus
            aria-label="PIN de autorização"
          />

          {erro ? (
            <p
              role="alert"
              className="flex items-center gap-1.5 text-center text-xs text-destructive"
            >
              {bloqueado ? <ShieldAlert className="size-3.5" /> : null}
              {erro}
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              {pin.length < PIN_TAMANHO_MINIMO
                ? `Mínimo de ${PIN_TAMANHO_MINIMO} dígitos.`
                : "Pressione Confirmar para autorizar."}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => aoMudarAberto(false)}
            disabled={carregando}
          >
            Cancelar
          </Button>
          <Button onClick={() => enviar(pin)} disabled={!podeEnviar}>
            {carregando ? <Loader2 className="animate-spin" /> : null}
            {rotuloConfirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
