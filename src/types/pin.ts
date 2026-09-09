/** Contratos das rotas /api/pin/*. Nenhum deles carrega o PIN ou seu hash. */

export interface RespostaValidarPin {
  valido: boolean
  /** Tentativas que ainda restam antes do bloqueio. */
  tentativasRestantes?: number
  bloqueado?: boolean
  mensagem?: string
}

export interface RespostaErroPin {
  erro: string
}
