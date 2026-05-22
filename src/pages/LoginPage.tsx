import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/services/api";
import { login, type AuthUser, type LoginPayload } from "@/services/authService";

type LoginPageProps = {
  theme: "light" | "dark";
  toggleTheme: () => void;
  onLogin: (user: AuthUser) => void;
};

const loginSchema = z.object({
  email: z.string().trim().min(1, "Informe o email.").email("Informe um email valido."),
  senha: z.string().min(1, "Informe a senha.")
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage({ theme, toggleTheme, onLogin }: LoginPageProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      senha: ""
    }
  });

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: onLogin,
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        setError(err.message);
        return;
      }

      setError(err instanceof Error ? err.message : "Nao foi possivel conectar com a API. Confira se o backend esta rodando.");
    }
  });

  function onSubmit(values: LoginForm) {
    setError(null);
    loginMutation.mutate(values);
  }

  const isLoading = loginMutation.isPending;

  return (
    <div className="grid min-h-screen place-items-center bg-slate-950 p-4 text-white">
      <div className="absolute right-5 top-5">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <Card className="grid w-full max-w-5xl overflow-hidden border-slate-800 bg-card text-card-foreground shadow-2xl lg:grid-cols-[1fr_1.15fr]">
        <section className="bg-slate-950 p-8 text-white">
          <div className="mb-16 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-slate-950">
            <span className="text-3xl font-black text-primary">Print</span>
            <span className="text-xs font-bold">Impressoes</span>
          </div>
          <h1 className="mb-3 text-4xl font-black">PrintGest</h1>
          <p className="max-w-sm text-lg font-semibold text-slate-200">Sistema de gestao financeira, pedidos e estoque.</p>
        </section>

        <section className="p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-black">Login</h2>
            <p className="text-sm text-muted-foreground">Acesse com seu email e senha</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            <label className="space-y-2">
              <span className="field-label">E-mail</span>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-muted-foreground" size={17} />
                <Input className="pl-10" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
              </div>
              {errors.email && <p className="text-sm font-semibold text-destructive">{errors.email.message}</p>}
            </label>

            <label className="space-y-2">
              <span className="field-label">Senha</span>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-muted-foreground" size={17} />
                <Input className="pl-10 pr-10" type={showPassword ? "text" : "password"} autoComplete="current-password" aria-invalid={Boolean(errors.senha)} {...register("senha")} />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.senha && <p className="text-sm font-semibold text-destructive">{errors.senha.message}</p>}
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
