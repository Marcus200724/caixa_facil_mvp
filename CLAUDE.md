# CLAUDE.md — Caixa Fácil MVP

Contexto persistente do projeto. Leia este arquivo antes de qualquer alteração no código.

---

## 1. O que é o produto

Livro-caixa digital por turno para pequenos comércios (cantinas, lojas de bairro, padarias).

Substitui o caderno de anotações do caixa. O operador registra abertura, sangrias, suprimentos e fechamento do turno. O dono acompanha tudo pelo celular, sem precisar estar na loja.

**Público-alvo:** donos de cantina, loja de bairro e comércio de pequeno porte no Brasil.

### Fronteira do escopo — NÃO ULTRAPASSAR

Este sistema **NÃO é um PDV**. Ele não registra vendas item a item, não controla estoque, não emite cupom fiscal e não integra com SEFAZ.

Ele controla **apenas o fluxo de dinheiro físico da gaveta do caixa**.

Qualquer sugestão de funcionalidade que cruze essa linha deve ser rejeitada ou movida para o roadmap futuro.

---

## 2. Conceitos do domínio

Precisão nesses termos é obrigatória — eles são a linguagem do negócio.

| Termo | Definição |
|---|---|
| **Fundo de caixa** | Dinheiro deixado na gaveta para dar troco. Informado na abertura do turno, sempre **contado fisicamente**, nunca herdado automaticamente. |
| **Sangria** | Retirada de dinheiro da gaveta. **Não é lucro.** É apenas movimentação física de saída. Exige categoria. |
| **Suprimento** | Entrada de dinheiro na gaveta durante o turno (reforço de troco). É o oposto da sangria. |
| **Sessão de caixa** | Unidade central do sistema. Um ciclo completo abertura → fechamento, vinculado a um turno e a um operador. |
| **Turno** | Período de operação configurável pelo dono (ex.: Manhã 7h-13h, Tarde 13h-19h). Cada empresa cria os seus. |
| **Valor contado** | Dinheiro fisicamente contado na gaveta no fechamento. |
| **Diferença** | Valor contado − valor esperado. Só é calculada quando o campo opcional de vendas em dinheiro é preenchido. |

### Regra conceitual crítica

**Sangria nunca deve ser tratada, exibida ou calculada como lucro.** O destino da sangria muda completamente sua natureza contábil:

- Sangria → cofre/banco: dinheiro continua sendo da empresa, só mudou de lugar
- Sangria → pagamento a fornecedor: virou despesa
- Sangria → retirada do proprietário: saiu da empresa

Nenhum desses é lucro. Lucro exige apurar receita menos custo de mercadoria menos despesas — fora do escopo deste MVP.

---

## 3. Decisões de produto já tomadas

Estas decisões foram deliberadas. Não as reverta sem instrução explícita.

**O operador NÃO registra vendas durante o turno.** Ele só lança fundo inicial, sangrias, suprimentos e valor contado no fechamento. Decisão tomada em favor da adoção — registrar venda a venda inviabilizaria o uso real.

**O campo `vendas_dinheiro` existe no fechamento, mas é OPCIONAL.** Se preenchido, o sistema calcula valor esperado e diferença. Se vazio, apenas registra. Mantido no modelo porque é caro adicionar depois.

**Pix e cartão ficam FORA do fluxo do operador.** O operador só tem acesso ao dinheiro físico. Lançamento de outras formas de pagamento, se implementado, fica no painel do dono e é sempre opcional.

**Autenticação em duas camadas.** A empresa faz login normal (email/senha) uma vez no dispositivo. A partir daí, cada ação financeira é autorizada por PIN individual do usuário. Ninguém acessa o sistema apenas com PIN.

---

## 4. Modelo de dados

### empresas
`id`, `nome`, `criado_em`

### usuarios
`id`, `empresa_id`, `nome`, `email` (opcional para operador), `papel` (`dono` | `operador`), `pin_hash`, `ativo`

- PIN de 4-6 dígitos, **sempre hasheado**, nunca em texto puro
- Cada usuário tem PIN próprio — nunca um PIN compartilhado da loja
- Bloqueio temporário após 5 tentativas incorretas consecutivas

