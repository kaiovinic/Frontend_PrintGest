import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Page } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarPedidosRecentes, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency, formatDate, formatStatusPedido, formatTipoPedido } from "@/utils/formatters";

export function DashboardPage({ setPage }: { setPage: (page: Page) => void }) {
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarPedidosRecentes()
      .then(setPedidos)
      .catch(() => setError("Nao foi possivel carregar os pedidos recentes."))
      .finally(() => setIsLoading(false));
  }, []);

  const totais = pedidos.reduce(
    (acc, pedido) => {
      const status = formatStatusPedido(pedido.status);
      const tipo = formatTipoPedido(pedido.tipo);
      if (tipo === "Orçamento") acc.orcamentos += 1;
      if (status === "Aberto") acc.abertos += 1;
      if (status === "Finalizado") acc.finalizados += 1;
      if (formatDate(pedido.dataEntrega) === "14/05/2026") acc.entregaHoje += 1;
      return acc;
    },
    { orcamentos: 0, abertos: 0, entregaHoje: 0, finalizados: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visao operacional sem receita da empresa</p>
        </div>
        <Button onClick={() => setPage("novo-pedido")}>
          <Plus size={16} />
          Novo orcamento
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Orcamentos" value={String(totais.orcamentos)} tone="amber" />
        <Metric title="Abertos" value={String(totais.abertos)} tone="cyan" />
        <Metric title="Entrega hoje" value={String(totais.entregaHoje)} tone="rose" />
        <Metric title="Finalizados" value={String(totais.finalizados)} tone="emerald" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>Carregando pedidos...</TableCell>
                </TableRow>
              )}

              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !error &&
                pedidos.slice(0, 5).map((pedido) => {
                  const status = formatStatusPedido(pedido.status);
                  const tipo = formatTipoPedido(pedido.tipo);

                  return (
                    <TableRow key={pedido.id}>
                      <TableCell>{pedido.numero}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>
                        <Badge tone={status === "Finalizado" ? "success" : status === "Aberto" ? "info" : "warning"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{pedido.criadoPor}</TableCell>
                      <TableCell>{formatDate(pedido.dataEntrega)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setPage(tipo === "Orçamento" ? "editar-orcamento" : "pedidos")}>
                          {tipo === "Orçamento" ? "Editar" : "Ver"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {!isLoading && !error && pedidos.length > 0 && (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Total recente: {formatCurrency(pedidos.reduce((sum, pedido) => sum + pedido.total, 0))}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "amber" | "cyan" | "rose" | "emerald" }) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
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
