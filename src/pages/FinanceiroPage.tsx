import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  atualizarDespesa,
  criarDespesa,
  obterDespesasFinanceiro,
  obterEntradasFinanceiro,
  obterGraficosFinanceiro,
  obterVendasFinanceiro,
  pagarDespesa,
  type Despesa,
  type DespesasFinanceiro,
  type EntradasFinanceiro,
  type FinanceiroFiltros,
  type GraficosFinanceiro,
  type VendasFinanceiro
} from "@/services/financeiroService";
import { formatCurrency, formatDate, maskCurrency, parseCurrency } from "@/utils/formatters";

type FinanceiroPageProps = {
  usuarioId: number;
};

type DespesaForm = {
  categoria: string;
  novaCategoria: string;
  descricao: string;
  valor: string;
  vencimento: string;
  condicaoPagamento: "A_VISTA" | "PARCELADO";
  quantidadeParcelas: string;
  observacao: string;
  jaPago: boolean;
};

const hoje = new Date();
const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
const anoAtual = String(hoje.getFullYear());
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

const emptyVendas: VendasFinanceiro = {
  resumo: {
    totalVendas: 0,
    valorRecebido: 0,
    valorPendente: 0,
    quantidadePedidos: 0,
    quantidadeDevolucoes: 0,
    valorDevolvido: 0,
    pedidosEmAndamento: 0,
    valorEntrouHoje: 0
  },
  pedidos: { itens: [], total: 0, pagina: 1, tamanhoPagina: 10, totalPaginas: 1 }
};

const emptyEntradas: EntradasFinanceiro = {
  resumo: { total: 0, dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, entrouHoje: 0 },
  entradas: { itens: [], total: 0, pagina: 1, tamanhoPagina: 10, totalPaginas: 1 }
};

const emptyDespesas: DespesasFinanceiro = {
  resumo: { totalDespesas: 0, vencimentoHoje: 0, valorVencimentoHoje: 0, totalMes: 0, totalNaoPagoMes: 0, totalPagoMes: 0 },
  categorias: ["Água", "Luz", "Funcionários", "13º", "Contador", "Fornecedor", "Material", "Limpeza"],
  despesas: []
};

const emptyGraficos: GraficosFinanceiro = {
  ano: Number(anoAtual),
  mes: Number(mesAtual),
  receitaAnual: [],
  despesaAnual: [],
  despesasMes: [],
  clientesMes: [],
  pedidosPorStatus: [],
  usuariosRanking: []
};

const emptyForm: DespesaForm = {
  categoria: "",
  novaCategoria: "",
  descricao: "",
  valor: formatCurrency(0),
  vencimento: new Date().toISOString().slice(0, 10),
  condicaoPagamento: "A_VISTA",
  quantidadeParcelas: "2",
  observacao: "",
  jaPago: false
};

