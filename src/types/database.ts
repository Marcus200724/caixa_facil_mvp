/**
 * Tipos do banco de dados do Caixa Fácil.
 *
 * Reflete o schema já criado no Supabase (ver CLAUDE.md, seção 4).
 * Todos os valores monetários são inteiros representando CENTAVOS.
 *
 * `Relationships` descreve as chaves estrangeiras para o postgrest-js — é o que
 * permite tipar consultas com embed, como `usuarios(empresas(turnos(id)))`.
 */

export type Papel = "dono" | "operador"
export type TipoMovimentacao = "sangria" | "suprimento"
export type StatusSessao = "aberta" | "fechada"

export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          nome: string
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          criado_em?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          /** Mesmo id do usuário no Supabase Auth (auth.users.id). */
          id: string
          empresa_id: string
          nome: string
          email: string | null
          papel: Papel
          pin_hash: string | null
          ativo: boolean
          tentativas_pin: number
          bloqueado_ate: string | null
          criado_em: string
        }
        Insert: {
          id: string
          empresa_id: string
          nome: string
          email?: string | null
          papel: Papel
          pin_hash?: string | null
          ativo?: boolean
          tentativas_pin?: number
          bloqueado_ate?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          email?: string | null
          papel?: Papel
          pin_hash?: string | null
          ativo?: boolean
          tentativas_pin?: number
          bloqueado_ate?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      turnos: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          /** Formato HH:MM:SS (time). */
          hora_prevista_abertura: string
          /** Formato HH:MM:SS (time). */
          hora_prevista_fechamento: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          hora_prevista_abertura: string
          hora_prevista_fechamento: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          hora_prevista_abertura?: string
          hora_prevista_fechamento?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "turnos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_movimentacao: {
        Row: {
          id: string
          empresa_id: string
          nome: string
          tipo: TipoMovimentacao
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          empresa_id: string
          nome: string
          tipo: TipoMovimentacao
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          empresa_id?: string
          nome?: string
          tipo?: TipoMovimentacao
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_movimentacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_caixa: {
        Row: {
          id: string
          empresa_id: string
          turno_id: string
          /** Data do turno, formato YYYY-MM-DD. */
          data: string
          /** Centavos. */
          fundo_inicial: number
          aberta_por: string
          aberto_em: string
          fechada_por: string | null
          fechado_em: string | null
          /** Centavos. */
          valor_contado_fechamento: number | null
          /** Centavos. Opcional — ver CLAUDE.md, seção 3. */
          vendas_dinheiro: number | null
          /** Centavos. Calculado apenas quando vendas_dinheiro é informado. */
          valor_esperado: number | null
          /** Centavos. valor_contado_fechamento menos valor_esperado. */
          diferenca: number | null
          observacoes: string | null
          status: StatusSessao
        }
        Insert: {
          id?: string
          empresa_id: string
          turno_id: string
          data: string
          fundo_inicial: number
          aberta_por: string
          aberto_em?: string
          fechada_por?: string | null
          fechado_em?: string | null
          valor_contado_fechamento?: number | null
          vendas_dinheiro?: number | null
          valor_esperado?: number | null
          diferenca?: number | null
          observacoes?: string | null
          status?: StatusSessao
        }
        Update: {
          id?: string
          empresa_id?: string
          turno_id?: string
          data?: string
          fundo_inicial?: number
          aberta_por?: string
          aberto_em?: string
          fechada_por?: string | null
          fechado_em?: string | null
          valor_contado_fechamento?: number | null
          vendas_dinheiro?: number | null
          valor_esperado?: number | null
          diferenca?: number | null
          observacoes?: string | null
          status?: StatusSessao
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_caixa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_caixa_turno_id_fkey"
            columns: ["turno_id"]
            isOneToOne: false
            referencedRelation: "turnos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_caixa_aberta_por_fkey"
            columns: ["aberta_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessoes_caixa_fechada_por_fkey"
            columns: ["fechada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          id: string
          sessao_id: string
          tipo: TipoMovimentacao
          categoria_id: string
          /** Centavos. Sempre positivo — o sinal é dado pelo campo `tipo`. */
          valor: number
          descricao: string | null
          autorizado_por: string
          criado_em: string
        }
        Insert: {
          id?: string
          sessao_id: string
          tipo: TipoMovimentacao
          categoria_id: string
          valor: number
          descricao?: string | null
          autorizado_por: string
          criado_em?: string
        }
        Update: {
          id?: string
          sessao_id?: string
          tipo?: TipoMovimentacao
          categoria_id?: string
          valor?: number
          descricao?: string | null
          autorizado_por?: string
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_caixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias_movimentacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_autorizado_por_fkey"
            columns: ["autorizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<never, never>
    Functions: {
      /**
       * Cria a empresa e o registro do dono em `usuarios` numa única transação.
       *
       * SECURITY DEFINER: contorna o RLS de `empresas`, que não teria como
       * autorizar o insert (no momento da criação o usuário ainda não pertence
       * a empresa nenhuma). A própria função valida a autenticação e recusa
       * quem já está vinculado. Retorna o id da empresa criada.
       */
      criar_empresa_e_dono: {
        Args: {
          p_nome_empresa: string
          p_nome_usuario: string
          p_email: string | null
        }
        Returns: string
      }
    }
    Enums: {
      papel: Papel
      tipo_movimentacao: TipoMovimentacao
      status_sessao: StatusSessao
    }
    CompositeTypes: Record<never, never>
  }
}

type PublicSchema = Database["public"]

export type Tabelas<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TabelasInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TabelasUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]

export type Empresa = Tabelas<"empresas">
export type Usuario = Tabelas<"usuarios">
export type Turno = Tabelas<"turnos">
export type CategoriaMovimentacao = Tabelas<"categorias_movimentacao">
export type SessaoCaixa = Tabelas<"sessoes_caixa">
export type Movimentacao = Tabelas<"movimentacoes">
