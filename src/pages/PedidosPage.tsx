import { Filter, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pedidos } from "@/data/mockData";
import type { Page } from "@/components/AppLayout";

export function PedidosPage({ setPage }: { setPage: (page: Page) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Pedidos e orçamentos</h1>
          <p className="text-sm text-muted-foreground">Abertos, cancelados, finalizados e orçados</p>
        </div>
        <Button onClick={() => setPage("novo-pedido")}>
          <Plus size={16} />
          Novo pedido
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input placeholder="Data início" />
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
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pago</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.id}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>{pedido.tipo}</TableCell>
                  <TableCell>
                    <Badge tone={badgeTone(pedido.status)}>{pedido.status}</Badge>
                  </TableCell>
                  <TableCell>{pedido.total}</TableCell>
                  <TableCell>{pedido.pago}</TableCell>
                  <TableCell>{pedido.saldo}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(pedido.tipo === "Orçamento" ? "editar-orcamento" : "novo-pedido")}
                    >
                      Editar
                    </Button>
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

function badgeTone(status: string) {
  if (status === "Finalizado") return "success";
  if (status === "Cancelado") return "danger";
  if (status === "Aberto") return "info";
  return "warning";
}
