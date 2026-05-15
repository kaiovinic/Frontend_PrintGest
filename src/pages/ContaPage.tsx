import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ContaPage() {
  const [visibleField, setVisibleField] = useState<string | null>(null);

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
          <PasswordField id="atual" label="Senha atual" visibleField={visibleField} setVisibleField={setVisibleField} defaultValue="123456789" />
          <PasswordField id="nova" label="Nova senha" visibleField={visibleField} setVisibleField={setVisibleField} defaultValue="Print@2026" />
          <PasswordField
            id="confirmar"
            label="Confirmar nova senha"
            visibleField={visibleField}
            setVisibleField={setVisibleField}
            defaultValue="Print@2026"
          />
          <p className="text-sm font-semibold text-muted-foreground">
            Mínimo 8 caracteres. Use maiúscula, minúscula, número e especial.
          </p>
          <Button>
            <KeyRound size={16} />
            Atualizar senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PasswordField({
  id,
  label,
  defaultValue,
  visibleField,
  setVisibleField
}: {
  id: string;
  label: string;
  defaultValue: string;
  visibleField: string | null;
  setVisibleField: (value: string | null) => void;
}) {
  const visible = visibleField === id;

  return (
    <label className="space-y-2">
      <span className="field-label">{label}</span>
      <div className="relative">
        <Input className="pr-10" type={visible ? "text" : "password"} defaultValue={defaultValue} />
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
