"use server"

import { revalidatePath } from "next/cache"
import type { PostgrestError } from "@supabase/supabase-js"

import { criarClienteServidor } from "@/lib/supabase/server"
import { verificarPin } from "@/lib/pin-servidor"
import { dataDeHojeSaoPaulo } from "@/lib/datas"
import { calcularConferencia, somarMovimentacoes } from "@/lib/caixa/calculos"
import { falha, ok, type Resultado } from "@/lib/resultado"
import {
  esquemaAbrirCaixa,
  esquemaFecharCaixa,
  esquemaRegistrarMovimentacao,
  type EntradaAbrirCaixa,
  type EntradaFecharCaixa,
  type EntradaRegistrarMovimentacao,
} from "@/lib/validacoes/caixa"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"

/**
 * Escritas do ciclo de caixa.
 *
 * Três invariantes valem para todas as ações deste arquivo:
 *
 * 1. O usuário vem SEMPRE da sessão autenticada no servidor. Nenhum id de
 *    usuário enviado pelo cliente é usado para gravar.
 * 2. O PIN é reconferido aqui, na mesma operação que grava. O `valido: true`
 *    que o `<PinDialog />` recebeu antes não autoriza nada sozinho.
 * 3. A sessão de caixa alvo é descoberta no servidor a partir da empresa do
 *    usuário, não recebida pronta do cliente.
 */

interface Autorizado {
  supabase: SupabaseClient<Database>
  usuarioId: string
  empresaId: string
}

/** Autentica, carrega a empresa e reconfere o PIN. */
async function autorizar(
  pin: string
): Promise<{ sucesso: true; contexto: Autorizado } | { sucesso: false; erro: string }> {
  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { sucesso: false, erro: "Sessão expirada. Entre de novo." }

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, empresa_id, ativo")
    .eq("id", user.id)
    .maybeSingle()

  if (error || !usuario) {
    return { sucesso: false, erro: "Não foi possível carregar seus dados." }
  }

  if (!usuario.ativo) {
    return {
      sucesso: false,
      erro: "Seu acesso foi desativado. Fale com o dono do comércio.",
    }
  }

  const verificacao = await verificarPin(supabase, {
    solicitanteId: usuario.id,
    usuarioId: usuario.id,
    pin,
  })

  if (!verificacao.valido) {
    return { sucesso: false, erro: verificacao.mensagem }
  }

  return {
    sucesso: true,
    contexto: {
      supabase,
      usuarioId: usuario.id,
      empresaId: usuario.empresa_id,
    },
  }
}

/** Traduz os erros que o banco levanta nas escritas do caixa. */
function mensagemErroCaixa(erro: PostgrestError, contexto: string): string {
  // 23505 = unique_violation. O índice único impede dois caixas abertos no
  // mesmo turno; é a corrida de dois operadores abrindo ao mesmo tempo.
  if (erro.code === "23505") {
    return "Já existe um caixa aberto neste turno. Atualize a página para vê-lo."
  }

  // P0001 = RAISE EXCEPTION dos triggers, incluindo o que torna a sessão
  // fechada imutável.
  if (erro.code === "P0001") {
    const mensagem = erro.message.toLowerCase()
    if (mensagem.includes("fechad") || mensagem.includes("imut")) {
      return "Este caixa já foi fechado e não pode mais ser alterado."
    }
    return `${contexto}: ${erro.message}`
  }

  if (erro.code === "42501" || erro.code === "PGRST301") {
    return `${contexto}: você não tem permissão para esta operação.`
  }

  if (erro.code === "23503") {
    return `${contexto}: registro relacionado não encontrado. Atualize a página.`
  }

  return `${contexto}. Tente de novo em instantes.`
}

/* ------------------------------------------------------------------ */

