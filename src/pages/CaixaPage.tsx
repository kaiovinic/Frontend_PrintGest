import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  criarMovimentacaoCaixa,
  listarMovimentacoesCaixa,
  obterResumoCaixa,
  type CaixaMovimentacao,
  type CaixaResumo
} from "@/services/caixaService";
import { listarPedidos, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency, maskCurrency, parseCurrency } from "@/utils/formatters";

type CaixaPageProps = {
  usuarioId: number;
};

type CaixaForm = {
  tipo: "ENTRADA" | "SAIDA";
  pedidoId: string;
  formaPagamento: string;
  categoria: string;
  descricao: string;
  valor: string;
  observacao: string;
};

const emptyResumo: CaixaResumo = {
  entradas: 0,
  saidas: 0,
  saldo: 0,
  dinheiro: 0,
  pix: 0,
  cartaoCredito: 0,
  cartaoDebito: 0
};

const emptyForm: CaixaForm = {
  tipo: "ENTRADA",
  pedidoId: "",
  formaPagamento: "DINHEIRO",
  categoria: "",
  descricao: "",
  valor: formatCurrency(0),
  observacao: ""
};

const categoriasPadrao = [
  "Serviço avulso",
  "Troco inicial",
  "Ajuste de caixa",
  "Material de limpeza",
  "Compra emergencial",
  "Transporte",
  "Alimentação",
  "Sangria de caixa"
];

