import { XCircle } from "lucide-react";
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
  "ServiÃ§o avulso",
  "Troco inicial",
  "Ajuste de caixa",
  "Material de limpeza",
  "Compra emergencial",
  "Transporte",
  "AlimentaÃ§Ã£o",
  "Sangria de caixa"
];

export function CaixaPage({ usuarioId }: CaixaPageProps) {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const [inicio, setInicio] = useState(`${mesAtual}-01`);
  const [fim, setFim] = useState(`${mesAtual}-${String(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
  const [resumo, setResumo] = useState<CaixaResumo>(emptyResumo);
  const [movimentacoes, setMovimentacoes] = useState<CaixaMovimentacao[]>([]);
  const [paginaMovimentacoes, setPaginaMovimentacoes] = useState(1);
  const [totalMovimentacoes, setTotalMovimentacoes] = useState(0);
  const [totalPaginasMovimentacoes, setTotalPaginasMovimentacoes] = useState(1);
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
  }, [filtros, paginaMovimentacoes]);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    await listarPedidos({ tamanhoPagina: 100 }).then((resultado) => setPedidos(resultado.itens)).catch(() => setPedidos([]));
  }

  function limparFiltros() {
    const hojeAtual = new Date();
    const mesAtualFiltro = `${hojeAtual.getFullYear()}-${String(hojeAtual.getMonth() + 1).padStart(2, "0")}`;
    setInicio(`${mesAtualFiltro}-01`);
    setFim(`${mesAtualFiltro}-${String(new Date(hojeAtual.getFullYear(), hojeAtual.getMonth() + 1, 0).getDate()).padStart(2, "0")}`);
    setPaginaMovimentacoes(1);
  }

  async function carregarCaixa() {
    const [resumoResponse, movimentacoesResponse] = await Promise.all([
      obterResumoCaixa(filtros).catch(() => emptyResumo),
      listarMovimentacoesCaixa({ ...filtros, pagina: paginaMovimentacoes, tamanhoPagina: 10 }).catch(() => ({ itens: [], total: 0, pagina: 1, tamanhoPagina: 10, totalPaginas: 1 }))
    ]);
    setResumo(resumoResponse);
    setMovimentacoes(movimentacoesResponse.itens);
    setPaginaMovimentacoes(movimentacoesResponse.pagina);
    setTotalMovimentacoes(movimentacoesResponse.total);
    setTotalPaginasMovimentacoes(movimentacoesResponse.totalPaginas);
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
      setMensagem("MovimentaÃ§Ã£o de caixa registrada com sucesso.");
      await carregarCaixa();
      await carregarPedidos();
    } catch {
      setMensagem("Nao foi possivel registrar a movimentacao de caixa.");
    } finally {
      setIsSaving(false);
    }
  }

  function salvarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) return;

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
        <p className="text-sm text-muted-foreground">Entradas de pedidos, recebimentos avulsos e saÃ­das operacionais</p>
      </div>

      <Card>
        <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto_auto]">
          <label>
            <span className="field-label">Data inÃ­cio</span>
            <Input className="mt-2" type="date" value={inicio} onChange={(event) => setInicio(event.target.value)} />
          </label>
          <label>
            <span className="field-label">Data final</span>
            <Input className="mt-2" type="date" value={fim} onChange={(event) => setFim(event.target.value)} />
          </label>
          <Button className="self-end" variant="outline" onClick={carregarCaixa}>
            Filtrar
          </Button>
          <Button className="self-end" variant="outline" onClick={limparFiltros}>
            <XCircle size={16} />
            Limpar
          </Button>
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Entradas" value={formatCurrency(resumo.entradas)} tone="green" />
        <Metric title="SaÃ­das" value={formatCurrency(resumo.saidas)} tone="rose" />
        <Metric title="Saldo caixa" value={formatCurrency(resumo.saldo)} tone="cyan" />
        <Metric title="Dinheiro" value={formatCurrency(resumo.dinheiro)} tone="amber" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric title="PIX" value={formatCurrency(resumo.pix)} tone="green" />
        <Metric title="CartÃ£o crÃ©dito" value={formatCurrency(resumo.cartaoCredito)} tone="cyan" />
        <Metric title="CartÃ£o dÃ©bito" value={formatCurrency(resumo.cartaoDebito)} tone="cyan" />
      </section>

      {mensagem && (
        <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
          {mensagem}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Nova movimentaÃ§Ã£o manual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label>
              <span className="field-label">Tipo</span>
              <Select value={form.tipo} onChange={(value) => setForm((current) => ({ ...current, tipo: value as "ENTRADA" | "SAIDA", pedidoId: value === "SAIDA" ? "" : current.pedidoId }))}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">SaÃ­da</option>
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
                O valor registrado sera abatido do saldo do pedido. Saldo atual: {formatCurrency(pedidoSelecionado.saldoDevedor)}.
              </p>
            )}
            <label>
              <span className="field-label">Forma de pagamento</span>
              <Select value={form.formaPagamento} onChange={(value) => setForm((current) => ({ ...current, formaPagamento: value }))}>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="PIX">PIX</option>
                <option value="CARTAO_CREDITO">CartÃ£o crÃ©dito</option>
                <option value="CARTAO_DEBITO">CartÃ£o dÃ©bito</option>
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
            <Field label="DescriÃ§Ã£o" value={form.descricao} onChange={(value) => setForm((current) => ({ ...current, descricao: value }))} />
            <Field label="Valor" value={form.valor} onChange={(value) => setForm((current) => ({ ...current, valor: maskCurrency(value) }))} />
            <label className="space-y-2">
              <span className="field-label">ObservaÃ§Ã£o</span>
              <Textarea value={form.observacao} onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))} maxLength={300} />
            </label>
            <Button onClick={salvarMovimentacao} disabled={isSaving || !podeSalvar}>
              {isSaving ? "Registrando..." : "Registrar movimentaÃ§Ã£o"}
            </Button>
          </CardContent>
        </Card>

        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>MovimentaÃ§Ãµes do caixa</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Forma</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>DescriÃ§Ã£o</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>UsuÃ¡rio</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((mov) => (
                  <TableRow key={mov.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(mov.movimentadoEm)}</TableCell>
                    <TableCell>
                      <Badge tone={mov.tipo === "ENTRADA" ? "success" : "danger"}>{mov.tipo === "ENTRADA" ? "Entrada" : "SaÃ­da"}</Badge>
                    </TableCell>
                    <TableCell>{formatFormaPagamento(mov.formaPagamento)}</TableCell>
                    <TableCell className="min-w-36 whitespace-normal">{mov.categoria}</TableCell>
                    <TableCell className="min-w-64 whitespace-normal">{mov.descricao}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(mov.valor)}</TableCell>
                    <TableCell className="min-w-32">{mov.usuario || "-"}</TableCell>
                    <TableCell>
                      <Badge tone={mov.origem === "PEDIDO" ? "success" : "warning"}>{mov.origem === "PEDIDO" ? "Pedido" : "Manual"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{totalMovimentacoes} movimentacao{totalMovimentacoes === 1 ? "" : "es"} encontradas</p>
              <div className="flex gap-2">
                <Button variant="outline" disabled={paginaMovimentacoes <= 1} onClick={() => setPaginaMovimentacoes((page) => Math.max(1, page - 1))}>Anterior</Button>
                <Button variant="outline" disabled={paginaMovimentacoes >= totalPaginasMovimentacoes} onClick={() => setPaginaMovimentacoes((page) => page + 1)}>Proxima</Button>
              </div>
            </div>
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
    CARTAO_CREDITO: "CartÃ£o crÃ©dito",
    CARTAO_DEBITO: "CartÃ£o dÃ©bito"
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

