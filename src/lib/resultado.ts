/** Formato padrão de retorno das Server Actions. */
export type Resultado<T = undefined> =
  | { sucesso: true; dados: T }
  | { sucesso: false; erro: string }

export function ok(): Resultado
export function ok<T>(dados: T): Resultado<T>
export function ok<T>(dados?: T): Resultado<T | undefined> {
  return { sucesso: true, dados }
}

export function falha(erro: string): { sucesso: false; erro: string } {
  return { sucesso: false, erro }
}