export function CaixaPage({ usuarioId }: CaixaPageProps) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [inicio, setInicio] = useState(`${mesAtual}-01`);
  const [fim, setFim] = useState(`${mesAtual}-${String(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
  const [resumo, setResumo] = useState<CaixaResumo>(emptyResumo);
  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [form, setForm] = useState<CaixaForm>(emptyForm);
  const [categorias, setCategorias] = useState(categoriasPadrao);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filtros = useMemo(() => ({ inicio, fim }), [inicio, fim]);
  const podeSalvar = form.categoria.trim().length > 1 && form.descricao.trim().length > 2 && parseCurrency(form.valor) > 0;
  const pedidosEmAberto = pedidos.filter(
    (pedido) =>
      String(pedido.tipo).toLowerCase() !== "orcamento" &&
      String(pedido.status).toLowerCase() !== "cancelado" &&
      String(pedido.status).toLowerCase() !== "finalizado" &&
      pedido.saldoDevedor > 0
  );
  const pedidoSelecionado = pedidosEmAberto.find((pedido) => String(pedido.id) === form.pedidoId);

  useEffect(() => {
    carregarCaixa();
  }, [filtros]);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    await listarPedidos().then(setPedidos).catch(() => setPedidos([]));
  }

  async function carregarCaixa() {
    const [resumoResponse, movimentacoesResponse] = await Promise.all([
      obterResumoCaixa(filtros).catch(() => emptyResumo),
      listarMovimentacoesCaixa(filtros).catch(() => [])
    ]);
    setResumo(resumoResponse);
    setMovimentacoes(movimentacoesResponse);
  }

  async function salvarMovimentacao() {
    setMensagem(null);
    setIsSaving(true);

    try {
      await criarMovimentacaoCaixa({
        usuarioId,
        pedidoId: form.tipo === "ENTRADA" && form.pedidoId ? Number(form.pedidoId) : null,
        tipo: form.tipo,
        formaPagamento: form.formaPagamento,
        categoria: form.categoria.trim(),
        descricao: form.descricao.trim(),
        valor: parseCurrency(form.valor),
        observacao: form.observacao.trim() || null
      });
      setForm(emptyForm);
      setMensagem("Movimentação de caixa registrada com sucesso.");
      await carregarCaixa();
      await carregarPedidos();
    } catch {
      setMensagem("Não foi possível registrar a movimentação de caixa.");
    } finally {
      setIsSaving(false);
    }
  }

  function salvarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) {
      return;
    }

    setCategorias((current) => [...new Set([...current, nome])].sort((a, b) => a.localeCompare(b, "pt-BR")));
    setForm((current) => ({ ...current, categoria: nome }));
    setNovaCategoria("");
    setCategoriaModalOpen(false);
  }

  function selecionarPedido(pedidoId: string) {
    const pedido = pedidosEmAberto.find((item) => String(item.id) === pedidoId);
    setForm((current) => ({
      ...current,
      pedidoId,
      categoria: pedido ? "Pedido" : current.categoria,
      descricao: pedido ? `Pagamento do pedido ${pedido.numero} - ${pedido.cliente}` : current.descricao,
      valor: pedido ? formatCurrency(pedido.saldoDevedor) : current.valor
    }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Controle de caixa</h1>
        <p className="text-sm text-muted-foreground">Entradas de pedidos, recebimentos avulsos e saídas operacionais</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto]">
          <label>
            <span className="field-label">Data início</span>
            <Input className="mt-2" type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} />
          </label>
          <label>
            <span className="field-label">Data final</span>
            <Input className="mt-2" type="date" value={fim} onChange={(event) => setFim(event.target.value)} />
          </label>
          <Button className="self-end" variant="outline" onClick={carregarCaixa}>
            Filtrar
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Entradas" value={formatCurrency(resumo.entradas)} tone="green" />
        <Metric title="Saídas" value={formatCurrency(resumo.saidas)} tone="rose" />
        <Metric title="Saldo caixa" value={formatCurrency(resumo.saldo)} tone="cyan" />
        <Metric title="Dinheiro" value={formatCurrency(resumo.dinheiro)} tone="amber" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Metric title="PIX" value={formatCurrency(resumo.pix)} tone="green" />
        <Metric title="Cartão crédito" value={formatCurrency(resumo.cartaoCredito)} tone="cyan" />
        <Metric title="Cartão débito" value={formatCurrency(resumo.cartaoDebito)} tone="cyan" />
      </section>

      {mensagem && (
        <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
          {mensagem}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Nova movimentação manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label>
              <span className="field-label">Tipo</span>
              <Select value={form.tipo} onChange={(value) => setForm((current) => ({ ...current, tipo: value as "ENTRADA" | "SAIDA", pedidoId: value === "SAIDA" ? "" : current.pedidoId }))}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
              </Select>
            </label>
            {form.tipo === "ENTRADA" && (
              <label>
                <span className="field-label">Vincular a pedido</span>
                <Select value={form.pedidoId} onChange={selecionarPedido}>
                  <option value="">Entrada sem pedido</option>
                  {pedidosEmAberto.map((pedido) => (
                    <option key={pedido.id} value={pedido.id}>
                      #{pedido.numero} - {pedido.cliente} - saldo {formatCurrency(pedido.saldoDevedor)}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            {pedidoSelecionado && (
              <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
                O valor registrado será abatido do saldo do pedido. Saldo atual: {formatCurrency(pedidoSelecionado.saldoDevedor)}.
              </p>
            )}
            <label>
              <span className="field-label">Forma de pagamento</span>
              <Select value={form.formaPagamento} onChange={(value) => setForm((current) => ({ ...current, formaPagamento: value }))}>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CARTAO_CREDITO">Cartão crédito</option>
                <option value="CARTAO_DEBITO">Cartão débito</option>
              </Select>
            </label>
            <label>
              <span className="field-label">Motivo/Categoria</span>
              <div className="mt-2 flex gap-2">
                <Select className="mt-0" value={form.categoria} onChange={(value) => setForm((current) => ({ ...current, categoria: value }))}>
                  <option value="">Selecione</option>
                  {categorias.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </Select>
                <Button type="button" variant="outline" onClick={() => setCategoriaModalOpen(true)}>
                  Nova
                </Button>
              </div>
            </label>
            <Field label="Descrição" value={form.descricao} onChange={(value) => setForm((current) => ({ ...current, descricao: value }))} />
            <Field label="Valor" value={form.valor} onChange={(value) => setForm((current) => ({ ...current, valor: maskCurrency(value) }))} />
            <label className="space-y-2">
              <span className="field-label">Observação</span>
              <Textarea value={form.observacao} onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))} maxLength={300} />
            </label>
            <Button onClick={salvarMovimentacao} disabled={isSaving || !podeSalvar}>
              {isSaving ? "Registrando..." : "Registrar movimentação"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações do caixa</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell>{formatDateTime(mov.movimentadoEm)}</TableCell>
                    <TableCell>
                      <Badge tone={mov.tipo === "ENTRADA" ? "success" : "danger"}>{mov.tipo === "ENTRADA" ? "Entrada" : "Saída"}</Badge>
                    </TableCell>
                    <TableCell>{formatFormaPagamento(mov.formaPagamento)}</TableCell>
                    <TableCell>{mov.categoria}</TableCell>
                    <TableCell>{mov.descricao}</TableCell>
                    <TableCell>{formatCurrency(mov.valor)}</TableCell>
                    <TableCell>
                      <Badge tone={mov.origem === "PEDIDO" ? "success" : "warning"}>{mov.origem === "PEDIDO" ? "Pedido" : "Manual"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {categoriaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle>Nova categoria do caixa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nome da categoria" value={novaCategoria} onChange={setNovaCategoria} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCategoriaModalOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={salvarCategoria} disabled={!novaCategoria.trim()}>
                  Salvar categoria
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <Input className="mt-2" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      className={cn("mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "green" | "rose" | "amber" | "cyan" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  };
  return (
    <Card className={colors[tone]}>
      <CardContent className="p-5">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        <p className="mt-2 text-2xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatFormaPagamento(value: string) {
  const labels: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    CARTAO_CREDITO: "Cartão crédito",
    CARTAO_DEBITO: "Cartão débito"
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}
