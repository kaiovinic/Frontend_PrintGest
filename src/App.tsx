import { useEffect, useState } from "react";
import { AppLayout, type Page } from "@/components/AppLayout";
import { ContaPage } from "@/pages/ContaPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EditarOrcamentoPage } from "@/pages/EditarOrcamentoPage";
import { EstoquePage } from "@/pages/EstoquePage";
import { FinanceiroPage } from "@/pages/FinanceiroPage";
import { LoginPage } from "@/pages/LoginPage";
import { LogsPage } from "@/pages/LogsPage";
import { PedidoFormPage } from "@/pages/PedidoFormPage";
import { PedidosPage } from "@/pages/PedidosPage";
import { UsuariosPage } from "@/pages/UsuariosPage";
import type { AuthUser } from "@/services/authService";
import type { PedidoResumo } from "@/services/pedidoService";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [page, setCurrentPage] = useState<Page>("dashboard");
  const [history, setHistory] = useState<Page[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<PedidoResumo | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  function setPage(nextPage: Page, pedido?: PedidoResumo | null) {
    setHistory((current) => [...current, page]);
    setSelectedPedido(pedido ?? null);
    setCurrentPage(nextPage);
  }

  function onBack() {
    setHistory((current) => {
      const previous = current[current.length - 1];
      if (!previous) {
        return current;
      }

      setSelectedPedido(null);
      setCurrentPage(previous);
      return current.slice(0, -1);
    });
  }

  function handleLogin(authUser: AuthUser) {
    setUser(authUser);
    setCurrentPage("dashboard");
    setHistory([]);
  }

  function handleLogout() {
    setUser(null);
    setCurrentPage("dashboard");
    setHistory([]);
    setSelectedPedido(null);
  }

  if (!user) {
    return <LoginPage theme={theme} toggleTheme={toggleTheme} onLogin={handleLogin} />;
  }

  return (
    <AppLayout
      page={page}
      setPage={setPage}
      canGoBack={history.length > 0}
      onBack={onBack}
      theme={theme}
      toggleTheme={toggleTheme}
      user={user}
      onLogout={handleLogout}
    >
      {page === "dashboard" && <DashboardPage setPage={setPage} />}
      {page === "pedidos" && <PedidosPage setPage={setPage} />}
      {page === "novo-pedido" && <PedidoFormPage pedido={selectedPedido} usuarioId={user.usuarioId} />}
      {page === "editar-orcamento" && <EditarOrcamentoPage />}
      {page === "estoque" && <EstoquePage />}
      {page === "financeiro" && <FinanceiroPage />}
      {page === "usuarios" && <UsuariosPage />}
      {page === "logs" && <LogsPage />}
      {page === "conta" && <ContaPage user={user} />}
    </AppLayout>
  );
}
