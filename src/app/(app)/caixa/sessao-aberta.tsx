"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, ArrowUpRight, Clock, Lock, User } from "lucide-react"
import { toast } from "sonner"

import { fecharCaixa, registrarMovimentacao } from "./acoes"
import { DialogoFechamento } from "./dialogo-fechamento"
import { DialogoMovimentacao } from "./dialogo-movimentacao"
import { ListaMovimentacoes } from "./lista-movimentacoes"
import { ResumoTurno } from "./resumo-turno"
import { PinDialog } from "@/components/pin-dialog"
import { Button } from "@/components/ui/button"
import { somarMovimentacoes } from "@/lib/caixa/calculos"
import type { SessaoAbertaDetalhada } from "@/lib/caixa/consultas"
import { formatarHora } from "@/lib/datas"
import type {
  SaidaFormularioFechamento,
  SaidaFormularioMovimentacao,
} from "@/lib/validacoes/caixa"
import type { CategoriaMovimentacao, TipoMovimentacao } from "@/types/database"

/**
 * Fluxo da tela: cada ação financeira passa pelo formulário e depois pelo PIN.
 *
 * Guardar os dados preenchidos na fase de PIN permite voltar ao formulário
 * intacto se o operador cancelar ou errar o PIN — digitar tudo de novo com fila
 * na frente seria inaceitável.
 */
type Fluxo =
  | { fase: "nenhum" }
  | {
      fase: "movimentacao"
      tipo: TipoMovimentacao
      valores?: SaidaFormularioMovimentacao
    }
  | {
      fase: "pin_movimentacao"
      tipo: TipoMovimentacao
      dados: SaidaFormularioMovimentacao
    }
  | { fase: "fechamento"; valores?: SaidaFormularioFechamento }
  | { fase: "pin_fechamento"; dados: SaidaFormularioFechamento }

export function SessaoAberta({
  sessao,
  categorias,
  usuarioId,
}: {
  sessao: SessaoAbertaDetalhada
  categorias: CategoriaMovimentacao[]
  usuarioId: string
}) {
  const router = useRouter()
  const [fluxo, setFluxo] = useState<Fluxo>({ fase: "nenhum" })

  const totais = somarMovimentacoes(sessao.movimentacoes)

  /**
   * Fechar o diálogo de PIN devolve o operador ao formulário com o que já foi
   * digitado. Se a ação já concluiu, o fluxo está em "nenhum" e nada reabre.
   */
  function fecharPin() {
    setFluxo((atual) => {
      if (atual.fase === "pin_movimentacao") {
        return { fase: "movimentacao", tipo: atual.tipo, valores: atual.dados }
      }
      if (atual.fase === "pin_fechamento") {
        return { fase: "fechamento", valores: atual.dados }
      }
      return atual
    })
  }

  async function confirmarMovimentacao(pin: string) {
    if (fluxo.fase !== "pin_movimentacao") return
    const { tipo, dados } = fluxo

    const resultado = await registrarMovimentacao({
      tipo,
      categoriaId: dados.categoriaId,
      valor: dados.valor,
      descricao: dados.descricao || null,
      pin,
    })

    if (!resultado.sucesso) return { erro: resultado.erro }

    setFluxo({ fase: "nenhum" })
    toast.success(
      tipo === "sangria" ? "Sangria registrada." : "Suprimento registrado."
    )
    router.refresh()
  }

  async function confirmarFechamento(pin: string) {
    if (fluxo.fase !== "pin_fechamento") return
    const { dados } = fluxo

    const resultado = await fecharCaixa({
      sessaoId: sessao.id,
      valorContado: dados.valorContado,
      vendasDinheiro: dados.vendasDinheiro,
      observacoes: dados.observacoes || null,
      pin,
    })

    if (!resultado.sucesso) return { erro: resultado.erro }

    setFluxo({ fase: "nenhum" })
    toast.success("Caixa fechado.")
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {sessao.turnoNome}
          </h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              Aberto às {formatarHora(sessao.abertoEm)}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" />
              por {sessao.abertaPorNome}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setFluxo({ fase: "movimentacao", tipo: "sangria" })}
          >
            <ArrowDownLeft data-icon="inline-start" />
            Registrar sangria
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() =>
              setFluxo({ fase: "movimentacao", tipo: "suprimento" })
            }
          >
            <ArrowUpRight data-icon="inline-start" />
            Registrar suprimento
          </Button>
          <Button size="lg" onClick={() => setFluxo({ fase: "fechamento" })}>
            <Lock data-icon="inline-start" />
            Fechar caixa
          </Button>
        </div>
      </header>

      <ResumoTurno fundoInicial={sessao.fundoInicial} totais={totais} />

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Movimentações do turno
          {sessao.movimentacoes.length > 0
            ? ` (${sessao.movimentacoes.length})`
            : ""}
        </h2>
        <ListaMovimentacoes movimentacoes={sessao.movimentacoes} />
      </section>

      <DialogoMovimentacao
        aberto={fluxo.fase === "movimentacao"}
        aoMudarAberto={(aberto) => {
          if (!aberto) setFluxo({ fase: "nenhum" })
        }}
        tipo={fluxo.fase === "movimentacao" ? fluxo.tipo : "sangria"}
        categorias={categorias}
        valoresIniciais={
          fluxo.fase === "movimentacao" ? fluxo.valores : undefined
        }
        aoSolicitarAutorizacao={(dados) => {
          if (fluxo.fase !== "movimentacao") return
          setFluxo({ fase: "pin_movimentacao", tipo: fluxo.tipo, dados })
        }}
      />

      <DialogoFechamento
        aberto={fluxo.fase === "fechamento"}
        aoMudarAberto={(aberto) => {
          if (!aberto) setFluxo({ fase: "nenhum" })
        }}
        turnoNome={sessao.turnoNome}
        fundoInicial={sessao.fundoInicial}
        totais={totais}
        valoresIniciais={fluxo.fase === "fechamento" ? fluxo.valores : undefined}
        aoSolicitarAutorizacao={(dados) =>
          setFluxo({ fase: "pin_fechamento", dados })
        }
      />

      <PinDialog
        aberto={fluxo.fase === "pin_movimentacao"}
        aoMudarAberto={(aberto) => {
          if (!aberto) fecharPin()
        }}
        usuarioId={usuarioId}
        titulo={
          fluxo.fase === "pin_movimentacao" && fluxo.tipo === "suprimento"
            ? "Confirme para registrar o suprimento"
            : "Confirme para registrar a sangria"
        }
        rotuloConfirmar="Registrar"
        aoConfirmar={confirmarMovimentacao}
      />

      <PinDialog
        aberto={fluxo.fase === "pin_fechamento"}
        aoMudarAberto={(aberto) => {
          if (!aberto) fecharPin()
        }}
        usuarioId={usuarioId}
        titulo="Confirme para fechar o caixa"
        descricao="O fechamento é definitivo e não poderá ser editado."
        rotuloConfirmar="Fechar caixa"
        aoConfirmar={confirmarFechamento}
      />
    </div>
  )
}
