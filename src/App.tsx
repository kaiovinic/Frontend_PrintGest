import { useEffect, useState } from "react";
import { AppLayout, type Page } from "@/components/AppLayout";
import { CaixaPage } from "@/pages/CaixaPage";
import { ContaPage } from "@/pages/ContaPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EditarOrcamentoPage } from "@/pages/EditarOrcamentoPage";
import { EstoquePage } from "@/pages/EstoquePage";
import { FinanceiroPage } from "@/pages/FinanceiroPage";
import { LoginPage } from "@/pages/LoginPage";
import { LogsPage } from "@/pages/LogsPage";
import { PedidoFormPage } from "@/pages/PedidoFormPage";
import { PedidoReciboPage } from "@/pages/PedidoReciboPage";
import { PedidosPage } from "@/pages/PedidosPage";
import { UsuariosPage } from "@/pages/UsuariosPage";
import type { AuthUser } from "@/services/authService";
import type { PedidoResumo } from "@/services/pedidoService";

const USER_STORAGE_KEY = "printgest:user";
const PAGE_STORAGE_KEY = "printgest:page";
const PEDIDO_STORAGE_KEY = "printgest:selectedPedido";

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState<AuthUser | null>(() => readJson<AuthUser>(USER_STORAGE_KEY));
  const [page, setCurrentPage] = useState<Page>(() => getInitialPage());
  const [history, setHistory] = useState<Page[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<PedidoResumo | null>(() => readJson<PedidoResumo>(PEDIDO_STORAGE_KEY));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => {
      const hashPage = pageFromHash();
      if (hashPage) {
        setCurrentPage(hashPage);
        localStorage.setItem(PAGE_STORAGE_KEY, hashPage);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  function setPage(nextPage: Page, pedido?: PedidoResumo | null) {
    setHistory((current) => [...current, page]);
    setSelectedPedido(pedido ?? null);
    setCurrentPage(nextPage);
    localStorage.setItem(PAGE_STORAGE_KEY, nextPage);
    window.location.hash = `/${nextPage}`;

    if (pedido) {
      sessionStorage.setItem(PEDIDO_STORAGE_KEY, JSON.stringify(pedido));
    } else {
      sessionStorage.removeItem(PEDIDO_STORAGE_KEY);
    }
  }

  function onBack() {
    setHistory((current) => {
      const previous = current[current.length - 1];
      if (!previous) {
        return current;
      }

      setSelectedPedido(null);
      setCurrentPage(previous);
      localStorage.setItem(PAGE_STORAGE_KEY, previous);
      window.location.hash = `/${previous}`;
      sessionStorage.removeItem(PEDIDO_STORAGE_KEY);
      return current.slice(0, -1);
    });
  }

  function handleLogin(authUser: AuthUser) {
    setUser(authUser);
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(authUser));
    setCurrentPage("dashboard");
    localStorage.setItem(PAGE_STORAGE_KEY, "dashboard");
    window.location.hash = "/dashboard";
    setHistory([]);
  }

  function handleLogout() {
    setUser(null);
    setCurrentPage("dashboard");
    setHistory([]);
    setSelectedPedido(null);
    sessionStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(PAGE_STORAGE_KEY);
    sessionStorage.removeItem(PEDIDO_STORAGE_KEY);
    window.location.hash = "";
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
      {page === "recibo-pedido" && <PedidoReciboPage pedido={selectedPedido} />}
      {page === "editar-orcamento" && <EditarOrcamentoPage />}
      {page === "estoque" && <EstoquePage usuarioId={user.usuarioId} />}
      {page === "caixa" && <CaixaPage usuarioId={user.usuarioId} />}
      {page === "financeiro" && <FinanceiroPage usuarioId={user.usuarioId} />}
      {page === "usuarios" && <UsuariosPage />}
      {page === "logs" && <LogsPage />}
      {page === "conta" && <ContaPage user={user} />}
    </AppLayout>
  );
}

function readJson<T>(key: string): T | null {
  const storage = key === PAGE_STORAGE_KEY ? localStorage : sessionStorage;
  const value = storage.getItem(key);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

function getInitialPage(): Page {
  return pageFromHash() ?? parsePage(localStorage.getItem(PAGE_STORAGE_KEY)) ?? "dashboard";
}

function pageFromHash(): Page | null {
  return parsePage(window.location.hash.replace(/^#\/?/, ""));
}

function parsePage(value: string | null): Page | null {
  const pages: Page[] = ["dashboard", "pedidos", "novo-pedido", "recibo-pedido", "editar-orcamento", "estoque", "caixa", "financeiro", "usuarios", "logs", "conta"];
  return value && pages.includes(value as Page) ? (value as Page) : null;
}
