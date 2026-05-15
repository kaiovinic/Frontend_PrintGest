import { ArrowLeft, BarChart3, ClipboardList, KeyRound, LayoutDashboard, LogOut, Package, ScrollText, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/services/authService";

export type Page =
  | "dashboard"
  | "pedidos"
  | "novo-pedido"
  | "editar-orcamento"
  | "estoque"
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

const navItems = [
  { page: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "pedidos" as const, label: "Pedidos", icon: ClipboardList, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "estoque" as const, label: "Estoque", icon: Package, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] },
  { page: "financeiro" as const, label: "Financeiro", icon: BarChart3, perfis: ["ADMIN", "GERENTE"] },
  { page: "usuarios" as const, label: "Usuários", icon: Users, perfis: ["ADMIN"] },
  { page: "logs" as const, label: "Logs", icon: ScrollText, perfis: ["ADMIN", "GERENTE"] },
  { page: "conta" as const, label: "Minha conta", icon: KeyRound, perfis: ["ADMIN", "GERENTE", "OPERACIONAL"] }
];

export function AppLayout({ page, setPage, canGoBack, onBack, theme, toggleTheme, user, onLogout, children }: AppLayoutProps) {
  return (
    <div className="page-shell grid min-h-screen lg:grid-cols-[260px_1fr]">
      <aside className="border-r bg-slate-950 text-white dark:bg-slate-950">
        <div className="flex h-full min-h-screen flex-col p-5">
          <button
            type="button"
            onClick={() => setPage("dashboard")}
            className="mb-8 flex h-12 items-center gap-2 rounded-lg bg-white px-3 text-left text-slate-950"
          >
            <span className="text-2xl font-black text-primary">Print</span>
            <span className="text-xs font-bold">Impressões</span>
          </button>

          <nav className="space-y-1">
            {navItems
              .filter((item) => item.perfis.includes(user.perfil))
              .map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => setPage(item.page)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors",
                      page === item.page ? "bg-primary text-white" : "text-slate-200 hover:bg-white/10"
                    )}
                  >
                    <Icon size={17} />
                    {item.label}
                  </button>
                );
              })}
          </nav>

          <div className="mt-auto space-y-4 border-t border-white/15 pt-5">
            <p className="text-sm font-bold">{user.nome}</p>
            <Button variant="secondary" className="w-full" onClick={onLogout}>
              <LogOut size={16} />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b bg-card px-5 py-4">
          <Button variant="outline" onClick={onBack} disabled={!canGoBack}>
            <ArrowLeft size={16} />
            Voltar
          </Button>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <div className="mx-auto max-w-7xl p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
