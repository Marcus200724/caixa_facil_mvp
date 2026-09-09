import { z } from "zod"

export const esquemaCadastro = z
  .object({
    nome: z
      .string()
      .trim()
      .min(3, "Informe seu nome completo.")
      .max(120, "Nome muito longo."),
    email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
    senha: z.string().min(8, "A senha deve ter no mínimo 8 caracteres."),
    confirmacaoSenha: z.string(),
  })
  .refine((dados) => dados.senha === dados.confirmacaoSenha, {
    message: "As senhas não conferem.",
    path: ["confirmacaoSenha"],
  })

export type DadosCadastro = z.infer<typeof esquemaCadastro>

export const esquemaLogin = z.object({
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  senha: z.string().min(1, "Informe sua senha."),
})

export type DadosLogin = z.infer<typeof esquemaLogin>
