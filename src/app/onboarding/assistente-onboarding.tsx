"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check } from "lucide-react"

import { EtapaEmpresa } from "./etapa-empresa"
import { EtapaPin } from "./etapa-pin"
import { EtapaTurnos } from "./etapa-turnos"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { DadosTurnos } from "@/lib/validacoes/onboarding"
import { cn } from "cn"

const ETAPAS = [
  {
    numero: 1,
    rotulo: "Empresa",
    titulo: "Dados da empresa",
    descricao: "Como o seu comércio se chama?",
  },
  {
    numero: 2,
    rotulo: "PIN",
    titulo: "Defina seu PIN",
    descricao:
      "Cada lançamento de dinheiro é autorizado por PIN. Este é o seu, pessoal.",
  },
  {
    numero: 3,
    rotulo: "Turnos",
    titulo: "Turnos de operação",
    descricao:
      "Cada sessão de caixa pertence a um turno. Ajuste os horários do seu comércio.",
  },
] as const

export function AssistenteOnboarding({
  etapaInicial,
  nomeEmpresaInicial,
  turnosIniciais,
}: {
  etapaInicial: 1 | 2 | 3
  nomeEmpresaInicial: string
  turnosIniciais: DadosTurnos["turnos"]
}) {
  const [etapa, setEtapa] = useState<1 | 2 | 3>(etapaInicial)
  const [nomeEmpresa, setNomeEmpresa] = useState(nomeEmpresaInicial)

  const etapaAtual = ETAPAS[etapa - 1]

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Etapa {etapa} de {ETAPAS.length}
            </span>
            <ol className="flex items-center gap-1.5">
              {ETAPAS.map((item) => (
                <li
                  key={item.numero}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                    item.numero === etapa
                      ? "bg-primary text-primary-foreground"
                      : item.numero < etapa
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground"
                  )}
                >
                  {item.numero < etapa ? <Check className="size-3" /> : null}
                  {item.rotulo}
                </li>
              ))}
            </ol>
          </div>
          <Progress value={(etapa / ETAPAS.length) * 100} />
        </div>

        <div className="flex flex-col gap-2">
          <CardTitle>{etapaAtual.titulo}</CardTitle>
          <CardDescription>{etapaAtual.descricao}</CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={etapa}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            {etapa === 1 ? (
              <EtapaEmpresa
                nomeInicial={nomeEmpresa}
                aoConcluir={(nome) => {
                  setNomeEmpresa(nome)
                  setEtapa(2)
                }}
              />
            ) : null}

            {etapa === 2 ? (
              <EtapaPin aoVoltar={() => setEtapa(1)} aoConcluir={() => setEtapa(3)} />
            ) : null}

            {etapa === 3 ? (
              <EtapaTurnos
                turnosIniciais={turnosIniciais}
                aoVoltar={() => setEtapa(2)}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
