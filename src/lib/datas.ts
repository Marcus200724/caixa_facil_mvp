/**
 * Datas e horários.
 *
 * Convenção do projeto (CLAUDE.md, seção 10): armazenar em UTC, exibir no fuso
 * de São Paulo. O campo `sessoes_caixa.data` é o dia de operação do comércio,
 * então tem que ser o dia em São Paulo — não o dia UTC, que já virou às 21h.
 */

export const FUSO_SAO_PAULO = "America/Sao_Paulo"

/** Data de hoje em São Paulo, no formato YYYY-MM-DD aceito por uma coluna date. */
export function dataDeHojeSaoPaulo(agora = new Date()): string {
  const formatador = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_SAO_PAULO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return formatador.format(agora)
}

/** Hora de agora em São Paulo, como "HH:MM", comparável com os horários dos turnos. */
export function horaAtualSaoPaulo(agora = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO_SAO_PAULO,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(agora)
}

/** "2026-09-08T13:45:00Z" → "13:45" (hora de São Paulo). */
export function formatarHora(instanteIso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_SAO_PAULO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(instanteIso))
}

/** "2026-09-08T13:45:00Z" → "08/09 às 13:45" (hora de São Paulo). */
export function formatarDataHora(instanteIso: string): string {
  const data = new Date(instanteIso)
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_SAO_PAULO,
    day: "2-digit",
    month: "2-digit",
  }).format(data)
  return `${dia} às ${formatarHora(instanteIso)}`
}

/** "2026-09-08" → "08/09/2026". Para colunas `date`, sem conversão de fuso. */
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split("-")
  return `${dia}/${mes}/${ano}`
}

/** "07:00:00" → "07:00" */
export function formatarHoraDoTurno(hora: string): string {
  return hora.slice(0, 5)
}