export function FinanceiroPage({ usuarioId }: FinanceiroPageProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("Vendas");
  const [ano, setAno] = useState(anoAtual);
  const [mes, setMes] = useState(mesAtual);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [status, setStatus] = useState("");
  const [vendas, setVendas] = useState<VendasFinanceiro>(emptyVendas);
  const [entradas, setEntradas] = useState<EntradasFinanceiro>(emptyEntradas);
  const [despesas, setDespesas] = useState<DespesasFinanceiro>(emptyDespesas);
  const [graficos, setGraficos] = useState<GraficosFinanceiro>(emptyGraficos);
  const [form, setForm] = useState<DespesaForm>(emptyForm);
  const [grupoEditando, setGrupoEditando] = useState<DespesaGrupo | null>(null);
  const [paginaVendas, setPaginaVendas] = useState(1);
  const [paginaEntradas, setPaginaEntradas] = useState(1);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const filtros = useMemo<FinanceiroFiltros>(() => {
    if (dataInicio || dataFinal) {
      return { inicio: dataInicio || undefined, fim: dataFinal || undefined, status: status || undefined };
    }
    return { ano, mes, status: status || undefined };
  }, [ano, dataFinal, dataInicio, mes, status]);

  useEffect(() => {
    setPaginaVendas(1);
    setPaginaEntradas(1);
  }, [ano, dataFinal, dataInicio, mes, status]);

  const financeiroQuery = useQuery({
    queryKey: ["financeiro", filtros, paginaVendas, paginaEntradas, ano, mes],
    queryFn: async () => {
      const [vendasResponse, entradasResponse, despesasResponse, graficosResponse] = await Promise.all([
        obterVendasFinanceiro({ ...filtros, pagina: paginaVendas, tamanhoPagina: 10 }),
        obterEntradasFinanceiro({ ...filtros, pagina: paginaEntradas, tamanhoPagina: 10 }),
        obterDespesasFinanceiro(filtros),
        obterGraficosFinanceiro({ ano, mes })
      ]);
      return { vendasResponse, entradasResponse, despesasResponse, graficosResponse };
    },
    placeholderData: {
      vendasResponse: emptyVendas,
      entradasResponse: emptyEntradas,
      despesasResponse: emptyDespesas,
      graficosResponse: emptyGraficos
    }
  });

  useEffect(() => {
    const data = financeiroQuery.data;
    if (!data) return;
    setVendas(data.vendasResponse);
    setEntradas(data.entradasResponse);
    setDespesas({ ...data.despesasResponse, categorias: normalizarCategorias([...emptyDespesas.categorias, ...data.despesasResponse.categorias]) });
    setGraficos(data.graficosResponse);
  }, [financeiroQuery.data]);

  const despesaMutation = useMutation({
    mutationFn: async () => {
      const categoria = form.categoria === "__nova" ? form.novaCategoria.trim() : form.categoria;
      const valor = parseCurrency(form.valor);
      if (!categoria || !form.descricao.trim() || valor <= 0) throw new Error("Informe categoria, descricao e valor da despesa.");
      if (grupoEditando) {
        await atualizarDespesa(grupoEditando.id, { categoria, descricao: form.descricao.trim(), valor, vencimento: form.vencimento, observacao: form.observacao.trim() || null });
        return "editada" as const;
      }
      await criarDespesa({ usuarioId, categoria, descricao: form.descricao.trim(), valor, vencimento: form.vencimento, condicaoPagamento: form.condicaoPagamento, quantidadeParcelas: form.condicaoPagamento === "PARCELADO" ? Number(form.quantidadeParcelas || 1) : 1, observacao: form.observacao.trim() || null, jaPago: form.jaPago });
      return "criada" as const;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      setGrupoEditando(null);
      setForm(emptyForm);
      setMensagem(result === "editada" ? "Despesa atualizada com sucesso." : "Despesa cadastrada com sucesso.");
    },
    onError: (error) => setMensagem(error instanceof Error ? error.message : "Nao foi possivel cadastrar a despesa.")
  });

  const pagarDespesaMutation = useMutation({
    mutationFn: pagarDespesa,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["financeiro"] });
      setMensagem("Despesa marcada como paga.");
    },
    onError: (error) => setMensagem(error instanceof Error ? error.message : "Nao foi possivel marcar a despesa como paga.")
  });
  function limparFiltro() {
    setAno(anoAtual);
    setMes(mesAtual);
    setDataInicio("");
    setDataFinal("");
    setStatus("");
  }

  function salvarDespesa() {
    setMensagem(null);
    despesaMutation.mutate();
  }

  function marcarPaga(id: number) {
    pagarDespesaMutation.mutate(id);
  }

  const isSavingMutation = despesaMutation.isPending || pagarDespesaMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Controle completo de vendas, entradas, saídas e clientes</p>
      </div>

      <Tabs tabs={["Vendas", "Entradas", "Despesas", "Gráficos", "Clientes"]} active={tab} onChange={setTab} />

      <FiltroFinanceiro ano={ano} mes={mes} dataInicio={dataInicio} dataFinal={dataFinal} status={status} setAno={setAno} setMes={setMes} setDataInicio={setDataInicio} setDataFinal={setDataFinal} setStatus={setStatus} onClear={limparFiltro} />

      {mensagem && <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">{mensagem}</p>}

      {tab === "Vendas" && <Vendas data={vendas} onPageChange={setPaginaVendas} />}
      {tab === "Entradas" && <Entradas data={entradas} onPageChange={setPaginaEntradas} />}
      {tab === "Despesas" && <Despesas data={despesas} form={form} setForm={setForm} expanded={expanded} setExpanded={setExpanded} grupoEditando={grupoEditando} setGrupoEditando={setGrupoEditando} onSave={salvarDespesa} onPay={marcarPaga} isSaving={isSaving || isSavingMutation} />}
      {tab === "Gráficos" && <Graficos data={graficos} />}
      {tab === "Clientes" && <Clientes data={graficos} />}
    </div>
  );
}

