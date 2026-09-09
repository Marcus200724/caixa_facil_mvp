"use server"

import { criarClienteServidor } from "@/lib/supabase/server"
import { rotaInicialDoPapel } from "@/lib/supabase/middleware"
import { mensagemErroAuth } from "@/lib/erros-supabase"
import { falha, ok, type Resultado } from "@/lib/resultado"
import {
  esquemaCadastro,
  esquemaLogin,
  type DadosCadastro,
  type DadosLogin,
} from "@/lib/validacoes/auth"

export interface ResultadoCadastro {
  /** true quando o projeto exige confirmação de e-mail antes do primeiro acesso. */
  precisaConfirmarEmail: boolean
}

export async function cadastrar(
  entrada: DadosCadastro
): Promise<Resultado<ResultadoCadastro>> {
  const validacao = esquemaCadastro.safeParse(entrada)
  if (!validacao.success) {
    return falha("Dados inválidos. Confira os campos e tente de novo.")
  }

  const { nome, email, senha } = validacao.data
  const supabase = await criarClienteServidor()

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } },
  })

  if (error) return falha(mensagemErroAuth(error))

  // Sem sessão significa que o Supabase exige confirmação de e-mail.
  return ok({ precisaConfirmarEmail: !data.session })
}

export interface ResultadoLogin {
  destino: string
}

export async function entrar(
  entrada: DadosLogin
): Promise<Resultado<ResultadoLogin>> {
  const validacao = esquemaLogin.safeParse(entrada)
  if (!validacao.success) {
    return falha("Informe e-mail e senha para entrar.")
  }

  const { email, senha } = validacao.data
  const supabase = await criarClienteServidor()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  })

  if (error) return falha(mensagemErroAuth(error))
  if (!data.user) return falha("Não foi possível entrar. Tente de novo.")

  const { data: usuario, error: erroUsuario } = await supabase
    .from("usuarios")
    .select("papel, ativo")
    .eq("id", data.user.id)
    .maybeSingle()

  if (erroUsuario) {
    return falha("Não foi possível carregar seus dados. Tente de novo.")
  }

  // Ainda não concluiu o cadastro da empresa.
  if (!usuario) return ok({ destino: "/onboarding" })

  if (!usuario.ativo) {
    await supabase.auth.signOut()
    return falha("Seu acesso foi desativado. Fale com o dono do comércio.")
  }

  return ok({ destino: rotaInicialDoPapel(usuario.papel) })
}
