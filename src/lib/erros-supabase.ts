import type { AuthError, PostgrestError } from "@supabase/supabase-js"

const MENSAGENS_AUTH: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed:
    "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail.",
  email_exists: "Já existe uma conta com este e-mail.",
  weak_password: "Senha muito fraca. Use no mínimo 8 caracteres.",
  over_email_send_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit:
    "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
  signup_disabled: "O cadastro de novas contas está desativado no momento.",
  validation_failed: "Dados inválidos. Confira os campos e tente de novo.",
}

/** Traduz erros do Supabase Auth para mensagens em português. */
export function mensagemErroAuth(erro: AuthError): string {
  if (erro.code && MENSAGENS_AUTH[erro.code]) return MENSAGENS_AUTH[erro.code]

  if (erro.status === 400 && /invalid login/i.test(erro.message)) {
    return "E-mail ou senha incorretos."
  }
  if (/already registered/i.test(erro.message)) {
    return "Já existe uma conta com este e-mail."
  }

  return "Não foi possível concluir a operação. Tente de novo em instantes."
}

/** Traduz erros de banco (PostgREST) para mensagens amigáveis. */
export function mensagemErroBanco(
  erro: PostgrestError,
  contexto: string
): string {
  // 23505 = unique_violation
  if (erro.code === "23505") {
    return `${contexto}: este registro já existe.`
  }
  // 42501 = insufficient_privilege / bloqueio de Row Level Security
  if (erro.code === "42501" || erro.code === "PGRST301") {
    return `${contexto}: você não tem permissão para esta operação.`
  }
  return `${contexto}. Tente de novo em instantes.`
}
