import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { AssistenteOnboarding } from "./assistente-onboarding"
import { Marca } from "@/components/marca"
import { criarClienteServidor } from "@/lib/supabase/server"
import type { DadosTurnos } from "@/lib/validacoes/onboarding"

export const metadata: Metadata = {
  title: "Configurar empresa",
}

/** Sugestões editáveis para quem está começando do zero. */
const TURNOS_SUGERIDOS: DadosTurnos["turnos"] = [
  { nome: "Manhã", horaPrevistaAbertura: "07:00", horaPrevistaFechamento: "13:00" },
  { nome: "Tarde", horaPrevistaAbertura: "13:00", horaPrevistaFechamento: "19:00" },
]

/** "07:00:00" → "07:00" */
function paraHoraCurta(hora: string) {
  return hora.slice(0, 5)
}

interface UsuarioOnboarding {
  empresa_id: string
  pin_hash: string | null
  empresas: {
    nome: string
    turnos: {
      nome: string
      hora_prevista_abertura: string
      hora_prevista_fechamento: string
    }[]
  } | null
}

export default async function PaginaOnboarding() {
  const supabase = await criarClienteServidor()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: usuario } = await supabase
    .from("usuarios")
    .select(
      "empresa_id, pin_hash, empresas(nome, turnos(nome, hora_prevista_abertura, hora_prevista_fechamento))"
    )
    .eq("id", user.id)
    .maybeSingle<UsuarioOnboarding>()

  const turnosExistentes = usuario?.empresas?.turnos ?? []

  // Retoma exatamente de onde o dono parou.
  const etapaInicial = !usuario ? 1 : !usuario.pin_hash ? 2 : 3

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <Marca />
      <div className="w-full max-w-md">
        <AssistenteOnboarding
          etapaInicial={etapaInicial}
          nomeEmpresaInicial={usuario?.empresas?.nome ?? ""}
          turnosIniciais={
            turnosExistentes.length > 0
              ? turnosExistentes.map((turno) => ({
                  nome: turno.nome,
                  horaPrevistaAbertura: paraHoraCurta(
                    turno.hora_prevista_abertura
                  ),
                  horaPrevistaFechamento: paraHoraCurta(
                    turno.hora_prevista_fechamento
                  ),
                }))
              : TURNOS_SUGERIDOS
          }
        />
      </div>
    </div>
  )
}
