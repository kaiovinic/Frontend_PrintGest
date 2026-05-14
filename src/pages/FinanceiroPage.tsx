import { Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { despesas, pedidos } from "@/data/mockData";

export function FinanceiroPage() {
  const [tab, setTab] = useState("Vendas");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Controle completo de vendas, entradas, saídas e clientes</p>
      </div>

      <Tabs tabs={["Vendas", "Entradas", "Despesas", "Gráficos", "Clientes"]} active={tab} onChange={setTab} />

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input defaultValue="01/05/2026" />
          <Input defaultValue="31/05/2026" />
          <Input defaultValue="2026" />
          <Button variant="outline">Limpar filtro</Button>
        </CardContent>
      </Card>

      {tab === "Vendas" && <Vendas />}
      {tab === "Entradas" && <Entradas />}
      {tab === "Despesas" && <Despesas />}
      {tab === "Gráficos" && <Graficos />}
      {tab === "Clientes" && <Clientes />}
    </div>
  );
}

function Vendas() {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Receita mês" value="R$ 22.850" tone="green" />
        <Metric title="Pedidos pagos" value="38" tone="cyan" />
        <Metric title="Ticket médio" value="R$ 601" tone="amber" />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Controle de vendas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.slice(1, 4).map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.id}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>PIX</TableCell>
                  <TableCell>{pedido.total}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Entradas() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entradas de dinheiro</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Metric title="PIX" value="R$ 13.600" tone="cyan" />
        <Metric title="Dinheiro" value="R$ 3.250" tone="green" />
        <Metric title="Cartão" value="R$ 6.000" tone="amber" />
      </CardContent>
    </Card>
  );
}

function Despesas() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nova despesa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Categoria: luz, água, contador..." />
          <Input placeholder="Descrição" />
          <Input placeholder="Valor" />
          <Input placeholder="Vencimento" />
          <Button>
            <Plus size={16} />
            Lançar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Contas e despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((despesa) => (
                <TableRow key={despesa.tipo}>
                  <TableCell>{despesa.tipo}</TableCell>
                  <TableCell>{despesa.valor}</TableCell>
                  <TableCell>
                    <Badge tone={despesa.status === "Pago" ? "success" : "info"}>{despesa.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Graficos() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <BarCard title="Entradas x saídas" bars={["h-16 bg-emerald-600", "h-24 bg-emerald-600", "h-20 bg-emerald-600", "h-28 bg-emerald-600", "h-12 bg-rose-600", "h-16 bg-rose-600"]} />
        <BarCard title="Receita anual" bars={["h-12", "h-16", "h-24", "h-20", "h-32", "h-28", "h-36"].map((h) => `${h} bg-primary`)} />
      </div>
      <Clientes />
    </div>
  );
}

function Clientes() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 clientes do mês</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ["Print Eventos", "R$ 4.800", "21%"],
              ["Mercado Sol", "R$ 3.200", "14%"],
              ["Clínica Vida", "R$ 2.750", "12%"],
              ["Grupo Alfa", "R$ 2.400", "10%"]
            ].map(([cliente, valor, percent]) => (
              <TableRow key={cliente}>
                <TableCell>{cliente}</TableCell>
                <TableCell>{valor}</TableCell>
                <TableCell>{percent}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "green" | "cyan" | "amber" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  };
  return (
    <Card className={colors[tone]}>
      <CardContent className="p-5">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function BarCard({ title, bars }: { title: string; bars: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-48 items-end gap-4">
        {bars.map((bar, index) => (
          <div key={`${bar}-${index}`} className={`w-8 rounded-t-md ${bar}`} />
        ))}
      </CardContent>
    </Card>
  );
}
