import { Calculator, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function PedidoFormPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Pedido ou orçamento</h1>
        <p className="text-sm text-muted-foreground">Campos baseados no talão físico da Print Impressões</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Cliente" value="Ana Souza" />
          <Field label="Empresa" value="Ana Eventos" />
          <Field label="CPF/CNPJ" value="123.456.789-00" />
          <Field label="Telefone" value="(75) 99999-1000" />
          <Field className="md:col-span-2" label="Endereço" value="Rua das Flores, 20" />
          <Field label="Cidade" value="Alagoinhas" />
          <Field label="Tipo" value="Orçamento" />
          <Field label="Data do pedido" value="14/05/2026" />
          <Field label="Data de entrega" value="20/05/2026" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens do pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="grid gap-3 md:grid-cols-[90px_110px_1fr_150px_150px]">
              <Field label="Quant." value={item === 1 ? "20" : ""} />
              <Field label="Tam." value={item === 1 ? "M" : ""} />
              <Field label="Descrição" value={item === 1 ? "Camisa branca com sublimação frente e fundo" : ""} />
              <Field label="Preço unitário" value={item === 1 ? "R$ 32,00" : ""} />
              <Field label="Total" value={item === 1 ? "R$ 640,00" : ""} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Arte e tamanhos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="space-y-2">
              <span className="field-label">Frente</span>
              <Textarea defaultValue="Logo no peito esquerdo." maxLength={300} />
            </label>
            <label className="space-y-2">
              <span className="field-label">Fundo</span>
              <Textarea defaultValue="Arte centralizada nas costas." maxLength={300} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="field-label">Tamanhos masculinos</span>
                <Textarea defaultValue="P: 4, M: 8, G: 8" maxLength={300} />
              </label>
              <label className="space-y-2">
                <span className="field-label">Tamanhos femininos</span>
                <Textarea defaultValue="M: 6, G: 4" maxLength={300} />
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamento e reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Forma" value="PIX" />
              <Field label="Condição" value="Adiantamento" />
              <Field label="Total geral" value="R$ 640,00" />
              <Field label="Observação" value="Cliente enviará arte final por WhatsApp." />
            </div>
            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-black">Parcelas</p>
              <div className="grid gap-3 md:grid-cols-[80px_1fr_1fr_1fr]">
                <Field label="#" value="1" />
                <Field label="Perc. (%)" value="50" />
                <Field label="Valor" value="R$ 320,00" />
                <Field label="Vencimento" value="14/05/2026" />
                <Field label="#" value="2" />
                <Field label="Perc. (%)" value="50" />
                <Field label="Valor" value="R$ 320,00" />
                <Field label="Vencimento" value="20/05/2026" />
              </div>
            </div>
            <Button className="w-full">
              <Calculator size={16} />
              Calcular e reservar materiais
            </Button>
            <Button className="w-full" variant="secondary">
              <Save size={16} />
              Salvar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      <Input className="mt-2" defaultValue={value} />
    </label>
  );
}
