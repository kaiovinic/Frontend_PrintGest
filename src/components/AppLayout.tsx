import { ArrowLeft, Banknote, BarChart3, ChevronLeft, ChevronRight, ClipboardList, KeyRound, LayoutDashboard, LogOut, Menu, Package, ScrollText, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/services/authService";

export type Page =
  | "dashboard"
  | "pedidos"
  | "novo-pedido"
  | "recibo-pedido"
  | "editar-orcamento"
  | "estoque"
  | "caixa"
  | "financeiro"
  | "usuarios"
  | "logs"
  | "conta";

type AppLayoutProps = {
  page: Page;
  setPage: (page: Page) => void;
  canGoBack: boolean;
  onBack: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: AuthUser;
  onLogout: () => void;
  children: React.ReactNode;
};

const MENU_COLLAPSED_KEY = "printgest:menuCollapsed";

const navItems = [
  { page: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "pedidos" as const, label: "Pedidos", icon: ClipboardList, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "estoque" as const, label: "Estoque", icon: Package, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "caixa" as const, label: "Caixa", icon: Banknote, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "financeiro" as const, label: "Financeiro", icon: BarChart3, perfis: ["ADMIN", "GERENTE"] },
  { page: "usuarios" as const, label: "Usuários", icon: Users, perfis: ["ADMIN"] },
  { page: "logs" as const, label: "Logs", icon: ScrollText, perfis: ["ADMIN", "GERENTE"] },
  { page: "conta" as const, label: "Minha conta", icon: KeyRound, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] }
];

export function AppLayout({ page, setPage, canGoBack, onBack, theme, toggleTheme, user, onLogout, children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuCollapsed, setMenuCollapsed] = useState(() => localStorage.getItem(MENU_COLLAPSED_KEY) === "true");

  useEffect(() => {
    localStorage.setItem(MENU_COLLAPSED_KEY, String(menuCollapsed));
  }, [menuCollapsed]);

  function navigate(nextPage: Page) {
    setPage(nextPage);
    setMenuOpen(false);
  }

  return (
    <div className={cn("page-shell min-h-screen lg:grid", menuCollapsed ? "lg:grid-cols-[88px_1fr]" : "lg:grid-cols-[260px_1fr]")}>
      {menuOpen && <button className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 -translate-x-full border-r bg-slate-950 text-white transition-all duration-200 lg:static lg:z-auto lg:translate-x-0 dark:bg-slate-950",
          menuCollapsed ? "lg:w-[88px]" : "lg:w-[260px]",
          menuOpen && "translate-x-0"
        )}
      >
        <div className={cn("flex h-full min-h-screen flex-col p-5", menuCollapsed && "lg:px-3")}>
          <div className={cn("mb-8 flex items-center gap-3", menuCollapsed && "lg:flex-col")}>
            <button
              type="button"
              onClick={() => navigate("dashboard")}
              title="Dashboard"
              className={cn(
                "flex h-12 flex-1 items-center gap-2 rounded-lg bg-white px-3 text-left text-slate-950 transition-all",
                menuCollapsed && "lg:flex-none lg:justify-center lg:px-2"
              )}
            >
              <span className="text-2xl font-black text-primary">Print</span>
              <span className={cn("text-xs font-bold", menuCollapsed && "lg:hidden")}>Impressões</span>
            </button>
            <Button className={cn("hidden lg:inline-flex", menuCollapsed && "lg:flex")} size="icon" variant="secondary" onClick={() => setMenuCollapsed((current) => !current)} title={menuCollapsed ? "Expandir menu" : "Recolher menu"} aria-label={menuCollapsed ? "Expandir menu" : "Recolher menu"}>
              {menuCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </Button>
            <Button className="lg:hidden" size="icon" variant="secondary" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
              <X size={18} />
            </Button>
          </div>

          <nav className="space-y-1">
            {navItems
              .filter((item) => item.perfis.includes(user.perfil))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    type="button"
                    title={item.label}
                    onClick={() => navigate(item.page)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                      menuCollapsed && "lg:justify-center lg:px-0",
                      page === item.page ? "bg-primary text-white" : "text-slate-200 hover:bg-white/10"
                    )}
                  >
                    <Icon size={18} />
                    <span className={cn(menuCollapsed && "lg:hidden")}>{item.label}</span>
                  </button>
                );
              })}
          </nav>

          <div className={cn("mt-auto space-y-4 border-t border-white/15 pt-5", menuCollapsed && "lg:flex lg:flex-col lg:items-center")}> 
            <p className={cn("text-sm font-bold", menuCollapsed && "lg:hidden")}>{user.nome}</p>
            <Button variant="secondary" className={cn("w-full", menuCollapsed && "lg:size-10 lg:px-0")} onClick={onLogout} title="Sair" aria-label="Sair">
              <LogOut size={16} />
              <span className={cn(menuCollapsed && "lg:hidden")}>Sair</span>
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card px-4 py-3 lg:px-5 lg:py-4">
          <div className="flex items-center gap-2">
            <Button className="lg:hidden" size="icon" variant="outline" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">
              <Menu size={18} />
            </Button>
            <Button variant="outline" onClick={onBack} disabled={!canGoBack}>
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
          </div>
          <div className="min-w-0 flex-1 px-2 text-center sm:text-left">
            <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
              Bem-vindo, <span className="text-primary">{user.nome}</span>
            </p>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <div className="mx-auto max-w-[1500px] p-4 sm:p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}