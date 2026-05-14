import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pedidos } from "@/data/mockData";
import type { Page } from "@/components/AppLayout";

export function DashboardPage({ setPage }: { setPage: (page: Page) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão operacional sem receita da empresa</p>
        </div>
        <Button onClick={() => setPage("novo-pedido")}>
          <Plus size={16} />
          Novo orçamento
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Orçamentos" value="18" tone="amber" />
        <Metric title="Abertos" value="12" tone="cyan" />
        <Metric title="Entrega hoje" value="4" tone="rose" />
        <Metric title="Finalizados" value="31" tone="emerald" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos recentes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.slice(0, 3).map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.id}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell>
                    <Badge tone={pedido.status === "Finalizado" ? "success" : pedido.status === "Aberto" ? "info" : "warning"}>
                      {pedido.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{pedido.criadoPor}</TableCell>
                  <TableCell>{pedido.entrega}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setPage(pedido.tipo === "Orçamento" ? "editar-orcamento" : "pedidos")}>
                      {pedido.tipo === "Orçamento" ? "Editar" : "Ver"}
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
