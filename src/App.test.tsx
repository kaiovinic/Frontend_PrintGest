import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const authResponse = {
  usuarioId: 1,
  nome: "Maria Atendente",
  email: "maria@print.com",
  perfil: "GERENTE",
  deveTrocarSenha: false,
  accessToken: "local-dev-token-1",
  expiresAt: new Date(Date.now() + 3600_000).toISOString()
};

const pedidosResponse = [
  {
    id: 1,
    numero: "001024",
    cliente: "Ana Souza",
    tipo: 0,
    status: 0,
    dataPedido: "2026-05-14",
    dataEntrega: "2026-05-20",
    total: 680,
    valorPago: 0,
    saldoDevedor: 680,
    criadoPor: "Maria"
  },
  {
    id: 2,
    numero: "001025",
    cliente: "Mercado Sol",
    tipo: 1,
    status: 1,
    dataPedido: "2026-05-14",
    dataEntrega: "2026-05-20",
    total: 1280,
    valorPago: 640,
    saldoDevedor: 640,
    criadoPor: "Carlos"
  }
];

describe("PrintGest frontend", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = "";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith("/auth/login")) {
          return jsonResponse(authResponse);
        }

        if (url.endsWith("/pedidos") || url.endsWith("/pedidos/recentes")) {
          return jsonResponse(pedidosResponse);
        }

        return jsonResponse({}, 404);
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
    window.location.hash = "";
    document.documentElement.classList.remove("dark");
  });

  it("exibe a tela de login ao abrir o sistema", () => {
    renderApp();

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText(/Sistema de gest/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("entra no sistema chamando a API e mostra o dashboard operacional", async () => {
    const user = userEvent.setup();
    renderApp();

    await fazerLogin(user);

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Pedidos recentes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo Pedido/i })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("navega para estoque e financeiro pelo menu lateral", async () => {
    const user = userEvent.setup();
    renderApp();

    await fazerLogin(user);
    await screen.findByRole("heading", { name: "Dashboard" });
    await user.click(screen.getByRole("button", { name: "Estoque" }));

    expect(screen.getByRole("heading", { name: "Controle de estoque" })).toBeInTheDocument();
    expect(screen.getByText("Produtos em estoque")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Financeiro" }));

    expect(screen.getByRole("heading", { name: "Financeiro" })).toBeInTheDocument();
  });

  it("alterna entre tema claro e escuro", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Alternar tema" }));

    expect(document.documentElement).toHaveClass("dark");
  });

  it("mostra mensagem de erro quando a API recusa o login", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ mensagem: "Email ou senha invalidos." }, 401));

    const user = userEvent.setup();
    renderApp();

    await fazerLogin(user);

    expect(await screen.findByText("Email ou senha invalidos.")).toBeInTheDocument();
  });

  it("mostra mensagem de usuario bloqueado quando API retorna mensagem especifica", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ mensagem: "Usuário bloqueado. Entre em contato com o administrador." }, 401)
    );

    const user = userEvent.setup();
    renderApp();

    await fazerLogin(user);

    expect(
      await screen.findByText("Usuário bloqueado. Entre em contato com o administrador.")
    ).toBeInTheDocument();
  });

  it("nao permite submeter o formulario com email invalido", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText("E-mail"), "emailinvalido");
    await user.type(screen.getByLabelText("Senha"), "123456789");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Informe um email valido.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("exibe botao de tema e alterna corretamente ao voltar para claro", async () => {
    const user = userEvent.setup();
    renderApp();

    const botaoTema = screen.getByRole("button", { name: "Alternar tema" });
    await user.click(botaoTema);
    expect(document.documentElement).toHaveClass("dark");

    await user.click(botaoTema);
    expect(document.documentElement).not.toHaveClass("dark");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

async function fazerLogin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("E-mail"), "maria@print.com");
  await user.type(screen.getByLabelText("Senha"), "123456789");
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}


