import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { FormEvent, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api";
import { login, type AuthUser } from "@/services/authService";

type LoginPageProps = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogin: (user: AuthUser) => void;
};

export function LoginPage({ theme, toggleTheme, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("maria@print.com");
  const [senha, setSenha] = useState("123456789");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await login({ email, senha });
      onLogin(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Email ou senha inválidos.");
      } else {
        setError("Não foi possível conectar com a API. Confira se o backend está rodando.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
      <div className="absolute right-5 top-5">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <Card className="grid w-full max-w-5xl overflow-hidden border-slate-800 bg-card text-card-foreground shadow-2xl lg:grid-cols-[1fr_1.15fr]">
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

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="field-label">E-mail</span>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={17} />
                <Input
                  className="pl-10"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="space-y-2">
              <span className="field-label">Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={17} />
                <Input
                  className="pl-10 pr-10"
                  type={showPassword ? "text" : "password"}
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </section>
      </Card>
    </div>
  );
}
