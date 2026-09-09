"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight } from "lucide-react"

import { CampoDinheiro } from "@/components/campo-dinheiro"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  esquemaFormularioMovimentacao,
  type EntradaFormularioMovimentacao,
  type SaidaFormularioMovimentacao,
} from "@/lib/validacoes/caixa"
import type { CategoriaMovimentacao, TipoMovimentacao } from "@/types/database"

const TEXTOS = {
  sangria: {
    titulo: "Registrar sangria",
    descricao:
      "Retirada de dinheiro da gaveta. A categoria é obrigatória — é ela que diz para onde o dinheiro foi.",
    rotuloCategoria: "Para onde foi o dinheiro",
    placeholderCategoria: "Escolha a categoria da sangria",
  },
  suprimento: {
    titulo: "Registrar suprimento",
    descricao: "Entrada de dinheiro na gaveta durante o turno.",
    rotuloCategoria: "De onde veio o dinheiro",
    placeholderCategoria: "Escolha a categoria do suprimento",
  },
} as const satisfies Record<TipoMovimentacao, unknown>

export function DialogoMovimentacao({
  aberto,
  aoMudarAberto,
  tipo,
  categorias,
  valoresIniciais,
  aoSolicitarAutorizacao,
}: {
  aberto: boolean
  aoMudarAberto: (aberto: boolean) => void
  tipo: TipoMovimentacao
  categorias: CategoriaMovimentacao[]
  valoresIniciais?: EntradaFormularioMovimentacao
  /** Dados válidos: o passo seguinte é o PIN, conduzido pelo componente pai. */
  aoSolicitarAutorizacao: (dados: SaidaFormularioMovimentacao) => void
}) {
  const textos = TEXTOS[tipo]
  const disponiveis = categorias.filter((categoria) => categoria.tipo === tipo)

  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{textos.titulo}</DialogTitle>
          <DialogDescription>{textos.descricao}</DialogDescription>
        </DialogHeader>

        {/* O conteúdo do Dialog desmonta ao fechar, então o formulário sempre
            remonta limpo — ou com os valores preservados quando o operador
            volta do PIN. */}
        <Formulario
          key={tipo}
          tipo={tipo}
          textos={textos}
          categorias={disponiveis}
          valoresIniciais={valoresIniciais}
          aoSolicitarAutorizacao={aoSolicitarAutorizacao}
          aoCancelar={() => aoMudarAberto(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

function Formulario({
  tipo,
  textos,
  categorias,
  valoresIniciais,
  aoSolicitarAutorizacao,
  aoCancelar,
}: {
  tipo: TipoMovimentacao
  textos: (typeof TEXTOS)[TipoMovimentacao]
  categorias: CategoriaMovimentacao[]
  valoresIniciais?: EntradaFormularioMovimentacao
  aoSolicitarAutorizacao: (dados: SaidaFormularioMovimentacao) => void
  aoCancelar: () => void
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    EntradaFormularioMovimentacao,
    unknown,
    SaidaFormularioMovimentacao
  >({
    resolver: zodResolver(esquemaFormularioMovimentacao),
    defaultValues: valoresIniciais ?? {
      categoriaId: categorias.length === 1 ? categorias[0].id : "",
      valor: null,
      descricao: "",
    },
  })

  if (categorias.length === 0) {
    return (
      <p className="rounded-lg bg-muted/60 px-3 py-4 text-sm text-muted-foreground">
        Nenhuma categoria de {tipo} ativa. Peça ao dono para cadastrar uma em
        Configurações.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit(aoSolicitarAutorizacao)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="valor">Valor</Label>
        <Controller
          control={control}
          name="valor"
          render={({ field }) => (
            <CampoDinheiro
              id="valor"
              value={field.value}
              onChange={field.onChange}
              invalido={!!errors.valor}
              autoFocus
            />
          )}
        />
        {errors.valor ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.valor.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="categoriaId">{textos.rotuloCategoria}</Label>
        <Controller
          control={control}
          name="categoriaId"
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={(valor) => field.onChange(valor ?? "")}
            >
              <SelectTrigger
                id="categoriaId"
                aria-invalid={!!errors.categoriaId}
              >
                <SelectValue>
                  {(valor: string) => {
                    const categoria = categorias.find((c) => c.id === valor)
                    return categoria ? (
                      categoria.nome
                    ) : (
                      <span className="text-muted-foreground">
                        {textos.placeholderCategoria}
                      </span>
                    )
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categorias.map((categoria) => (
                  <SelectItem key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoriaId ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.categoriaId.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="descricao">Descrição (opcional)</Label>
        <Textarea
          id="descricao"
          rows={2}
          placeholder="Ex.: pagamento do pão da manhã"
          aria-invalid={!!errors.descricao}
          {...register("descricao")}
        />
        {errors.descricao ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.descricao.message}
          </p>
        ) : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="submit">
          Continuar
          <ArrowRight data-icon="inline-end" />
        </Button>
      </DialogFooter>
    </form>
  )
}