### turnos
`id`, `empresa_id`, `nome`, `hora_prevista_abertura`, `hora_prevista_fechamento`, `ativo`

### categorias_movimentacao
`id`, `empresa_id`, `nome`, `tipo` (`sangria` | `suprimento`), `ativo`

Categorias padrão criadas automaticamente no cadastro da empresa:

- **Sangria:** Pagamento a fornecedor, Depósito/cofre, Retirada do proprietário, Outros
- **Suprimento:** Reforço de troco, Aporte do proprietário, Outros

### sessoes_caixa
`id`, `empresa_id`, `turno_id`, `data`, `fundo_inicial`, `aberta_por` (usuario_id), `aberto_em`, `fechada_por` (usuario_id), `fechado_em`, `valor_contado_fechamento`, `vendas_dinheiro` (nullable), `valor_esperado` (calculado, nullable), `diferenca` (calculado, nullable), `observacoes`, `status` (`aberta` | `fechada`)

`aberta_por` e `fechada_por` são campos separados de propósito: é comum o operador abrir e o dono fechar, ou haver troca de operador no meio do turno.

### movimentacoes
`id`, `sessao_id`, `tipo` (`sangria` | `suprimento`), `categoria_id`, `valor`, `descricao`, `autorizado_por` (usuario_id), `criado_em`

---

## 5. Regras de negócio

**Uma sessão aberta por turno.** Bloquear tentativa de abrir sessão em turno que já tem sessão aberta. Evita caixa fantasma.

**Sessão fechada é imutável.** Nunca editar ou sobrescrever uma sessão já fechada. Correções são lançadas como ajuste com justificativa, preservando o histórico original. Em sistema financeiro isso é o que dá credibilidade ao dado.

**Fundo inicial é sempre contado.** O sistema pode sugerir o valor do fechamento anterior, mas quem digita é o operador. Divergência gera aviso visível — a divergência em si é informação valiosa.

**Cálculo da conferência** (apenas quando `vendas_dinheiro` estiver preenchido):

```
valor_esperado = fundo_inicial + vendas_dinheiro − Σ sangrias + Σ suprimentos
diferenca = valor_contado_fechamento − valor_esperado
```

Diferença positiva = sobra. Diferença negativa = quebra/falta.

**Toda categoria de sangria é obrigatória.** Não permitir sangria sem categoria — é o que impede o dono de confundir retirada com lucro.

---

## 6. Regras de PIN

**Exigem PIN** (ações que criam ou alteram registro financeiro):

- Abrir caixa
- Fechar caixa
- Registrar sangria
- Registrar suprimento
- Lançar ajuste em sessão fechada

**Não exigem PIN** (apenas leitura):

- Consultar histórico
- Visualizar sessão aberta
- Painel do dono
- Qualquer tela de relatório

Regra geral: **cria ou altera registro financeiro → pede PIN. Apenas exibe → não pede.**

Comportamento definido: **sempre pedir PIN a cada ação**, sem sessão curta de validade. O volume de lançamentos por turno é baixo e não justifica abrir essa brecha.

---

## 7. Telas

### Operador (apenas 3)

1. **Abrir caixa** — escolhe turno, informa fundo contado, digita PIN, confirma
2. **Caixa aberto** — mostra fundo e movimentações do turno; botões "Registrar sangria" e "Registrar suprimento"
3. **Fechar caixa** — informa valor contado; campo opcional de vendas em dinheiro; se preenchido, exibe a diferença antes de confirmar; digita PIN

### Dono

1. **Painel** — sessões recentes com data, turno, operador, valor contado e diferença (quando houver)
2. **Detalhe da sessão** — linha do tempo completa do turno
3. **Sangrias do período** — filtro por data e categoria, com total. É a tela que responde "quanto saiu de dinheiro esse mês e pra quê". **Carro-chefe do produto.**
4. **Configurações** — turnos, categorias, usuários e PINs

---

## 8. Escopo do MVP

### Dentro

1. Auth + cadastro da empresa
2. Configuração de turnos
3. Cadastro de usuários com PIN
4. Abertura de caixa
5. Registro de sangria e suprimento com categoria
6. Fechamento com campo opcional de vendas em dinheiro
7. Histórico de sessões
8. Tela de sangrias do período

