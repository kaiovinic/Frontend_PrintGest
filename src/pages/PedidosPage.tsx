import { Filter, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Page } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listarPedidos, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency, formatStatusPedido, formatTipoPedido } from "@/utils/formatters";

type Navigate = (page: Page, pedido?: PedidoResumo | null) => void;

const currentDate = new Date();
const meses = [
  ["01", "Janeiro"],
  ["02", "Fevereiro"],
  ["03", "Março"],
  ["04", "Abril"],
  ["05", "Maio"],
  ["06", "Junho"],
  ["07", "Julho"],
  ["08", "Agosto"],
  ["09", "Setembro"],
  ["10", "Outubro"],
  ["11", "Novembro"],
  ["12", "Dezembro"]
];

export function PedidosPage({ setPage }: { setPage: Navigate }) {
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ano, setAno] = useState(String(currentDate.getFullYear()));
  const [mes, setMes] = useState(String(currentDate.getMonth() + 1).padStart(2, "0"));
  const [dataInicio, setDataInicio] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    listarPedidos()
      .then(setPedidos)
      .catch(() => setError("Nao foi possivel carregar os pedidos."))
      .finally(() => setIsLoading(false));
  }, []);

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      const pedidoStatus = formatStatusPedido(pedido.status);
      const dataPedido = pedido.dataPedido;
      const usaPeriodo = dataInicio || dataFinal;

      if (status && pedidoStatus !== status) return false;

      if (usaPeriodo) {
        if (dataInicio && dataPedido < dataInicio) return false;
        if (dataFinal && dataPedido > dataFinal) return false;
        return true;
      }

      return dataPedido.startsWith(`${ano}-${mes}`);
    });
  }, [ano, dataFinal, dataInicio, mes, pedidos, status]);

  function limparPeriodo() {
    setDataInicio("");
    setDataFinal("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Pedidos e orçamentos</h1>
          <p className="text-sm text-muted-foreground">Abertos, cancelados, finalizados e orçados</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => setPage("novo-pedido")}>
            <Plus size={16} />
            Novo orçamento
          </Button>
          <Button onClick={() => setPage("novo-pedido")}>
            <Plus size={16} />
            Novo pedido
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-6">
          <label>
            <span className="field-label">Ano</span>
            <Input className="mt-2" value={ano} onChange={(event) => setAno(event.target.value)} disabled={Boolean(dataInicio || dataFinal)} />
          </label>
          <label>
            <span className="field-label">Mês</span>
            <Select value={mes} onChange={setMes} disabled={Boolean(dataInicio || dataFinal)}>
              {meses.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="field-label">Data início</span>
            <Input className="mt-2" type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} onFocus={limparPeriodo} />
          </label>
          <label>
            <span className="field-label">Data final</span>
            <Input className="mt-2" type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} />
          </label>
          <label>
            <span className="field-label">Status</span>
            <Select value={status} onChange={setStatus}>
              <option value="">Todos</option>
              <option value="Orçado">Orçado</option>
              <option value="Aberto">Aberto</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </Select>
          </label>
          <Button className="mt-6" variant="outline">
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
                <TableHead>Ação</TableHead>
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
                pedidosFiltrados.map((pedido) => {
                  const tipo = formatTipoPedido(pedido.tipo);
                  const pedidoStatus = formatStatusPedido(pedido.status);

                  return (
                    <TableRow key={pedido.id}>
                      <TableCell>{pedido.numero}</TableCell>
                      <TableCell>{pedido.cliente}</TableCell>
                      <TableCell>{tipo}</TableCell>
                      <TableCell>
                        <Badge tone={badgeTone(pedidoStatus)}>{pedidoStatus}</Badge>
                      </TableCell>
                      <TableCell>{formatCurrency(pedido.total)}</TableCell>
                      <TableCell>{formatCurrency(pedido.valorPago)}</TableCell>
                      <TableCell>{formatCurrency(pedido.saldoDevedor)}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
  disabled
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      className={cn(
        "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-50"
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  );
}

function badgeTone(status: string) {
  if (status === "Finalizado") return "success";
  if (status === "Cancelado") return "danger";
  if (status === "Aberto") return "info";
  return "warning";
}
