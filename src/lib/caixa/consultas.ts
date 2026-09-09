import "server-only"

import { criarClienteServidor } from "@/lib/supabase/server"
import { obterSessaoUsuario } from "@/lib/usuario-atual"
import { dataDeHojeSaoPaulo, horaAtualSaoPaulo } from "@/lib/datas"
import type {
  CategoriaMovimentacao,
  Papel,
  TipoMovimentacao,
} from "@/types/database"

/**
 * Leitura do estado do caixa para a rota /caixa.
 *
 * Uma única função monta tudo o que a tela precisa, porque a decisão entre os
 * três estados (sem sessão / aberta / fechada hoje) depende de olhar as três
 * coisas juntas.
 */

/** Quantos fechamentos recentes buscar para achar a referência de cada turno. */
const LIMITE_FECHAMENTOS_RECENTES = 50

export interface UsuarioDoCaixa {
  id: string
  nome: string
  papel: Papel
}

export interface TurnoDisponivel {
  id: string
  nome: string
  horaAbertura: string
  horaFechamento: string
  /**
   * Quanto sobrou no último fechamento deste turno. Serve só como referência
   * exibida em texto — o fundo é sempre contado (CLAUDE.md, seção 5), então
   * este valor nunca preenche o campo.
   */
  ultimoFechamento: { valorContado: number; data: string } | null
}

export interface MovimentacaoDetalhada {
  id: string
  tipo: TipoMovimentacao
  valor: number
  descricao: string | null
  criadoEm: string
  categoria: string
  autorizadoPor: string
}

export interface SessaoAbertaDetalhada {
  id: string
  turnoId: string
  turnoNome: string
  data: string
  fundoInicial: number
  abertoEm: string
  abertaPorNome: string
  movimentacoes: MovimentacaoDetalhada[]
}

export interface SessaoFechadaDetalhada {
  id: string
  turnoNome: string
  data: string
  fundoInicial: number
  valorContado: number | null
  vendasDinheiro: number | null
  valorEsperado: number | null
  diferenca: number | null
  observacoes: string | null
  fechadoEm: string | null
  abertaPorNome: string
  fechadaPorNome: string | null
}

export type EstadoDoCaixa =
  | {
      estado: "sem_sessao"
      turnos: TurnoDisponivel[]
      /** Turno cuja janela de horário contém o momento atual, se houver. */
      turnoSugeridoId: string | null
    }
  | { estado: "aberta"; sessao: SessaoAbertaDetalhada }
  | {
      estado: "fechada_hoje"
      sessao: SessaoFechadaDetalhada
      turnos: TurnoDisponivel[]
      turnoSugeridoId: string | null
    }

export interface DadosDoCaixa {
  usuario: UsuarioDoCaixa
  empresaNome: string
  categorias: CategoriaMovimentacao[]
  estado: EstadoDoCaixa
}

/* ---------------- formatos brutos vindos do PostgREST ---------------- */

interface LinhaSessaoAberta {
  id: string
  turno_id: string
  data: string
  fundo_inicial: number
  aberto_em: string
  turnos: { nome: string } | null
  abriu: { nome: string } | null
  movimentacoes: {
    id: string
    tipo: TipoMovimentacao
    valor: number
    descricao: string | null
    criado_em: string
    categorias_movimentacao: { nome: string } | null
    autor: { nome: string } | null
  }[]
}

interface LinhaSessaoFechada {
  id: string
  turno_id: string
  data: string
  fundo_inicial: number
  valor_contado_fechamento: number | null
  vendas_dinheiro: number | null
  valor_esperado: number | null
  diferenca: number | null
  observacoes: string | null
  fechado_em: string | null
  turnos: { nome: string } | null
  abriu: { nome: string } | null
  fechou: { nome: string } | null
}

const SELECT_SESSAO_ABERTA =
  "id, turno_id, data, fundo_inicial, aberto_em, turnos(nome), abriu:usuarios!aberta_por(nome), movimentacoes(id, tipo, valor, descricao, criado_em, categorias_movimentacao(nome), autor:usuarios!autorizado_por(nome))"

const SELECT_SESSAO_FECHADA =
  "id, turno_id, data, fundo_inicial, valor_contado_fechamento, vendas_dinheiro, valor_esperado, diferenca, observacoes, fechado_em, turnos(nome), abriu:usuarios!aberta_por(nome), fechou:usuarios!fechada_por(nome)"

/**
 * Turno cuja janela contém a hora atual. Serve só para pré-selecionar o campo e
 * poupar um clique — o operador pode trocar à vontade.
 *
 * Cobre turno que vira o dia (ex.: 19:00–01:00), quando a janela é a união dos
 * dois trechos em volta da meia-noite.
 */
function acharTurnoDaHora(
  turnos: TurnoDisponivel[],
  horaAtual: string
): string | null {
  const dentro = turnos.find((turno) => {
    const inicio = turno.horaAbertura.slice(0, 5)
    const fim = turno.horaFechamento.slice(0, 5)
    return inicio <= fim
      ? horaAtual >= inicio && horaAtual < fim
      : horaAtual >= inicio || horaAtual < fim
  })
  return dentro?.id ?? null
}

