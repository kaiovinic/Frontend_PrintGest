import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

const authResponse = {
  usuarioId: 1,
  nome: "Maria Atendente",
  email: "maria@print.com",
  perfil: "GERENTE",
  deveTrocarSenha: false,
  accessToken: "local-dev-token-1"
};

const pedidosResponse = [
  {
    id: 1,
    numero: "001024",
    cliente: "Ana Souza",
    tipo: "Orcamento",
    status: "Orcado",
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
    tipo: "Pedido",
    status: "Aberto",
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
    document.documentElement.classList.remove("dark");
  });

  it("exibe a tela de login ao abrir o sistema", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText(/Sistema de gest/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("entra no sistema chamando a API e mostra o dashboard operacional", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Pedidos recentes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo or/i })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("navega para estoque e financeiro pelo menu lateral", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByRole("heading", { name: "Dashboard" });
    await user.click(screen.getByRole("button", { name: "Estoque" }));

    expect(screen.getByRole("heading", { name: "Controle de estoque" })).toBeInTheDocument();
    expect(screen.getByText("Produtos em estoque")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Financeiro" }));

    expect(screen.getByRole("heading", { name: "Financeiro" })).toBeInTheDocument();
    expect(screen.getByText("Controle completo de vendas, entradas, saídas e clientes")).toBeInTheDocument();
  });

  it("alterna entre tema claro e escuro", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(document.documentElement).not.toHaveClass("dark");

    await user.click(screen.getByRole("button", { name: "Alternar tema" }));

    expect(document.documentElement).toHaveClass("dark");
  });

  it("mostra mensagem de erro quando a API recusa o login", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ mensagem: "Email ou senha invalidos." }, 401));

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Email ou senha inválidos.")).toBeInTheDocument();
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
