import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ContaPage() {
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
          <Input type="password" placeholder="Senha atual" defaultValue="123456789" />
          <Input type="password" placeholder="Nova senha" defaultValue="Print@2026" />
          <Input type="password" placeholder="Confirmar nova senha" defaultValue="Print@2026" />
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
