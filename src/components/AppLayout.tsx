import {
  BarChart3,
  ClipboardList,
  FileClock,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Package,
  ScrollText,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

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
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogout: () => void;
  children: React.ReactNode;
};

const navItems = [
  { page: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
  { page: "pedidos" as const, label: "Pedidos", icon: ClipboardList },
  { page: "editar-orcamento" as const, label: "Orçamentos", icon: FileClock },
  { page: "estoque" as const, label: "Estoque", icon: Package },
  { page: "financeiro" as const, label: "Financeiro", icon: BarChart3 },
  { page: "usuarios" as const, label: "Usuários", icon: Users },
  { page: "logs" as const, label: "Logs", icon: ScrollText },
  { page: "conta" as const, label: "Minha conta", icon: KeyRound }
];

export function AppLayout({ page, setPage, theme, toggleTheme, onLogout, children }: AppLayoutProps) {
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

          <div className="mb-5 rounded-full bg-white px-4 py-1 text-center text-xs font-bold text-slate-950">
            Gerente
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
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
            <div>
              <p className="text-sm font-bold">Maria Atendente</p>
              <p className="text-xs text-slate-300">Gerente</p>
            </div>
            <Button variant="secondary" className="w-full" onClick={onLogout}>
              <LogOut size={16} />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0">
        <header className="flex items-center justify-end border-b bg-card px-5 py-4">
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </header>
        <div className="mx-auto max-w-7xl p-5 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
