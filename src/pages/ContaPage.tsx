import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trocarSenha, type AuthUser } from "@/services/authService";

export function ContaPage({ user }: { user: AuthUser }) {
  const [visibleField, setVisibleField] = useState<string | null>(null);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function atualizarSenha() {
    setMessage(null);
    setIsSaving(true);

    try {
      await trocarSenha({
        email: user.email,
        senhaAtual,
        novaSenha,
        confirmarNovaSenha
      });
      setMessage("Senha atualizada com sucesso.");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarNovaSenha("");
    } catch {
      setMessage("Não foi possível atualizar a senha. Confira a senha atual e os requisitos da nova senha.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Minha conta</h1>
        <p className="text-sm text-muted-foreground">Troca de senha dentro do sistema</p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Redefinir senha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PasswordField id="atual" label="Senha atual" value={senhaAtual} onChange={setSenhaAtual} visibleField={visibleField} setVisibleField={setVisibleField} />
          <PasswordField id="nova" label="Nova senha" value={novaSenha} onChange={setNovaSenha} visibleField={visibleField} setVisibleField={setVisibleField} />
          <PasswordField
            id="confirmar"
            label="Confirmar nova senha"
            value={confirmarNovaSenha}
            onChange={setConfirmarNovaSenha}
            visibleField={visibleField}
            setVisibleField={setVisibleField}
          />
          <p className="text-sm font-semibold text-muted-foreground">
            Mínimo 8 caracteres. Use maiúscula, minúscula, número e especial.
          </p>
          {message && (
            <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
              {message}
            </p>
          )}
          <Button onClick={atualizarSenha} disabled={isSaving}>
            <KeyRound size={16} />
            {isSaving ? "Atualizando..." : "Atualizar senha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visibleField,
  setVisibleField
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visibleField: string | null;
  setVisibleField: (value: string | null) => void;
}) {
  const visible = visibleField === id;

  return (
    <label className="space-y-2">
      <span className="field-label">{label}</span>
      <div className="relative">
        <Input className="pr-10" type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} />
        <button
          type="button"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          onClick={() => setVisibleField(visible ? null : id)}
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </label>
  );
}