### Fora (roadmap futuro)

- Dashboard com gráficos
- Relatório mensal e DRE
- Exportação (PDF/Excel)
- Lançamento de Pix e cartão pelo dono
- App mobile nativo
- Múltiplas unidades/filiais
- Qualquer funcionalidade de PDV

---

## 9. Stack técnica

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Estilo:** Tailwind CSS v4
- **Componentes:** shadcn/ui (preset Nova — Lucide / Geist), Base UI
- **Animação:** Framer Motion
- **Backend:** Supabase (Postgres + Auth), região South America (São Paulo) — **sem ORM**, queries direto pelo client
- **Deploy:** Vercel (deploy automático a cada push na `main`)
- **Repositório:** GitHub

### Estrutura

- Código-fonte em `src/`
- Componentes shadcn em `src/components/ui/`
- Alias de import: `@/*`

### Clients do Supabase

Autenticação via `@supabase/ssr`. **Não existe mais um client único em `src/lib/supabase.ts`** — o client singleton do `supabase-js` não faz o handshake de cookies e quebraria a sessão em rota autenticada. São três clients, um por ambiente de execução:

| Arquivo | Onde usar |
|---|---|
| `src/lib/supabase/client.ts` | Client Components (`criarClienteBrowser`) |
| `src/lib/supabase/server.ts` | Server Components, Server Actions e Route Handlers (`criarClienteServidor`) |
| `src/lib/supabase/middleware.ts` | Renovação de sessão e proteção de rota (`atualizarSessao`) |

`criarClienteServidor` cria um client novo por requisição — ele carrega a sessão do usuário atual e nunca deve ser reaproveitado entre requisições.

As variáveis de ambiente são lidas por `src/lib/supabase/env.ts`.

### Middleware fica em `src/proxy.ts`

O Next.js 16 renomeou a convenção `middleware.ts` para `proxy.ts` e deprecou a antiga. O arquivo na raiz de `src/` chama-se **`src/proxy.ts`** e exporta `proxy` — não crie um `src/middleware.ts`. A lógica de sessão em si mora em `src/lib/supabase/middleware.ts`.

### Criação de empresa passa por RPC

O cadastro da empresa **não** é feito com inserts diretos em `empresas` e `usuarios`. Ele chama a função `criar_empresa_e_dono(p_nome_empresa, p_nome_usuario, p_email)`, que é `SECURITY DEFINER` e retorna o id da empresa.

O motivo é o RLS: no momento em que a empresa é criada o usuário ainda não pertence a nenhuma, então não há policy capaz de autorizar o insert. A função valida a autenticação, recusa quem já está vinculado e cria os dois registros na mesma transação.

Erros chegam como `P0001` (`RAISE EXCEPTION`) e são traduzidos em `src/app/onboarding/acoes.ts`.

### Variáveis de ambiente

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

O Supabase usa o novo formato de chaves (`publishable` / `secret`), não o formato legado (`anon` / `service_role`).

### Comandos

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run lint     # linter
```

---

## 10. Convenções

**Idioma:** todo texto de interface em português do Brasil. Nomes de tabelas e colunas em português (conforme modelo acima). Nomes de variáveis e funções em inglês.

**Valores monetários:** armazenar em centavos (inteiro) para evitar erro de ponto flutuante. Formatar para exibição em Real (R$) apenas na camada de apresentação.

**Row Level Security:** habilitado no Supabase. Todo acesso a dados deve ser isolado por `empresa_id` — um usuário nunca pode ver dados de outra empresa.

**Datas:** armazenar em UTC, exibir no fuso de São Paulo.

---

## 11. Diretrizes para o assistente

- Antes de sugerir qualquer funcionalidade, verifique a fronteira do escopo (seção 1) e as decisões já tomadas (seção 3)
- Nunca trate sangria como lucro em nenhum cálculo, texto de interface ou relatório
- Nunca permita edição de sessão fechada
- Nunca armazene PIN em texto puro
- Priorize a simplicidade do fluxo do operador — ele usa o sistema em pé, com fila na frente
- Em caso de dúvida sobre escopo, pergunte antes de implementar

