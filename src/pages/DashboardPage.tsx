import { AlertTriangle, Eye, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Page } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listarPedidosRecentes, listarPedidosPendentesEntrega, type PedidoResumo } from "@/services/pedidoService";
import { listarUsuarios, type Usuario } from "@/services/usuarioService";
import { formatCurrency, formatDate, formatStatusPedido, formatTipoPedido } from "@/utils/formatters";

type Navigate = (page: Page, pedido?: PedidoResumo | null) => void;

export function DashboardPage({ setPage }: { setPage: Navigate }) {
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [entregas, setEntregas] = useState<PedidoResumo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [atendente, setAtendente] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isEntregasLoading, setIsEntregasLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listarPedidosRecentes()
      .then(setPedidos)
      .catch(() => setError("Nao foi possivel carregar os pedidos recentes."))
      .finally(() => setIsLoading(false));

    listarUsuarios()
      .then(setUsuarios)
      .catch((err) => console.error("Erro ao carregar usuarios", err));
  }, []);

  useEffect(() => {
    setIsEntregasLoading(true);
    listarPedidosPendentesEntrega(atendente)
      .then(setEntregas)
      .catch((err) => console.error("Erro ao carregar entregas", err))
      .finally(() => setIsEntregasLoading(false));
  }, [atendente]);

  const isAtrasado = (dataEntregaStr: string | null) => {
    if (!dataEntregaStr) return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return dataEntregaStr < todayStr;
  };

  const totais = pedidos.reduce(
    (acc, pedido) => {
      const status = formatStatusPedido(pedido.status);
      const tipo = formatTipoPedido(pedido.tipo);
      if (tipo === "Orçamento") acc.orcamentos += 1;
      if (status === "Aberto") acc.abertos += 1;
      return acc;
    },
    { orcamentos: 0, abertos: 0 }
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
          Novo Pedido/Orçamento
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Metric title="Orçamentos" value={String(totais.orcamentos)} tone="amber" />
        <Metric title="Abertos" value={String(totais.abertos)} tone="cyan" />
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
                pedidos
                  .filter((pedido) => {
                    const status = formatStatusPedido(pedido.status);
                    return status !== "Cancelado" && status !== "Finalizado";
                  })
                  .slice(0, 5)
                  .map((pedido) => {
                  const status = formatStatusPedido(pedido.status);

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
                        <Button size="sm" variant="outline" onClick={() => setPage("novo-pedido", pedido)}>
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>

          {!isLoading && !error && pedidos.some((pedido) => !["Cancelado", "Finalizado"].includes(formatStatusPedido(pedido.status))) && (
            <p className="mt-3 text-xs font-semibold text-muted-foreground">
              Total em aberto:{" "}
              {formatCurrency(
                pedidos
                  .filter((pedido) => !["Cancelado", "Finalizado"].includes(formatStatusPedido(pedido.status)))
                  .reduce((sum, pedido) => sum + pedido.total, 0)
              )}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Próximas entregas</CardTitle>
            <p className="text-sm text-muted-foreground font-semibold">Pedidos e orçamentos pendentes com data de entrega definida</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">Atendente:</span>
            <select
              className="h-9 w-48 rounded-md border border-input bg-background px-3 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={atendente}
              onChange={(e) => setAtendente(e.target.value)}
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.nome}>
                  {u.nome}
                </option>
              ))}
            </select>
          </div>
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
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isEntregasLoading && (
                <TableRow>
                  <TableCell colSpan={6}>Carregando entregas...</TableCell>
                </TableRow>
              )}

              {!isEntregasLoading && entregas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>Nenhuma entrega pendente encontrada.</TableCell>
                </TableRow>
              )}

              {!isEntregasLoading &&
                entregas.map((pedido) => {
                  const status = formatStatusPedido(pedido.status);
                  const atrasado = isAtrasado(pedido.dataEntrega);

                  return (
                    <TableRow
                      key={pedido.id}
                      className={cn(
                        atrasado && "bg-rose-50/60 dark:bg-rose-950/10 text-rose-950 dark:text-rose-200 border-rose-100 dark:border-rose-900/40 hover:bg-rose-50/80 dark:hover:bg-rose-950/20"
                      )}
                    >
                      <TableCell className="font-bold">{pedido.numero}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>
                        <Badge tone={status === "Finalizado" ? "success" : status === "Aberto" ? "info" : status === "Cancelado" ? "danger" : "warning"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>{pedido.criadoPor}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-semibold">
                          {atrasado && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                          <span className={cn(atrasado && "text-red-600 dark:text-red-400 font-bold")}>
                            {formatDate(pedido.dataEntrega)}
                          </span>
                          {atrasado && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-black uppercase dark:bg-red-950 dark:text-red-300">
                              Atrasado
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setPage("recibo-pedido", pedido)}>
                            <Eye size={14} className="mr-1" />
                            Ver
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setPage("novo-pedido", pedido)}>
                            Editar
                          </Button>
                        </div>
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

function Metric({ title, value, tone }: { title: string; value: string; tone: "amber" | "cyan" }) {
  const colors = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300"
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
