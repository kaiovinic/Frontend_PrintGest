import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import type { Page } from "@/components/AppLayout";
import { useForm, type UseFormRegisterReturn, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { criarMovimentacaoCaixa, listarMovimentacoesCaixa, obterResumoCaixa, type CaixaMovimentacao, type CaixaResumo } from "@/services/caixaService";
import { listarPedidos, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency, maskCurrency, parseCurrency } from "@/utils/formatters";

type CaixaPageProps = { usuarioId: number; setPage: (page: Page, pedido?: PedidoResumo | null) => void };
type CaixaFiltros = { inicio: string; fim: string };

const emptyResumo: CaixaResumo = { entradas: 0, saidas: 0, saldo: 0, dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0 };
const emptyMovimentacoes = { itens: [], total: 0, pagina: 1, tamanhoPagina: 10, totalPaginas: 1 };
const categoriasPadrao = ["Servico avulso", "Troco inicial", "Ajuste de caixa", "Material de limpeza", "Compra emergencial", "Transporte", "Alimentacao", "Sangria de caixa"];

const caixaSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA"]),
  pedidoId: z.string().optional(),
  formaPagamento: z.string().min(1, "Selecione a forma de pagamento."),
  categoria: z.string().trim().min(2, "Selecione a categoria."),
  descricao: z.string().trim().min(3, "Informe a descricao."),
  valor: z.string().refine((value) => parseCurrency(value) > 0, "Informe um valor maior que zero."),
  observacao: z.string().max(300, "A observacao deve ter no maximo 300 caracteres.").optional()
});

type CaixaForm = z.infer<typeof caixaSchema>;
const emptyForm: CaixaForm = { tipo: "ENTRADA", pedidoId: "", formaPagamento: "DINHEIRO", categoria: "", descricao: "", valor: formatCurrency(0), observacao: "" };

const categoriaSchema = z.object({ nome: z.string().trim().min(2, "Informe a categoria.") });
type CategoriaForm = z.infer<typeof categoriaSchema>;

function mesAtualFiltro(): CaixaFiltros {
  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  return { inicio: `${mesAtual}-01`, fim: `${mesAtual}-${String(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate()).padStart(2, "0")}` };
}

