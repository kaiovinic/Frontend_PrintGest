import { EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";

type LoginPageProps = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogin: () => void;
};

export function LoginPage({ theme, toggleTheme, onLogin }: LoginPageProps) {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
      <div className="absolute right-5 top-5">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <Card className="grid w-full max-w-5xl overflow-hidden border-slate-800 bg-card shadow-2xl lg:grid-cols-[1fr_1.15fr]">
        <section className="bg-slate-950 p-8 text-white">
          <div className="mb-16 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-slate-950">
            <span className="text-3xl font-black text-primary">Print</span>
            <span className="text-xs font-bold">Impressões</span>
          </div>
          <h1 className="mb-3 text-4xl font-black">PrintGest</h1>
          <p className="max-w-sm text-lg font-semibold text-slate-200">
            Sistema de gestão financeira, pedidos e estoque.
          </p>
        </section>

        <section className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black">Login</h2>
            <p className="text-sm text-muted-foreground">Acesse com seu email e senha</p>
          </div>

          <div className="space-y-4">
            <label className="space-y-2">
              <span className="field-label">E-mail</span>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={17} />
                <Input className="pl-10" defaultValue="maria@print.com" />
              </div>
            </label>

            <label className="space-y-2">
              <span className="field-label">Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={17} />
                <Input className="pl-10 pr-10" type="password" defaultValue="123456789" />
                <EyeOff className="absolute right-3 top-3 text-muted-foreground" size={17} />
              </div>
            </label>

            <Button className="w-full" onClick={onLogin}>
              Entrar
            </Button>
          </div>
        </section>
      </Card>
    </div>
  );
}
