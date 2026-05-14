import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("PrintGest frontend", () => {
  it("exibe a tela de login ao abrir o sistema", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
    expect(screen.getByText("Sistema de gestão financeira, pedidos e estoque.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("entra no sistema e mostra o dashboard operacional", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Pedidos recentes")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo orçamento/i })).toBeInTheDocument();
  });

  it("navega para estoque e financeiro pelo menu lateral", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "Entrar" }));
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
});
