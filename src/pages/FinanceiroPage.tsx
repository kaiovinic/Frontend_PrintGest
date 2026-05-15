import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { listarDespesas, type Despesa } from "@/services/financeiroService";
import { listarPedidos, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency } from "@/utils/formatters";

export function FinanceiroPage() {
  const [tab, setTab] = useState("Vendas");
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);

  useEffect(() => {
    listarPedidos().then(setPedidos).catch(() => setPedidos([]));
    listarDespesas().then(setDespesas).catch(() => setDespesas([]));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Controle completo de vendas, entradas, saídas e clientes</p>
      </div>

      <Tabs tabs={["Vendas", "Entradas", "Despesas", "Gráficos", "Clientes"]} active={tab} onChange={setTab} />

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input type="date" />
          <Input type="date" />
          <Input defaultValue="2026" />
          <Button variant="outline">Limpar filtro</Button>
        </CardContent>
      </Card>

      {tab === "Vendas" && <Vendas pedidos={pedidos} />}
      {tab === "Entradas" && <Entradas pedidos={pedidos} />}
      {tab === "Despesas" && <Despesas despesas={despesas} />}
      {tab === "Gráficos" && <Graficos pedidos={pedidos} />}
      {tab === "Clientes" && <Clientes pedidos={pedidos} />}
    </div>
  );
}

function Vendas({ pedidos }: { pedidos: PedidoResumo[] }) {
  const receita = pedidos.reduce((sum, pedido) => sum + pedido.valorPago, 0);
  const pagos = pedidos.filter((pedido) => pedido.valorPago > 0).length;
  const ticket = pagos > 0 ? receita / pagos : 0;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="Receita mês" value={formatCurrency(receita)} tone="green" />
        <Metric title="Pedidos pagos" value={String(pagos)} tone="cyan" />
        <Metric title="Ticket médio" value={formatCurrency(ticket)} tone="amber" />
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
                <TableHead>Valor pago</TableHead>
                <TableHead>Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.numero}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{formatCurrency(pedido.valorPago)}</TableCell>
                  <TableCell>{formatCurrency(pedido.saldoDevedor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function Entradas({ pedidos }: { pedidos: PedidoResumo[] }) {
  const total = pedidos.reduce((sum, pedido) => sum + pedido.valorPago, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entradas de dinheiro</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Metric title="Entradas registradas" value={formatCurrency(total)} tone="cyan" />
        <Metric title="Pedidos com entrada" value={String(pedidos.filter((pedido) => pedido.valorPago > 0).length)} tone="green" />
        <Metric title="Saldo a receber" value={formatCurrency(pedidos.reduce((sum, pedido) => sum + pedido.saldoDevedor, 0))} tone="amber" />
      </CardContent>
    </Card>
  );
}

function Despesas({ despesas }: { despesas: Despesa[] }) {
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
          <Input type="date" placeholder="Vencimento" />
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
              {despesas.map((despesa, index) => (
                <TableRow key={`${despesa.id ?? index}-${despesa.categoria ?? despesa.tipo}`}>
                  <TableCell>{despesa.categoria ?? despesa.tipo ?? despesa.descricao}</TableCell>
                  <TableCell>{typeof despesa.valor === "number" ? formatCurrency(despesa.valor) : despesa.valor}</TableCell>
                  <TableCell>
                    <Badge tone={despesa.status === "Pago" || despesa.status === "Finalizado" ? "success" : "info"}>{despesa.status}</Badge>
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

function Graficos({ pedidos }: { pedidos: PedidoResumo[] }) {
  const bars = pedidos.slice(0, 7).map((pedido) => {
    const height = Math.max(12, Math.min(40, Math.round(pedido.valorPago / 100)));
    return `h-${height} bg-primary`;
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <BarCard title="Entradas x saídas" bars={bars.length ? bars : ["h-12 bg-primary"]} />
        <BarCard title="Receita anual" bars={bars.length ? bars : ["h-12 bg-primary"]} />
      </div>
      <Clientes pedidos={pedidos} />
    </div>
  );
}

function Clientes({ pedidos }: { pedidos: PedidoResumo[] }) {
  const clientes = useMemo(() => {
    const totals = new Map<string, number>();
    pedidos.forEach((pedido) => totals.set(pedido.cliente, (totals.get(pedido.cliente) ?? 0) + pedido.total));
    const totalGeral = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);
    return Array.from(totals.entries())
      .map(([cliente, valor]) => ({ cliente, valor, percentual: totalGeral > 0 ? Math.round((valor / totalGeral) * 100) : 0 }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [pedidos]);

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
            {clientes.map((cliente) => (
              <TableRow key={cliente.cliente}>
                <TableCell>{cliente.cliente}</TableCell>
                <TableCell>{formatCurrency(cliente.valor)}</TableCell>
                <TableCell>{cliente.percentual}%</TableCell>
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
