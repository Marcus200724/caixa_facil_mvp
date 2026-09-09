import { z } from "zod"

export const esquemaEmpresa = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome da empresa.")
    .max(120, "Nome muito longo."),
})

export type DadosEmpresa = z.infer<typeof esquemaEmpresa>

const horario = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato HH:MM.")

export const esquemaTurno = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "Informe o nome do turno.")
    .max(60, "Nome muito longo."),
  horaPrevistaAbertura: horario,
  horaPrevistaFechamento: horario,
})

export type DadosTurno = z.infer<typeof esquemaTurno>

export const esquemaTurnos = z.object({
  turnos: z.array(esquemaTurno).min(1, "Cadastre pelo menos um turno."),
})

export type DadosTurnos = z.infer<typeof esquemaTurnos>
