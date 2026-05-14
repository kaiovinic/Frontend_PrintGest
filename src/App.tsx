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

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [page, setPage] = useState<Page>("dashboard");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  if (!isAuthenticated) {
    return <LoginPage theme={theme} toggleTheme={toggleTheme} onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <AppLayout
      page={page}
      setPage={setPage}
      theme={theme}
      toggleTheme={toggleTheme}
      onLogout={() => setIsAuthenticated(false)}
    >
      {page === "dashboard" && <DashboardPage setPage={setPage} />}
      {page === "pedidos" && <PedidosPage setPage={setPage} />}
      {page === "novo-pedido" && <PedidoFormPage />}
      {page === "editar-orcamento" && <EditarOrcamentoPage />}
      {page === "estoque" && <EstoquePage />}
      {page === "financeiro" && <FinanceiroPage />}
      {page === "usuarios" && <UsuariosPage />}
      {page === "logs" && <LogsPage />}
      {page === "conta" && <ContaPage />}
    </AppLayout>
  );
}