function paraSessaoFechada(linha: LinhaSessaoFechada): SessaoFechadaDetalhada {
  return {
    id: linha.id,
    turnoNome: linha.turnos?.nome ?? "Turno removido",
    data: linha.data,
    fundoInicial: linha.fundo_inicial,
    valorContado: linha.valor_contado_fechamento,
    vendasDinheiro: linha.vendas_dinheiro,
    valorEsperado: linha.valor_esperado,
    diferenca: linha.diferenca,
    observacoes: linha.observacoes,
    fechadoEm: linha.fechado_em,
    abertaPorNome: linha.abriu?.nome ?? "—",
    fechadaPorNome: linha.fechou?.nome ?? null,
  }
}

export async function carregarDadosDoCaixa(): Promise<DadosDoCaixa | null> {
  const sessaoUsuario = await obterSessaoUsuario()
  if (!sessaoUsuario) return null

  const { usuario, empresa } = sessaoUsuario
  const supabase = await criarClienteServidor()

  const [
    { data: turnos },
    { data: categorias },
    { data: aberta },
    { data: fechadas },
  ] = await Promise.all([
    supabase
      .from("turnos")
      .select("id, nome, hora_prevista_abertura, hora_prevista_fechamento")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .order("hora_prevista_abertura", { ascending: true }),

    supabase
      .from("categorias_movimentacao")
      .select("*")
      .eq("empresa_id", empresa.id)
      .eq("ativo", true)
      .order("nome", { ascending: true }),

    // Pela regra "uma sessão aberta por turno" somada ao fluxo da tela (só é
    // possível abrir quando não há nenhuma aberta), no máximo uma existe. O
    // limit(1) é só para nunca estourar caso o banco receba escrita por fora.
    supabase
      .from("sessoes_caixa")
      .select(SELECT_SESSAO_ABERTA)
      .eq("empresa_id", empresa.id)
      .eq("status", "aberta")
      .order("aberto_em", { ascending: false })
      .limit(1)
      .returns<LinhaSessaoAberta[]>(),

    supabase
      .from("sessoes_caixa")
      .select(SELECT_SESSAO_FECHADA)
      .eq("empresa_id", empresa.id)
      .eq("status", "fechada")
      .order("fechado_em", { ascending: false })
      .limit(LIMITE_FECHAMENTOS_RECENTES)
      .returns<LinhaSessaoFechada[]>(),
  ])

  const fechamentos = fechadas ?? []

  // Vem ordenado do mais recente para o mais antigo, então o primeiro
  // fechamento de cada turno já é o último que aconteceu.
  const ultimoPorTurno = new Map<string, { valorContado: number; data: string }>()
  for (const linha of fechamentos) {
    if (ultimoPorTurno.has(linha.turno_id)) continue
    if (linha.valor_contado_fechamento === null) continue
    ultimoPorTurno.set(linha.turno_id, {
      valorContado: linha.valor_contado_fechamento,
      data: linha.data,
    })
  }

  const turnosDisponiveis: TurnoDisponivel[] = (turnos ?? []).map((turno) => ({
    id: turno.id,
    nome: turno.nome,
    horaAbertura: turno.hora_prevista_abertura,
    horaFechamento: turno.hora_prevista_fechamento,
    ultimoFechamento: ultimoPorTurno.get(turno.id) ?? null,
  }))

  const comum = {
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    empresaNome: empresa.nome,
    categorias: categorias ?? [],
  }

  const sessaoAberta = aberta?.[0]
  if (sessaoAberta) {
    return {
      ...comum,
      estado: {
        estado: "aberta",
        sessao: {
          id: sessaoAberta.id,
          turnoId: sessaoAberta.turno_id,
          turnoNome: sessaoAberta.turnos?.nome ?? "Turno removido",
          data: sessaoAberta.data,
          fundoInicial: sessaoAberta.fundo_inicial,
          abertoEm: sessaoAberta.aberto_em,
          abertaPorNome: sessaoAberta.abriu?.nome ?? "—",
          movimentacoes: sessaoAberta.movimentacoes
            .map((movimentacao) => ({
              id: movimentacao.id,
              tipo: movimentacao.tipo,
              valor: movimentacao.valor,
              descricao: movimentacao.descricao,
              criadoEm: movimentacao.criado_em,
              categoria:
                movimentacao.categorias_movimentacao?.nome ?? "Sem categoria",
              autorizadoPor: movimentacao.autor?.nome ?? "—",
            }))
            // Mais recente primeiro. O embed não garante ordem, então ordenamos
            // aqui em vez de confiar no que veio do banco.
            .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
        },
      },
    }
  }

  const turnoSugeridoId = acharTurnoDaHora(
    turnosDisponiveis,
    horaAtualSaoPaulo()
  )

  const hoje = dataDeHojeSaoPaulo()
  const fechadaHoje = fechamentos.find((linha) => linha.data === hoje)

  if (fechadaHoje) {
    return {
      ...comum,
      estado: {
        estado: "fechada_hoje",
        sessao: paraSessaoFechada(fechadaHoje),
        turnos: turnosDisponiveis,
        turnoSugeridoId,
      },
    }
  }

  return {
    ...comum,
    estado: { estado: "sem_sessao", turnos: turnosDisponiveis, turnoSugeridoId },
  }
}