export function CaixaPage({ usuarioId, setPage }: CaixaPageProps) {
  const queryClient = useQueryClient();
  const [filtros, setFiltros] = useState<CaixaFiltros>(() => mesAtualFiltro());
  const [inicioInput, setInicioInput] = useState(filtros.inicio);
  const [fimInput, setFimInput] = useState(filtros.fim);
  const [paginaMovimentacoes, setPaginaMovimentacoes] = useState(1);
  const [categorias, setCategorias] = useState(categoriasPadrao);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const form = useForm<CaixaForm>({ resolver: zodResolver(caixaSchema), defaultValues: emptyForm });
  const categoriaForm = useForm<CategoriaForm>({ resolver: zodResolver(categoriaSchema), defaultValues: { nome: "" } });
  const tipo = form.watch("tipo");
  const pedidoId = form.watch("pedidoId");

  const resumoQuery = useQuery({ queryKey: ["caixa", "resumo", filtros], queryFn: () => obterResumoCaixa(filtros), placeholderData: emptyResumo });
  const movimentacoesQuery = useQuery({ queryKey: ["caixa", "movimentacoes", filtros, paginaMovimentacoes], queryFn: () => listarMovimentacoesCaixa({ ...filtros, pagina: paginaMovimentacoes, tamanhoPagina: 10 }), placeholderData: emptyMovimentacoes });
  const pedidosQuery = useQuery({ queryKey: ["pedidos", "caixa"], queryFn: () => listarPedidos({ tamanhoPagina: 100 }), placeholderData: { itens: [], total: 0, pagina: 1, tamanhoPagina: 100, totalPaginas: 1 } });

  const resumo = resumoQuery.data ?? emptyResumo;
  const movimentacoesResponse = movimentacoesQuery.data ?? emptyMovimentacoes;
  const pedidos = pedidosQuery.data?.itens ?? [];
  const pedidosEmAberto = useMemo(() => pedidos.filter((pedido) => String(pedido.tipo).toLowerCase() !== "orcamento" && String(pedido.status).toLowerCase() !== "cancelado" && String(pedido.status).toLowerCase() !== "finalizado" && pedido.saldoDevedor > 0), [pedidos]);
  const pedidoSelecionado = pedidosEmAberto.find((pedido) => String(pedido.id) === pedidoId);

  const movimentacaoMutation = useMutation({
    mutationFn: (values: CaixaForm) => criarMovimentacaoCaixa({ usuarioId, pedidoId: values.tipo === "ENTRADA" && values.pedidoId ? Number(values.pedidoId) : null, tipo: values.tipo, formaPagamento: values.formaPagamento, categoria: values.categoria.trim(), descricao: values.descricao.trim(), valor: parseCurrency(values.valor), observacao: values.observacao?.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["caixa"] });
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      form.reset(emptyForm);
      setMensagem("Movimentacao de caixa registrada com sucesso.");
    },
    onError: (error) => setMensagem(error instanceof Error ? error.message : "Nao foi possivel registrar a movimentacao de caixa.")
  });

  function aplicarFiltro() {
    setPaginaMovimentacoes(1);
    setFiltros({ inicio: inicioInput, fim: fimInput });
  }

  function limparFiltros() {
    const initial = mesAtualFiltro();
    setInicioInput(initial.inicio);
    setFimInput(initial.fim);
    setPaginaMovimentacoes(1);
    setFiltros(initial);
  }

  function salvarCategoria(values: CategoriaForm) {
    const nome = values.nome.trim();
    setCategorias((current) => [...new Set([...current, nome])].sort((a, b) => a.localeCompare(b, "pt-BR")));
    form.setValue("categoria", nome);
    categoriaForm.reset({ nome: "" });
    setCategoriaModalOpen(false);
  }

  function selecionarPedido(value: string) {
    const pedido = pedidosEmAberto.find((item) => String(item.id) === value);
    form.setValue("pedidoId", value);
    if (pedido) {
      form.setValue("categoria", "Pedido");
      form.setValue("descricao", `Pagamento do pedido ${pedido.numero} - ${pedido.cliente}`);
      form.setValue("valor", formatCurrency(pedido.saldoDevedor));
    }
  }

  const isSaving = movimentacaoMutation.isPending;

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-black">Controle de caixa</h1><p className="text-sm text-muted-foreground">Entradas de pedidos, recebimentos avulsos e saidas operacionais</p></div>
      <Card><CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_1fr_auto_auto]"><label><span className="field-label">Data inicio</span><Input className="mt-2" type="date" value={inicioInput} onChange={(event) => setInicioInput(event.target.value)} /></label><label><span className="field-label">Data final</span><Input className="mt-2" type="date" value={fimInput} onChange={(event) => setFimInput(event.target.value)} /></label><Button className="self-end" variant="outline" onClick={aplicarFiltro}>Filtrar</Button><Button className="self-end" variant="outline" onClick={limparFiltros}><XCircle size={16} />Limpar</Button></CardContent></Card>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric title="Entradas" value={formatCurrency(resumo.entradas)} tone="green" /><Metric title="Saidas" value={formatCurrency(resumo.saidas)} tone="rose" /><Metric title="Saldo caixa" value={formatCurrency(resumo.saldo)} tone="cyan" /><Metric title="Dinheiro" value={formatCurrency(resumo.dinheiro)} tone="amber" /></section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Metric title="PIX" value={formatCurrency(resumo.pix)} tone="green" /><Metric title="Cartao credito" value={formatCurrency(resumo.cartaoCredito)} tone="cyan" /><Metric title="Cartao debito" value={formatCurrency(resumo.cartaoDebito)} tone="cyan" /></section>
      {mensagem && <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">{mensagem}</p>}
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card><CardHeader><CardTitle>Nova movimentacao manual</CardTitle></CardHeader><CardContent><CaixaFormCard form={form} tipo={tipo} categorias={categorias} pedidosEmAberto={pedidosEmAberto} pedidoSelecionado={pedidoSelecionado} isSaving={isSaving} onNewCategory={() => setCategoriaModalOpen(true)} onSelectPedido={selecionarPedido} onSubmit={(values) => movimentacaoMutation.mutate(values)} /></CardContent></Card>
        <MovimentacoesCard movimentacoes={movimentacoesResponse.itens} isLoading={movimentacoesQuery.isLoading} total={movimentacoesResponse.total} pagina={movimentacoesResponse.pagina} totalPaginas={movimentacoesResponse.totalPaginas} onPageChange={setPaginaMovimentacoes} setPage={setPage} />
      </div>
      {categoriaModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><Card className="w-full max-w-md shadow-2xl"><CardHeader><CardTitle>Nova categoria do caixa</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={categoriaForm.handleSubmit(salvarCategoria)}><FieldError message={categoriaForm.formState.errors.nome?.message}><FieldInput label="Nome da categoria" register={categoriaForm.register("nome")} /></FieldError><div className="flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => setCategoriaModalOpen(false)}>Cancelar</Button><Button type="submit">Salvar categoria</Button></div></form></CardContent></Card></div>}
    </div>
  );
}