export async function abrirCaixa(
  entrada: EntradaAbrirCaixa
): Promise<Resultado<{ sessaoId: string }>> {
  const validacao = esquemaAbrirCaixa.safeParse(entrada)
  if (!validacao.success) {
    return falha(validacao.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const autorizacao = await autorizar(validacao.data.pin)
  if (!autorizacao.sucesso) return falha(autorizacao.erro)

  const { supabase, usuarioId, empresaId } = autorizacao.contexto
  const { turnoId, fundoInicial } = validacao.data

  // O turno tem que ser da empresa do usuário e estar ativo — não basta o
  // cliente ter mandado um uuid qualquer.
  const { data: turno, error: erroTurno } = await supabase
    .from("turnos")
    .select("id")
    .eq("id", turnoId)
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .maybeSingle()

  if (erroTurno) {
    return falha(mensagemErroCaixa(erroTurno, "Não foi possível abrir o caixa"))
  }
  if (!turno) return falha("Turno não encontrado ou desativado.")

  const { data: sessao, error } = await supabase
    .from("sessoes_caixa")
    .insert({
      empresa_id: empresaId,
      turno_id: turnoId,
      data: dataDeHojeSaoPaulo(),
      fundo_inicial: fundoInicial,
      aberta_por: usuarioId,
      status: "aberta",
    })
    .select("id")
    .single()

  if (error) {
    return falha(mensagemErroCaixa(error, "Não foi possível abrir o caixa"))
  }

  revalidatePath("/caixa")
  return ok({ sessaoId: sessao.id })
}

/* ------------------------------------------------------------------ */

export async function registrarMovimentacao(
  entrada: EntradaRegistrarMovimentacao
): Promise<Resultado<{ movimentacaoId: string }>> {
  const validacao = esquemaRegistrarMovimentacao.safeParse(entrada)
  if (!validacao.success) {
    return falha(validacao.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const autorizacao = await autorizar(validacao.data.pin)
  if (!autorizacao.sucesso) return falha(autorizacao.erro)

  const { supabase, usuarioId, empresaId } = autorizacao.contexto
  const { tipo, categoriaId, valor, descricao } = validacao.data

  // A sessão alvo é descoberta aqui, não recebida do cliente.
  const { data: sessao, error: erroSessao } = await supabase
    .from("sessoes_caixa")
    .select("id")
    .eq("empresa_id", empresaId)
    .eq("status", "aberta")
    .order("aberto_em", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (erroSessao) {
    return falha(
      mensagemErroCaixa(erroSessao, "Não foi possível registrar o lançamento")
    )
  }
  if (!sessao) {
    return falha("Não há caixa aberto. Atualize a página.")
  }

  // Categoria obrigatória, da empresa, ativa E do mesmo tipo do lançamento.
  // A checagem de tipo é o que impede uma sangria entrar com categoria de
  // suprimento e sujar o relatório de saídas (CLAUDE.md, seção 5).
  const { data: categoria, error: erroCategoria } = await supabase
    .from("categorias_movimentacao")
    .select("id, tipo")
    .eq("id", categoriaId)
    .eq("empresa_id", empresaId)
    .eq("ativo", true)
    .maybeSingle()

  if (erroCategoria) {
    return falha(
      mensagemErroCaixa(erroCategoria, "Não foi possível registrar o lançamento")
    )
  }
  if (!categoria) return falha("Categoria não encontrada ou desativada.")
  if (categoria.tipo !== tipo) {
    return falha(
      tipo === "sangria"
        ? "Escolha uma categoria de sangria."
        : "Escolha uma categoria de suprimento."
    )
  }

  const { data: movimentacao, error } = await supabase
    .from("movimentacoes")
    .insert({
      sessao_id: sessao.id,
      tipo,
      categoria_id: categoriaId,
      valor,
      descricao: descricao && descricao.length > 0 ? descricao : null,
      // Quem autorizou é quem digitou o PIN — pode ser o dono no turno do
      // operador, e por isso é campo separado de `aberta_por`.
      autorizado_por: usuarioId,
    })
    .select("id")
    .single()

  if (error) {
    return falha(
      mensagemErroCaixa(error, "Não foi possível registrar o lançamento")
    )
  }

  revalidatePath("/caixa")
  return ok({ movimentacaoId: movimentacao.id })
}

/* ------------------------------------------------------------------ */

export async function fecharCaixa(
  entrada: EntradaFecharCaixa
): Promise<Resultado<{ diferenca: number | null }>> {
  const validacao = esquemaFecharCaixa.safeParse(entrada)
  if (!validacao.success) {
    return falha(validacao.error.issues[0]?.message ?? "Dados inválidos.")
  }

  const autorizacao = await autorizar(validacao.data.pin)
  if (!autorizacao.sucesso) return falha(autorizacao.erro)

  const { supabase, usuarioId, empresaId } = autorizacao.contexto
  const { sessaoId, valorContado, vendasDinheiro, observacoes } = validacao.data

  const { data: sessao, error: erroSessao } = await supabase
    .from("sessoes_caixa")
    .select("id, fundo_inicial, status, movimentacoes(tipo, valor)")
    .eq("id", sessaoId)
    .eq("empresa_id", empresaId)
    .maybeSingle<{
      id: string
      fundo_inicial: number
      status: string
      movimentacoes: { tipo: "sangria" | "suprimento"; valor: number }[]
    }>()

  if (erroSessao) {
    return falha(mensagemErroCaixa(erroSessao, "Não foi possível fechar o caixa"))
  }
  if (!sessao) return falha("Caixa não encontrado. Atualize a página.")
  if (sessao.status !== "aberta") {
    return falha("Este caixa já foi fechado e não pode mais ser alterado.")
  }

  // Os totais são recalculados a partir do banco. O que o cliente mostrou na
  // prévia serve para o operador conferir, nunca como fonte do que é gravado.
  const totais = somarMovimentacoes(sessao.movimentacoes)

  const conferencia =
    vendasDinheiro === null
      ? null
      : calcularConferencia(
          sessao.fundo_inicial,
          totais,
          vendasDinheiro,
          valorContado
        )

  const { data: atualizada, error } = await supabase
    .from("sessoes_caixa")
    .update({
      status: "fechada",
      fechada_por: usuarioId,
      fechado_em: new Date().toISOString(),
      valor_contado_fechamento: valorContado,
      vendas_dinheiro: vendasDinheiro,
      valor_esperado: conferencia?.valorEsperado ?? null,
      diferenca: conferencia?.diferenca ?? null,
      observacoes: observacoes && observacoes.length > 0 ? observacoes : null,
    })
    .eq("id", sessao.id)
    // Trava contra fechar duas vezes numa corrida: se outra requisição fechou
    // primeiro, nenhuma linha casa e o update não altera nada.
    .eq("status", "aberta")
    .select("id")
    .maybeSingle()

  if (error) {
    return falha(mensagemErroCaixa(error, "Não foi possível fechar o caixa"))
  }
  if (!atualizada) {
    return falha("Este caixa já foi fechado e não pode mais ser alterado.")
  }

  revalidatePath("/caixa")
  revalidatePath("/painel")
  return ok({ diferenca: conferencia?.diferenca ?? null })
}
