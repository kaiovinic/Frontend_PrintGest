# PrintGest — Frontend

Interface web do sistema de gestão para gráficas **PrintGest**. Construída com React 19, TypeScript e Vite, com gerenciamento de estado do servidor via TanStack Query e validação de formulários com React Hook Form + Zod.

---

## Tecnologias

| | |
|---|---|
| **Framework** | React 19 + TypeScript 5.7 |
| **Build tool** | Vite 6 |
| **Estado servidor** | TanStack Query 5 |
| **Formulários** | React Hook Form 7 + Zod 4 |
| **Estilização** | Tailwind CSS 3 |
| **Ícones** | Lucide React |
| **Gráficos** | Recharts 3 |
| **Testes** | Vitest 4 + Testing Library |

---

## Pré-requisitos

- [Node.js 20+](https://nodejs.org/)
- API PrintGest em execução ([instruções](../Api_PrintGest/README.md))

---

## Configuração

Copie o arquivo de exemplo e ajuste a URL da API:

```bash
cp .env.example .env.local
```

`.env.local`:

```env
VITE_API_URL=https://localhost:7131/api
```

---

## Como executar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173` no navegador. O Vite abre automaticamente.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento com hot reload |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build de produção localmente |
| `npm run lint` | Executa o ESLint |
| `npm run test` | Executa os testes uma vez |
| `npm run test:watch` | Executa os testes em modo watch |

---

## Estrutura do projeto

```
src/
├── components/        # Componentes reutilizáveis (UI, layout, inputs)
├── pages/             # Uma página por rota da aplicação
│   ├── DashboardPage
│   ├── PedidosPage
│   ├── PedidoFormPage
│   ├── PedidoReciboPage
│   ├── EditarOrcamentoPage
│   ├── EstoquePage
│   ├── CaixaPage
│   ├── FinanceiroPage
│   ├── UsuariosPage
│   ├── LogsPage
│   └── ContaPage
├── services/          # Funções de chamada à API (fetch + tipagem)
├── hooks/             # Custom hooks que encapsulam queries e mutations
├── lib/               # Utilitários, helpers, cn()
├── test/              # Setup do Vitest
├── App.tsx            # Roteamento hash-based + estado de autenticação
└── main.tsx           # Entry point — monta React + QueryClient
```

---

## Páginas e rotas

O roteamento é hash-based (`window.location.hash`):

| Hash | Página | Perfil mínimo |
|---|---|---|
| `#/dashboard` | Dashboard com gráficos e resumos | Todos |
| `#/pedidos` | Listagem de pedidos e orçamentos | Todos |
| `#/novo-pedido` | Formulário de criação | Todos |
| `#/editar-orcamento` | Edição de orçamento | Todos |
| `#/recibo-pedido` | Visualização do recibo | Todos |
| `#/estoque` | Controle de estoque | Todos |
| `#/caixa` | Movimentações de caixa | Todos |
| `#/financeiro` | Painel financeiro | Todos |
| `#/usuarios` | Gestão de usuários | ADMIN |
| `#/logs` | Auditoria de operações | ADMIN / GERENTE |
| `#/conta` | Perfil e troca de senha | Todos |

---

## Autenticação

O fluxo de autenticação é gerenciado em `App.tsx`:

1. Usuário faz login em `LoginPage` → API retorna JWT com `expiresAt`
2. Token e dados do usuário são salvos em `sessionStorage` (`printgest:user`)
3. Todas as requisições à API enviam `Authorization: Bearer <token>`
4. Um `setInterval` de 60 segundos verifica a expiração do token
5. Respostas `401` da API disparam o evento customizado `auth:unauthorized`
6. Tanto a expiração quanto o evento `401` executam logout automático

**Página atual** é persistida em `localStorage` (`printgest:page`) para sobreviver a recarregamentos de página.

---

## Temas

Suporte a tema claro e escuro via toggle no layout principal. O tema é controlado pela classe `dark` no `document.documentElement` (padrão do Tailwind com `darkMode: ["class"]`).

---

## Decisões de arquitetura

- **Hash routing** — sem dependência de configuração de servidor web; funciona em qualquer host estático.
- **TanStack Query** — gerencia cache, refetch, estados de loading/error de todas as chamadas à API.
- **React Hook Form + Zod** — validação declarativa no cliente; os mesmos schemas tipam os DTOs enviados à API.
- **sessionStorage para auth** — token não persiste entre sessões do navegador (mais seguro que localStorage).
- **Evento `auth:unauthorized`** — permite que qualquer service dispare logout sem acoplar à lógica de `App.tsx`.
- **Alias `@`** — aponta para `src/`; use `@/components/...` em vez de caminhos relativos.