function CaixaFormCard({ form, tipo, categorias, pedidosEmAberto, pedidoSelecionado, isSaving, onNewCategory, onSelectPedido, onSubmit }: { form: UseFormReturn<CaixaForm>; tipo: "ENTRADA" | "SAIDA"; categorias: string[]; pedidosEmAberto: PedidoResumo[]; pedidoSelecionado?: PedidoResumo; isSaving: boolean; onNewCategory: () => void; onSelectPedido: (value: string) => void; onSubmit: (values: CaixaForm) => void }) {
  const formaPagamento = form.watch("formaPagamento");
  const valor = form.watch("valor");
  const [valorRecebido, setValorRecebido] = useState("");

  const valorNum = parseCurrency(valor);
  const valorRecebidoNum = parseCurrency(valorRecebido);
  const troco = Math.max(0, valorRecebidoNum - valorNum);

  return (
    <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
      <label>
        <span className="field-label">Tipo</span>
        <Select register={form.register("tipo", { onChange: (event) => { if (event.target.value === "SAIDA") form.setValue("pedidoId", ""); } })}>
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saida</option>
        </Select>
      </label>
      {tipo === "ENTRADA" && (
        <label>
          <span className="field-label">Vincular a pedido</span>
          <select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" value={form.watch("pedidoId") ?? ""} onChange={(event) => onSelectPedido(event.target.value)}>
            <option value="">Entrada sem pedido</option>
            {pedidosEmAberto.map((pedido) => <option key={pedido.id} value={pedido.id}>#{pedido.numero} - {pedido.cliente} - saldo {formatCurrency(pedido.saldoDevedor)}</option>)}
          </select>
        </label>
      )}
      {pedidoSelecionado && (
        <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
          O valor registrado sera abatido do saldo do pedido. Saldo atual: {formatCurrency(pedidoSelecionado.saldoDevedor)}.
        </p>
      )}
      <label>
        <span className="field-label">Forma de pagamento</span>
        <Select register={form.register("formaPagamento")}>
          <option value="DINHEIRO">Dinheiro</option>
          <option value="PIX">PIX</option>
          <option value="CARTAO_CREDITO">Cartao credito</option>
          <option value="CARTAO_DEBITO">Cartao debito</option>
        </Select>
      </label>
      <FieldError message={form.formState.errors.categoria?.message}>
        <label>
          <span className="field-label">Motivo/Categoria</span>
          <div className="mt-2 flex gap-2">
            <Select className="mt-0" register={form.register("categoria")}>
              <option value="">Selecione</option>
              {categorias.map((categoria) => <option key={categoria} value={categoria}>{categoria}</option>)}
            </Select>
            <Button type="button" variant="outline" onClick={onNewCategory}>Nova</Button>
          </div>
        </label>
      </FieldError>
      <FieldError message={form.formState.errors.descricao?.message}>
        <FieldInput label="Descricao" register={form.register("descricao")} />
      </FieldError>
      <FieldError message={form.formState.errors.valor?.message}>
        <FieldInput label="Valor" register={form.register("valor", { onChange: (event) => form.setValue("valor", maskCurrency(event.target.value)) })} />
      </FieldError>

      {formaPagamento === "DINHEIRO" && valorNum > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
          <span className="text-xs font-bold text-muted-foreground block">Calculadora de Troco</span>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Valor Pago</span>
              <Input
                className="h-8 text-xs mt-1"
                value={valorRecebido}
                onChange={(e) => setValorRecebido(maskCurrency(e.target.value))}
                placeholder="R$ 0,00"
              />
            </label>
            <label>
              <span className="text-xs font-semibold text-muted-foreground">Troco</span>
              <Input
                className="h-8 text-xs mt-1 bg-muted font-bold text-emerald-600 dark:text-emerald-400"
                value={formatCurrency(troco)}
                readOnly
              />
            </label>
          </div>
          {valorRecebidoNum > 0 && valorRecebidoNum >= valorNum && (
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              Pedido/Movimentação: {formatCurrency(valorNum)} | Pagamento: {formatCurrency(valorRecebidoNum)} | Troco: {formatCurrency(troco)}
            </p>
          )}
        </div>
      )}

      <label className="space-y-2">
        <span className="field-label">Observacao</span>
        <Textarea {...form.register("observacao")} maxLength={300} />
        {form.formState.errors.observacao && <ErrorText message={form.formState.errors.observacao.message} />}
      </label>
      <Button type="submit" disabled={isSaving}>{isSaving ? "Registrando..." : "Registrar movimentacao"}</Button>
    </form>
  );
}

function MovimentacoesCard({
  movimentacoes,
  isLoading,
  total,
  pagina,
  totalPaginas,
  onPageChange,
  setPage
}: {
  movimentacoes: CaixaMovimentacao[];
  isLoading: boolean;
  total: number;
  pagina: number;
  totalPaginas: number;
  onPageChange: (pagina: number) => void;
  setPage: (page: Page, pedido?: PedidoResumo | null) => void;
}) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Movimentacoes do caixa</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[1020px]">
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Forma</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descricao</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={9}>Carregando movimentacoes...</TableCell>
              </TableRow>
            )}
            {!isLoading && movimentacoes.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>Nenhuma movimentacao encontrada.</TableCell>
              </TableRow>
            )}
            {!isLoading &&
              movimentacoes.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(mov.movimentadoEm)}</TableCell>
                  <TableCell>
                    <Badge tone={mov.tipo === "ENTRADA" ? "success" : "danger"}>
                      {mov.tipo === "ENTRADA" ? "Entrada" : "Saida"}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatFormaPagamento(mov.formaPagamento)}</TableCell>
                  <TableCell className="min-w-36 whitespace-normal">{mov.categoria}</TableCell>
                  <TableCell className="min-w-64 whitespace-normal">{mov.descricao}</TableCell>
                  <TableCell className="font-bold">{formatCurrency(mov.valor)}</TableCell>
                  <TableCell className="min-w-32">{mov.usuario || "-"}</TableCell>
                  <TableCell>
                    <Badge tone={mov.origem === "PEDIDO" ? "success" : "warning"}>
                      {mov.origem === "PEDIDO" ? "Pedido" : "Manual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {mov.origem === "PEDIDO" && mov.pedidoId && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPage("recibo-pedido", {
                              id: mov.pedidoId!,
                              tipo: "PEDIDO",
                              numero: "",
                              cliente: "",
                              status: "",
                              dataPedido: "",
                              dataEntrega: null,
                              total: 0,
                              valorPago: 0,
                              valorEstornado: 0,
                              saldoDevedor: 0,
                              criadoPor: "",
                              motivoCancelamento: null
                            } as unknown as PedidoResumo)
                          }
                        >
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setPage("novo-pedido", {
                              id: mov.pedidoId!,
                              tipo: "PEDIDO",
                              numero: "",
                              cliente: "",
                              status: "",
                              dataPedido: "",
                              dataEntrega: null,
                              total: 0,
                              valorPago: 0,
                              valorEstornado: 0,
                              saldoDevedor: 0,
                              criadoPor: "",
                              motivoCancelamento: null
                            } as unknown as PedidoResumo)
                          }
                        >
                          Editar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {total} movimentacao{total === 1 ? "" : "es"} encontradas
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={pagina <= 1} onClick={() => onPageChange(Math.max(1, pagina - 1))}>
              Anterior
            </Button>
            <Button variant="outline" disabled={pagina >= totalPaginas} onClick={() => onPageChange(pagina + 1)}>
              Proxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldInput({ label, register }: { label: string; register: UseFormRegisterReturn }) { return <label><span className="field-label">{label}</span><Input className="mt-2" {...register} /></label>; }
function Select({ register, children, className }: { register: UseFormRegisterReturn; children: React.ReactNode; className?: string }) { return <select className={cn("mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} {...register}>{children}</select>; }
function FieldError({ message, children }: { message?: string; children: React.ReactNode }) { return <div>{children}{message && <ErrorText message={message} />}</div>; }
function ErrorText({ message }: { message?: string }) { return <p className="mt-1 text-sm font-semibold text-destructive">{message}</p>; }
function Metric({ title, value, tone }: { title: string; value: string; tone: "green" | "rose" | "amber" | "cyan" }) { const colors = { green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300", cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300", rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300", amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" }; return <Card className={colors[tone]}><CardContent className="p-5"><p className="text-sm font-semibold opacity-80">{title}</p><p className="mt-2 text-2xl font-black">{value}</p></CardContent></Card>; }
function formatFormaPagamento(value: string) { const labels: Record<string, string> = { DINHEIRO: "Dinheiro", PIX: "PIX", CARTAO_CREDITO: "Cartao credito", CARTAO_DEBITO: "Cartao debito" }; return labels[value] ?? value; }
function formatDateTime(value: string) { const date = new Date(value); if (Number.isNaN(date.getTime())) return value; return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date); }