function FiltroFinanceiro({ ano, mes, dataInicio, dataFinal, status, setAno, setMes, setDataInicio, setDataFinal, setStatus, onClear }: {
  ano: string;
  mes: string;
  dataInicio: string;
  dataFinal: string;
  status: string;
  setAno: (value: string) => void;
  setMes: (value: string) => void;
  setDataInicio: (value: string) => void;
  setDataFinal: (value: string) => void;
  setStatus: (value: string) => void;
  onClear: () => void;
}) {
  const periodoAtivo = Boolean(dataInicio || dataFinal);
  return (
    <Card>
      <CardContent className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-[120px_180px_1fr_1fr_180px_auto]">
        <Field label="Ano"><Input value={ano} onChange={(event) => setAno(event.target.value)} disabled={periodoAtivo} /></Field>
        <Field label="Mês">
          <Select value={mes} onChange={setMes} disabled={periodoAtivo}>
            {meses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </Select>
        </Field>
        <Field label="Data início"><Input type="date" value={dataInicio} onChange={(event) => setDataInicio(event.target.value)} /></Field>
        <Field label="Data final"><Input type="date" value={dataFinal} onChange={(event) => setDataFinal(event.target.value)} /></Field>
        <Field label="Status pedido">
          <Select value={status} onChange={setStatus}>
            <option value="">Todos</option>
            <option value="ABERTO">Aberto</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="CANCELADO">Cancelado</option>
          </Select>
        </Field>
        <Button className="self-end" variant="outline" onClick={onClear}>Limpar</Button>
      </CardContent>
    </Card>
  );
}

function Vendas({ data, onPageChange }: { data: VendasFinanceiro; onPageChange: (pagina: number) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Valor recebido" value={formatCurrency(data.resumo.valorRecebido)} tone="green" />
        <Metric title="Devoluções" value={String(data.resumo.quantidadeDevolucoes)} tone="rose" />
        <Metric title="Valor devolvido" value={formatCurrency(data.resumo.valorDevolvido)} tone="rose" />
        <Metric title="Pedidos em andamento" value={String(data.resumo.pedidosEmAndamento)} tone="cyan" />
        <Metric title="Falta receber" value={formatCurrency(data.resumo.valorPendente)} tone="amber" />
        <Metric title="Entrou hoje" value={formatCurrency(data.resumo.valorEntrouHoje)} tone="green" />
        <Metric title="Qtd. pedidos" value={String(data.resumo.quantidadePedidos)} tone="cyan" />
        <Metric title="Total vendido" value={formatCurrency(data.resumo.totalVendas)} tone="amber" />
      </section>
      <Card>
        <CardHeader><CardTitle>Consolidado de vendas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead>Criado por</TableHead><TableHead>Total</TableHead><TableHead>Entrou</TableHead><TableHead>Devolução</TableHead><TableHead>Saiu</TableHead><TableHead>Falta pagar</TableHead><TableHead>Entrega</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.pedidos.itens.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell>{pedido.numero}</TableCell>
                  <TableCell>{pedido.cliente}</TableCell>
                  <TableCell><Badge tone={statusTone(pedido.status)}>{formatStatus(pedido.status)}</Badge></TableCell>
                  <TableCell>{pedido.criadoPor}</TableCell>
                  <TableCell>{formatCurrency(pedido.total)}</TableCell>
                  <TableCell>{formatCurrency(pedido.valorPago)}</TableCell>
                  <TableCell>{pedido.valorEstornado > 0 ? formatCurrency(pedido.valorEstornado) : "-"}</TableCell>
                  <TableCell>{pedido.valorEstornado > 0 ? formatCurrency(pedido.valorEstornado) : "-"}</TableCell>
                  <TableCell>{formatCurrency(pedido.saldoDevedor)}</TableCell>
                  <TableCell>{formatDate(pedido.dataEntrega)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Paginacao total={data.pedidos.total} pagina={data.pedidos.pagina} totalPaginas={data.pedidos.totalPaginas} onPageChange={onPageChange} label="pedido" />
        </CardContent>
      </Card>
    </div>
  );
}

function Entradas({ data, onPageChange }: { data: EntradasFinanceiro; onPageChange: (pagina: number) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metric title="Total entradas" value={formatCurrency(data.resumo.total)} tone="green" />
        <Metric title="Dinheiro" value={formatCurrency(data.resumo.dinheiro)} tone="amber" />
        <Metric title="PIX" value={formatCurrency(data.resumo.pix)} tone="green" />
        <Metric title="Cartões" value={formatCurrency(data.resumo.cartaoCredito + data.resumo.cartaoDebito)} tone="cyan" />
        <Metric title="Entrou hoje" value={formatCurrency(data.resumo.entrouHoje)} tone="green" />
      </section>
      <Card>
        <CardHeader><CardTitle>Entradas registradas</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Forma</TableHead><TableHead>Origem</TableHead><TableHead>Descrição</TableHead><TableHead>Usuário</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
            <TableBody>{data.entradas.itens.map((entrada, index) => <TableRow key={`${entrada.data}-${index}`}><TableCell>{formatDateTime(entrada.data)}</TableCell><TableCell>{formatForma(entrada.formaPagamento)}</TableCell><TableCell>{entrada.origem}</TableCell><TableCell>{entrada.descricao}</TableCell><TableCell>{entrada.usuario}</TableCell><TableCell className="font-bold">{formatCurrency(entrada.valor)}</TableCell></TableRow>)}</TableBody>
          </Table>
          <Paginacao total={data.entradas.total} pagina={data.entradas.pagina} totalPaginas={data.entradas.totalPaginas} onPageChange={onPageChange} label="entrada" />
        </CardContent>
      </Card>
    </div>
  );
}

function Despesas({ data, form, setForm, expanded, setExpanded, grupoEditando, setGrupoEditando, onSave, onPay, isSaving }: { data: DespesasFinanceiro; form: DespesaForm; setForm: React.Dispatch<React.SetStateAction<DespesaForm>>; expanded: Record<string, boolean>; setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>; grupoEditando: DespesaGrupo | null; setGrupoEditando: React.Dispatch<React.SetStateAction<DespesaGrupo | null>>; onSave: () => void; onPay: (id: number) => void; isSaving: boolean }) {
  const grupos = useMemo(() => agruparDespesas(data.despesas), [data.despesas]);
  const [paginaDespesas, setPaginaDespesas] = useState(1);
  const tamanhoPaginaDespesas = 10;
  const totalPaginasDespesas = Math.max(1, Math.ceil(grupos.length / tamanhoPaginaDespesas));
  const paginaAtualDespesas = Math.min(paginaDespesas, totalPaginasDespesas);
  const gruposPaginados = grupos.slice((paginaAtualDespesas - 1) * tamanhoPaginaDespesas, paginaAtualDespesas * tamanhoPaginaDespesas);
  useEffect(() => {
    setPaginaDespesas(1);
  }, [data.despesas]);
  const parcelasPreview = buildParcelasPreview(parseCurrency(form.valor), form.vencimento, form.condicaoPagamento === "PARCELADO" ? Number(form.quantidadeParcelas || 1) : 1);

  function editarGrupo(grupo: DespesaGrupo) {
    const primeiraParcela = grupo.parcelas[0];
    setGrupoEditando(grupo);
    setForm({
      categoria: grupo.categoria,
      novaCategoria: "",
      descricao: grupo.descricao,
      valor: formatCurrency(grupo.valorTotal),
      vencimento: primeiraParcela?.vencimento ?? new Date().toISOString().slice(0, 10),
      condicaoPagamento: grupo.parcelas.length > 1 ? "PARCELADO" : "A_VISTA",
      quantidadeParcelas: String(grupo.parcelas.length || 1),
      observacao: primeiraParcela?.observacao ?? "",
      jaPago: grupo.valorAberto <= 0
    });
  }

  function cancelarEdicao() {
    setGrupoEditando(null);
    setForm(emptyForm);
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric title="Despesas cadastradas" value={String(data.resumo.totalDespesas)} tone="cyan" />
        <Metric title="Vencem hoje" value={String(data.resumo.vencimentoHoje)} tone="rose" />
        <Metric title="Valor vence hoje" value={formatCurrency(data.resumo.valorVencimentoHoje)} tone="rose" />
        <Metric title="Gastos do mês" value={formatCurrency(data.resumo.totalMes)} tone="amber" />
        <Metric title="Não pagas" value={formatCurrency(data.resumo.totalNaoPagoMes)} tone="rose" />
        <Metric title="Pago no mês" value={formatCurrency(data.resumo.totalPagoMes)} tone="green" />
      </section>
      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card>
          <CardHeader><CardTitle>{grupoEditando ? "Editar despesa" : "Nova despesa"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {grupoEditando && <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Editando despesa {grupoEditando.descricao}. As parcelas do grupo serao recalculadas.</p>}
            <Field label="Categoria">
              <Select value={form.categoria} onChange={(value) => setForm((current) => ({ ...current, categoria: value }))}>
                <option value="">Selecione</option>
                {data.categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
                <option value="__nova">Criar nova categoria</option>
              </Select>
            </Field>
            {form.categoria === "__nova" && <Field label="Nova categoria"><Input value={form.novaCategoria} onChange={(event) => setForm((current) => ({ ...current, novaCategoria: event.target.value }))} /></Field>}
            <Field label="Descrição"><Input value={form.descricao} onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))} /></Field>
            <Field label="Valor total"><Input value={form.valor} onChange={(event) => setForm((current) => ({ ...current, valor: maskCurrency(event.target.value) }))} /></Field>
            <Field label="Vencimento inicial"><Input type="date" value={form.vencimento} onChange={(event) => setForm((current) => ({ ...current, vencimento: event.target.value }))} /></Field>
            <Field label="Condição"><Select value={form.condicaoPagamento} onChange={(value) => setForm((current) => ({ ...current, condicaoPagamento: value as DespesaForm["condicaoPagamento"] }))}><option value="A_VISTA">À vista</option><option value="PARCELADO">Parcelado</option></Select></Field>
            {form.condicaoPagamento === "PARCELADO" && <Field label="Quantidade de parcelas"><Input value={form.quantidadeParcelas} onChange={(event) => setForm((current) => ({ ...current, quantidadeParcelas: event.target.value.replace(/\D/g, "") }))} /></Field>}
            <Field label="Observação"><Input value={form.observacao} onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))} /></Field>
            {!grupoEditando && <label className="flex items-center gap-2 rounded-md border p-3 text-sm font-semibold"><input type="checkbox" checked={form.jaPago} onChange={(event) => setForm((current) => ({ ...current, jaPago: event.target.checked }))} /> Despesa ja foi paga</label>}
            {parcelasPreview.length > 1 && <div className="rounded-md border p-3 text-sm"><p className="mb-2 font-black">Prévia das parcelas</p>{parcelasPreview.map((parcela) => <p key={parcela.numero}>{parcela.numero}/{parcelasPreview.length} - {formatCurrency(parcela.valor)} - {formatDate(parcela.vencimento)}</p>)}</div>}
            <div className="flex flex-wrap gap-2">
              {grupoEditando && <Button variant="outline" onClick={cancelarEdicao} disabled={isSaving}>Cancelar edição</Button>}
              <Button onClick={onSave} disabled={isSaving}><Plus size={16} />{isSaving ? "Salvando..." : grupoEditando ? "Salvar alterações" : "Cadastrar despesa"}</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardHeader><CardTitle>Contas e despesas</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader><TableRow><TableHead></TableHead><TableHead>Categoria</TableHead><TableHead>Descrição</TableHead><TableHead>Parcelas</TableHead><TableHead>Valor total</TableHead><TableHead>Aberto</TableHead><TableHead>Status</TableHead><TableHead>Ação</TableHead></TableRow></TableHeader>
              <TableBody>
                {gruposPaginados.map((grupo) => (
                  <FragmentGroup key={grupo.id} grupo={grupo} expanded={Boolean(expanded[grupo.id])} onToggle={() => setExpanded((current) => ({ ...current, [grupo.id]: !current[grupo.id] }))} onEdit={editarGrupo} onPay={onPay} />
                ))}
              </TableBody>
            </Table>
            <Paginacao total={grupos.length} pagina={paginaAtualDespesas} totalPaginas={totalPaginasDespesas} onPageChange={setPaginaDespesas} label="despesa" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FragmentGroup({ grupo, expanded, onToggle, onEdit, onPay }: { grupo: DespesaGrupo; expanded: boolean; onToggle: () => void; onEdit: (grupo: DespesaGrupo) => void; onPay: (id: number) => void }) {
  return (
    <>
      <TableRow>
        <TableCell><Button size="icon" variant="ghost" onClick={onToggle}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</Button></TableCell>
        <TableCell>{grupo.categoria}</TableCell>
        <TableCell>{grupo.descricao}</TableCell>
        <TableCell>{grupo.parcelas.length} parcela(s)</TableCell>
        <TableCell>{formatCurrency(grupo.valorTotal)}</TableCell>
        <TableCell>{formatCurrency(grupo.valorAberto)}</TableCell>
        <TableCell><Badge tone={grupo.valorAberto > 0 ? "info" : "success"}>{grupo.valorAberto > 0 ? "Em aberto" : "Pago"}</Badge></TableCell>
        <TableCell><Button size="sm" variant="outline" onClick={() => onEdit(grupo)}>Editar</Button></TableCell>
      </TableRow>
      {expanded && grupo.parcelas.map((parcela) => {
        const venceHoje = parcela.vencimento === new Date().toISOString().slice(0, 10) && parcela.status !== "PAGO";
        return <TableRow key={parcela.id} className={cn(venceHoje && "bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200")}><TableCell></TableCell><TableCell>Parcela {parcela.numeroParcela}/{parcela.totalParcelas}</TableCell><TableCell>{formatDate(parcela.vencimento)}</TableCell><TableCell>{formatCurrency(parcela.valor)}</TableCell><TableCell>{parcela.status === "PAGO" ? "Pago" : "Aberto"}</TableCell><TableCell>{parcela.dataPagamento ? formatDate(parcela.dataPagamento) : "-"}</TableCell><TableCell>{parcela.status !== "PAGO" && <Button size="sm" variant="outline" onClick={() => onPay(parcela.id)}>Pagar</Button>}</TableCell></TableRow>;
      })}
    </>
  );
}

