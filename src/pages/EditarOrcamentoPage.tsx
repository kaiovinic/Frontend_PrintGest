import { ArrowRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditarOrcamentoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Editar orçamento</h1>
        <p className="text-sm text-muted-foreground">Ajuste o orçamento antes de converter em pedido</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orçamento #1024</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Field label="Cliente" value="Ana Souza" />
          <Field label="Produto" value="Camisa personalizada" />
          <Field label="Quantidade" value="20" />
          <Field label="Valor unitário" value="R$ 34,00" />
          <Field label="Valor total" value="R$ 680,00" />
          <Field label="Entrega prevista" value="18/05/2026" />
          <label className="md:col-span-3">
            <span className="field-label">Observação</span>
            <Textarea className="mt-2" defaultValue="Orçamento aguardando aprovação do cliente." maxLength={300} />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Converter em pedido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Forma de pagamento" value="PIX" />
          <Field label="Condição" value="Adiantamento" />
          <Field label="Entrada (%)" value="50" />
          <Field label="Entrada calculada" value="R$ 340,00" />
          <div className="flex gap-3 md:col-span-4">
            <Button>
              <Save size={16} />
              Salvar orçamento
            </Button>
            <Button variant="secondary">
              <ArrowRight size={16} />
              Converter em pedido
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <Input className="mt-2" defaultValue={value} />
    </label>
  );
}
