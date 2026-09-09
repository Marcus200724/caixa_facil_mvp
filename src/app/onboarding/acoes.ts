"use server"

import type { PostgrestError } from "@supabase/supabase-js"

import { criarClienteServidor } from "@/lib/supabase/server"
import { mensagemErroBanco } from "@/lib/erros-supabase"
import { falha, ok, type Resultado } from "@/lib/resultado"
import {
  esquemaEmpresa,
  esquemaTurnos,
  type DadosEmpresa,
  type DadosTurnos,
} from "@/lib/validacoes/onboarding"
import type { TabelasInsert } from "@/types/database"

/**
 * Traduz as exceções levantadas por `criar_empresa_e_dono`.
 *
 * A função usa RAISE EXCEPTION, então tudo chega como P0001 e a distinção
 * precisa sair do texto da mensagem.
 */
function mensagemErroCriarEmpresa(erro: PostgrestError): string {
  const mensagem = erro.message.toLowerCase()

  if (mensagem.includes("já vinculado") || mensagem.includes("ja vinculado")) {
    return "Você já tem uma empresa cadastrada. Atualize a página para continuar de onde parou."
  }

  if (mensagem.includes("não autenticado") || mensagem.includes("nao autenticado")) {
    return "Sessão expirada. Entre de novo."
  }

  return mensagemErroBanco(erro, "Não foi possível cadastrar a empresa")
}

/** Deriva um nome de exibição a partir dos metadados do cadastro. */
function nomeDoAuth(metadata: Record<string, unknown>, email?: string): string {
  const nome = metadata.nome
  if (typeof nome === "string" && nome.trim().length > 0) return nome.trim()
  if (email) return email.split("@")[0]
  return "Dono"
}

/**
 * Etapa 1 — cadastra a empresa e cria o registro do dono em `usuarios`.
 *
 * Idempotente: se o dono voltar para esta etapa, apenas renomeia a empresa.
 * As categorias padrão são criadas por trigger no banco.
 */
export async function salvarEmpresa(
  entrada: DadosEmpresa
): Promise<Resultado<{ empresaId: string }>> {
  const validacao = esquemaEmpresa.safeParse(entrada)
  if (!validacao.success) {
    return falha(
      validacao.error.issues[0]?.message ?? "Informe o nome da empresa."
    )
  }

  const { nome } = validacao.data
  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return falha("Sessão expirada. Entre de novo.")

  const { data: usuarioExistente, error: erroConsulta } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .maybeSingle()

  if (erroConsulta) {
    return falha(mensagemErroBanco(erroConsulta, "Não foi possível continuar"))
  }

  // Já passou por esta etapa: só atualiza o nome da empresa.
  if (usuarioExistente) {
    const { error } = await supabase
      .from("empresas")
      .update({ nome })
      .eq("id", usuarioExistente.empresa_id)

    if (error) {
      return falha(mensagemErroBanco(error, "Não foi possível salvar a empresa"))
    }

    return ok({ empresaId: usuarioExistente.empresa_id })
  }

  // A empresa e o registro do dono nascem juntos, numa transação só, via RPC
  // SECURITY DEFINER — o RLS de `empresas` não teria como autorizar este insert,
  // já que o usuário ainda não pertence a empresa nenhuma.
  const { data: empresaId, error: erroRpc } = await supabase.rpc(
    "criar_empresa_e_dono",
    {
      p_nome_empresa: nome,
      p_nome_usuario: nomeDoAuth(user.user_metadata ?? {}, user.email),
      p_email: user.email ?? null,
    }
  )

  if (erroRpc) return falha(mensagemErroCriarEmpresa(erroRpc))

  if (!empresaId) {
    return falha("Não foi possível cadastrar a empresa. Tente de novo.")
  }

  return ok({ empresaId })
}

/**
 * Etapa 3 — cadastra os turnos da empresa.
 *
 * Substitui os turnos criados em uma tentativa anterior do onboarding para o
 * dono poder voltar e corrigir sem duplicar registros.
 */
export async function salvarTurnos(
  entrada: DadosTurnos
): Promise<Resultado<{ quantidade: number }>> {
  const validacao = esquemaTurnos.safeParse(entrada)
  if (!validacao.success) {
    return falha(
      validacao.error.issues[0]?.message ?? "Cadastre pelo menos um turno."
    )
  }

  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return falha("Sessão expirada. Entre de novo.")

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("empresa_id")
    .eq("id", user.id)
    .maybeSingle()

  if (erroUsuario) {
    return falha(mensagemErroBanco(erroUsuario, "Não foi possível continuar"))
  }
  if (!usuario) return falha("Cadastre a empresa antes de criar os turnos.")

  const { error: erroLimpeza } = await supabase
    .from("turnos")
    .delete()
    .eq("empresa_id", usuario.empresa_id)

  if (erroLimpeza) {
    return falha(mensagemErroBanco(erroLimpeza, "Não foi possível salvar os turnos"))
  }

  const novosTurnos: TabelasInsert<"turnos">[] = validacao.data.turnos.map(
    (turno) => ({
      empresa_id: usuario.empresa_id,
      nome: turno.nome,
      hora_prevista_abertura: `${turno.horaPrevistaAbertura}:00`,
      hora_prevista_fechamento: `${turno.horaPrevistaFechamento}:00`,
      ativo: true,
    })
  )

  const { error } = await supabase.from("turnos").insert(novosTurnos)

  if (error) {
    return falha(mensagemErroBanco(error, "Não foi possível salvar os turnos"))
  }

  return ok({ quantidade: novosTurnos.length })
}