const CHART_COLORS = {
  receita: "#10b981",
  despesa: "#f43f5e",
  status: ["#3b82f6", "#10b981", "#f43f5e", "#f59e0b"],
  usuarios: ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff", "#818cf8", "#4f46e5", "#4338ca"]
};

const STATUS_LABELS: Record<string, string> = {
  ABERTO: "Aberto",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
  ORCADO: "Orçado"
};

function currencyTick(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
  return `R$ ${value}`;
}

function Graficos({ data }: { data: GraficosFinanceiro }) {
  const receitaData = data.receitaAnual.map((item) => ({
    mes: item.mes !== undefined ? (meses[item.mes - 1]?.[1]?.slice(0, 3) ?? String(item.mes)) : "",
    receita: item.valor
  }));

  const despesaData = data.despesaAnual.map((item) => ({
    mes: item.mes !== undefined ? (meses[item.mes - 1]?.[1]?.slice(0, 3) ?? String(item.mes)) : "",
    despesa: item.valor
  }));

  const despesasMesData = data.despesasMes.map((item) => ({
    name: item.categoria ?? "",
    value: item.valor
  }));

  const statusData = (data.pedidosPorStatus ?? []).map((item) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.quantidade
  }));

  const usuariosData = (data.usuariosRanking ?? []).map((item) => ({
    usuario: item.usuario,
    pedidos: item.quantidadePedidos
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Receita anual</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={receitaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} width={64} />
                <Tooltip formatter={(value: any) => [formatCurrency(value), "Receita"]} />
                <Bar dataKey="receita" fill={CHART_COLORS.receita} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Despesas anuais</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={despesaData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={currencyTick} tick={{ fontSize: 11 }} width={64} />
                <Tooltip formatter={(value: any) => [formatCurrency(value), "Despesa"]} />
                <Bar dataKey="despesa" fill={CHART_COLORS.despesa} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Despesas por categoria (mês)</CardTitle></CardHeader>
          <CardContent>
            {despesasMesData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sem despesas registradas neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, despesasMesData.length * 44)}>
                <BarChart layout="vertical" data={despesasMesData} margin={{ top: 4, right: 80, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(value: any) => [formatCurrency(value), "Despesa"]} />
                  <Bar dataKey="value" fill={CHART_COLORS.despesa} radius={[0, 4, 4, 0]}>
                    {despesasMesData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS.status[index % CHART_COLORS.status.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pedidos por status (mês)</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum pedido registrado neste mês.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS.status[index % CHART_COLORS.status.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {usuariosData.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pedidos por atendente (mês)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(180, usuariosData.length * 44)}>
              <BarChart layout="vertical" data={usuariosData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="usuario" tick={{ fontSize: 12 }} width={110} />
                <Tooltip formatter={(value: any) => [value, "Pedidos"]} />
                <Bar dataKey="pedidos" radius={[0, 4, 4, 0]}>
                  {usuariosData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS.usuarios[index % CHART_COLORS.usuarios.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Clientes({ data }: { data: GraficosFinanceiro }) {
  const clientesData = (data.clientesMes ?? [])
    .map((item) => ({ cliente: item.cliente ?? "", valor: item.valor }))
    .filter((item) => item.cliente);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Clientes do mês</CardTitle></CardHeader>
        <CardContent>
          {clientesData.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma venda registrada para clientes neste período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, clientesData.length * 44)}>
              <BarChart layout="vertical" data={clientesData} margin={{ top: 4, right: 80, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tickFormatter={currencyTick} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="cliente" tick={{ fontSize: 12 }} width={130} />
                <Tooltip formatter={(value: any) => [formatCurrency(value), "Total comprado"]} />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                  {clientesData.map((_, index) => (
                    <Cell key={index} fill={CHART_COLORS.usuarios[index % CHART_COLORS.usuarios.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="field-label">{label}</span><div className="mt-2">{children}</div></label>; }
function Select({ value, onChange, children, disabled = false }: { value: string; onChange: (value: string) => void; children: React.ReactNode; disabled?: boolean }) { return <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{children}</select>; }
function Paginacao({ total, pagina, totalPaginas, onPageChange, label }: { total: number; pagina: number; totalPaginas: number; onPageChange: (pagina: number) => void; label: string }) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">{total} {label}{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}</p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={pagina <= 1} onClick={() => onPageChange(Math.max(1, pagina - 1))}>Anterior</Button>
        <Button variant="outline" disabled={pagina >= totalPaginas} onClick={() => onPageChange(pagina + 1)}>Proxima</Button>
      </div>
    </div>
  );
}
function Metric({ title, value, tone }: { title: string; value: string; tone: "green" | "cyan" | "amber" | "rose" }) { const colors = { green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300", amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300", rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300" }; return <Card className={colors[tone]}><CardContent className="p-5"><p className="text-sm font-semibold opacity-80">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></CardContent></Card>; }
function formatStatus(value: string) { return { ABERTO: "Aberto", FINALIZADO: "Finalizado", CANCELADO: "Cancelado", ORCADO: "Orçado" }[value] ?? value; }
function statusTone(value: string) { if (value === "FINALIZADO") return "success"; if (value === "CANCELADO") return "danger"; return "info"; }
function formatForma(value: string) { return { DINHEIRO: "Dinheiro", PIX: "PIX", CARTAO_CREDITO: "Cartão crédito", CARTAO_DEBITO: "Cartão débito" }[value] ?? value; }
function formatDateTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date); }

type DespesaGrupo = { id: string; categoria: string; descricao: string; valorTotal: number; valorAberto: number; parcelas: Despesa[] };
function agruparDespesas(despesas: Despesa[]): DespesaGrupo[] { const map = new Map<string, DespesaGrupo>(); despesas.forEach((despesa) => { const id = despesa.grupoDespesaId || String(despesa.id); const grupo = map.get(id) ?? { id, categoria: despesa.categoria, descricao: despesa.descricao, valorTotal: despesa.valorTotal || despesa.valor, valorAberto: 0, parcelas: [] }; grupo.parcelas.push(despesa); grupo.valorAberto = grupo.parcelas.filter((item) => item.status !== "PAGO").reduce((sum, item) => sum + item.valor, 0); map.set(id, grupo); }); return Array.from(map.values()); }
function normalizarCategorias(categorias: string[]) {
  const map = new Map<string, string>();
  categorias.forEach((categoria) => {
    const nome = categoria.trim();
    if (!nome) return;
    const chave = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (!map.has(chave)) map.set(chave, formatCategoria(nome));
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function formatCategoria(value: string) {
  return value.split(/s+/).map((word) => word.length <= 2 ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
}

function buildParcelasPreview(total: number, vencimento: string, quantidade: number) { if (total <= 0 || !vencimento) return []; const qtd = Math.max(1, quantidade); const parcela = Math.round((total / qtd) * 100) / 100; let restante = total; return Array.from({ length: qtd }, (_, index) => { const valor = index === qtd - 1 ? restante : parcela; restante -= valor; return { numero: index + 1, valor, vencimento: addMonths(vencimento, index) }; }); }
function addMonths(value: string, months: number) { const date = new Date(`${value}T00:00:00`); date.setMonth(date.getMonth() + months); return date.toISOString().slice(0, 10); }




