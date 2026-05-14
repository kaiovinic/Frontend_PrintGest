import { Filter, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Page } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarPedidos, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency, formatStatusPedido, formatTipoPedido } from "@/utils/formatters";

export function PedidosPage({ setPage }: { setPage: (page: Page) => void }) {
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarPedidos()
      .then(setPedidos)
      .catch(() => setError("Nao foi possivel carregar os pedidos."))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Pedidos e orcamentos</h1>
          <p className="text-sm text-muted-foreground">Abertos, cancelados, finalizados e orcados</p>
        </div>
        <Button onClick={() => setPage("novo-pedido")}>
          <Plus size={16} />
          Novo pedido
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input placeholder="Data inicio" />
          <Input placeholder="Data final" />
          <Input placeholder="Status" />
          <Button variant="outline">
            <Filter size={16} />
            Filtrar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de pedidos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8}>Carregando pedidos...</TableCell>
                </TableRow>
              )}

              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-destructive">
                    {error}
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                !error &&
                pedidos.map((pedido) => {
                  const tipo = formatTipoPedido(pedido.tipo);
                  const status = formatStatusPedido(pedido.status);

                  return (
                    <TableRow key={pedido.id}>
                      <TableCell>{pedido.numero}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>{tipo}</TableCell>
                      <TableCell>
                        <Badge tone={badgeTone(status)}>{status}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(pedido.total)}</TableCell>
                      <TableCell>{formatCurrency(pedido.valorPago)}</TableCell>
                      <TableCell>{formatCurrency(pedido.saldoDevedor)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => setPage(tipo === "Orçamento" ? "editar-orcamento" : "novo-pedido")}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function badgeTone(status: string) {
  if (status === "Finalizado") return "success";
  if (status === "Cancelado") return "danger";
  if (status === "Aberto") return "info";
  return "warning";
}
