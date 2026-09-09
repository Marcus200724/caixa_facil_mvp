import type { RespostaValidarPin } from "@/types/pin"

async function lerErro(resposta: Response, padrao: string): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { erro?: string }
    return corpo.erro ?? padrao
  } catch {
    return padrao
  }
}

/** Chama POST /api/pin/definir. O PIN só trafega dentro desta requisição. */
export async function definirPinNoServidor(
  pin: string
): Promise<{ sucesso: boolean; erro?: string }> {
  const resposta = await fetch("/api/pin/definir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  })

  if (!resposta.ok) {
    return {
      sucesso: false,
      erro: await lerErro(resposta, "Não foi possível salvar o PIN."),
    }
  }

  return { sucesso: true }
}

/** Chama POST /api/pin/validar. A validação acontece só no servidor. */
export async function validarPinNoServidor(
  usuarioId: string,
  pin: string
): Promise<RespostaValidarPin> {
  const resposta = await fetch("/api/pin/validar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuarioId, pin }),
  })

  if (!resposta.ok) {
    return {
      valido: false,
      mensagem: await lerErro(resposta, "Não foi possível validar o PIN."),
    }
  }

  return (await resposta.json()) as RespostaValidarPin
}
