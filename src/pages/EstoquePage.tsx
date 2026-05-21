import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  atualizarProdutoEstoque,
  criarCategoriaEstoque,
  criarProdutoEstoque,
  listarCategoriasEstoque,
  listarMovimentacoesEstoque,
  listarProdutosEstoque,
  registrarMovimentacaoEstoque,
  type CategoriaEstoque,
  type MovimentacaoEstoque,
  type ProdutoEstoque,
  type ProdutoPayload
} from "@/services/estoqueService";
import { formatCurrency, maskCurrency, parseCurrency } from "@/utils/formatters";

type ProdutoForm = {
  nome: string;
  categoria: string;
  tamanho: string;
  unidade: string;
  estoqueMinimo: string;
  fornecedor: string;
  observacao: string;
};

type MovimentacaoForm = {
  produtoId: string;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: string;
  custoUnitario: string;
  pedidoId: string;
  observacao: string;
};

const emptyProduto: ProdutoForm = {
  nome: "",
  categoria: "",
  tamanho: "",
  unidade: "UNIDADE",
  estoqueMinimo: "",
  fornecedor: "",
  observacao: ""
};

export function EstoquePage({ usuarioId }: { usuarioId: number }) {
  const [tab, setTab] = useState("Produtos");
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [paginaProdutos, setPaginaProdutos] = useState(1);
  const [totalProdutos, setTotalProdutos] = useState(0);
  const [totalPaginasProdutos, setTotalPaginasProdutos] = useState(1);
  const [categorias, setCategorias] = useState<CategoriaEstoque[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [paginaMovimentacoes, setPaginaMovimentacoes] = useState(1);
  const [totalMovimentacoes, setTotalMovimentacoes] = useState(0);
  const [totalPaginasMovimentacoes, setTotalPaginasMovimentacoes] = useState(1);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoEstoque | null>(null);
  const [produtoForm, setProdutoForm] = useState<ProdutoForm>(emptyProduto);
  const [produtoModalOpen, setProdutoModalOpen] = useState(false);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [movForm, setMovForm] = useState<MovimentacaoForm>({ produtoId: "", tipo: "ENTRADA", quantidade: "", custoUnitario: formatCurrency(0), pedidoId: "", observacao: "" });
  const [statusMensagem, setStatusMensagem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const baixoEstoque = produtos.filter((produto) => statusProduto(produto) === "Baixo").length;
  const valorTotalProdutos = produtos.reduce((sum, produto) => sum + valorTotalEstoque(produto), 0);
  const entradasMes = movimentacoes.filter((mov) => normalizarTipo(mov.tipo) === "ENTRADA").reduce((sum, mov) => sum + Number(mov.quantidade ?? 0), 0);
  const saidasMes = movimentacoes.filter((mov) => normalizarTipo(mov.tipo) === "SAIDA").reduce((sum, mov) => sum + Number(mov.quantidade ?? 0), 0);

  useEffect(() => {
    carregarDados();
  }, [paginaProdutos, paginaMovimentacoes]);

  async function carregarDados() {
    const [produtosResponse, movimentacoesResponse, categoriasResponse] = await Promise.all([
      listarProdutosEstoque(paginaProdutos, 10).catch(() => ({ itens: [], total: 0, pagina: 1, tamanhoPagina: 10, totalPaginas: 1 })),
      listarMovimentacoesEstoque(paginaMovimentacoes, 10).catch(() => ({ itens: [], total: 0, pagina: 1, tamanhoPagina: 10, totalPaginas: 1 })),
      listarCategoriasEstoque().catch(() => [])
    ]);
    setProdutos(produtosResponse.itens);
    setTotalProdutos(produtosResponse.total);
    setPaginaProdutos(produtosResponse.pagina);
    setTotalPaginasProdutos(produtosResponse.totalPaginas);
    setMovimentacoes(movimentacoesResponse.itens);
    setTotalMovimentacoes(movimentacoesResponse.total);
    setPaginaMovimentacoes(movimentacoesResponse.pagina);
    setTotalPaginasMovimentacoes(movimentacoesResponse.totalPaginas);
    setCategorias(categoriasResponse);
  }

  function novoProduto() {
    setProdutoSelecionado(null);
    setProdutoForm(emptyProduto);
    setStatusMensagem(null);
    setTab("Produtos");
    setProdutoModalOpen(true);
  }

  function editarProduto(produto: ProdutoEstoque) {
    setProdutoSelecionado(produto);
    setProdutoForm(produtoToForm(produto));
    setStatusMensagem(null);
    setTab("Produtos");
    setProdutoModalOpen(true);
  }

  function movimentarProduto(produto: ProdutoEstoque) {
    setMovForm({
      produtoId: String(produto.id),
      tipo: "ENTRADA",
      quantidade: "",
      custoUnitario: formatCurrency(0),
      pedidoId: "",
      observacao: ""
    });
    setStatusMensagem(null);
    setTab("Movimentação");
  }

  async function salvarProduto() {
    setStatusMensagem(null);
    setIsSaving(true);

    const payload: ProdutoPayload = {
      nome: produtoForm.nome.trim(),
      categoria: produtoForm.categoria.trim(),
      tamanho: produtoForm.tamanho.trim() || null,
      unidade: produtoForm.unidade,
      estoqueMinimo: Number(produtoForm.estoqueMinimo || 0),
      fornecedor: produtoForm.fornecedor.trim() || null,
      observacao: produtoForm.observacao.trim() || null
    };

    try {
      if (produtoSelecionado) {
        await atualizarProdutoEstoque(produtoSelecionado.id, payload);
        setStatusMensagem("Produto atualizado com sucesso.");
      } else {
        await criarProdutoEstoque(payload);
        setStatusMensagem("Produto cadastrado com sucesso.");
      }

      await carregarDados();
      setProdutoSelecionado(null);
      setProdutoForm(emptyProduto);
      setProdutoModalOpen(false);
    } catch {
      setStatusMensagem("Não foi possível salvar o produto. Confira os campos e tente novamente.");
    } finally {
      setIsSaving(false);
    }
  }

  async function salvarCategoria() {
    const nome = novaCategoria.trim();
    if (!nome) {
      return;
    }

    setStatusMensagem(null);
    setIsSaving(true);
    try {
      await criarCategoriaEstoque(nome);
      setNovaCategoria("");
      setCategoriaModalOpen(false);
      await carregarDados();
      setProdutoForm((current) => ({ ...current, categoria: nome }));
      setStatusMensagem("Categoria cadastrada com sucesso.");
    } catch {
      setStatusMensagem("Não foi possível cadastrar a categoria.");
    } finally {
      setIsSaving(false);
    }
  }

  async function registrarMovimentacao() {
    setStatusMensagem(null);
    setIsSaving(true);

    try {
      await registrarMovimentacaoEstoque({
        produtoId: Number(movForm.produtoId),
        pedidoId: movForm.pedidoId ? Number(movForm.pedidoId) : null,
        usuarioId,
        tipo: movForm.tipo,
        quantidade: Number(movForm.quantidade || 0),
        custoUnitario: movForm.tipo === "ENTRADA" ? parseCurrency(movForm.custoUnitario) : null,
        observacao: movForm.observacao.trim() || null
      });
      setStatusMensagem("Movimentação registrada com sucesso.");
      setMovForm({ produtoId: "", tipo: "ENTRADA", quantidade: "", custoUnitario: formatCurrency(0), pedidoId: "", observacao: "" });
      await carregarDados();
    } catch {
      setStatusMensagem("Não foi possível registrar a movimentação. Confira o produto e a quantidade.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Controle de estoque</h1>
          <p className="text-sm text-muted-foreground">Produtos, materiais, movimentações e alertas</p>
        </div>
        <Button onClick={novoProduto}>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>

      <Tabs tabs={["Produtos", "Movimentação"]} active={tab} onChange={setTab} />

      {statusMensagem && (
        <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
          {statusMensagem}
        </p>
      )}

      {tab === "Produtos" && (
        <Produtos
          produtos={produtos}
          baixoEstoque={baixoEstoque}
          valorTotalProdutos={valorTotalProdutos}
          entradasMes={entradasMes}
          saidasMes={saidasMes}
          onEdit={editarProduto}
          onMove={movimentarProduto}
          total={totalProdutos}
          pagina={paginaProdutos}
          totalPaginas={totalPaginasProdutos}
          onPageChange={setPaginaProdutos}
        />
      )}
      {tab === "Movimentação" && (
        <Movimentacao
          produtos={produtos}
          movimentacoes={movimentacoes}
          movForm={movForm}
          setMovForm={setMovForm}
          onRegister={registrarMovimentacao}
          isSaving={isSaving}
          total={totalMovimentacoes}
          pagina={paginaMovimentacoes}
          totalPaginas={totalPaginasMovimentacoes}
          onPageChange={setPaginaMovimentacoes}
        />
      )}

      {produtoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-5xl">
            <ProdutoFormCard
              produtoSelecionado={produtoSelecionado}
              form={produtoForm}
              categorias={categorias}
              setForm={setProdutoForm}
              onSave={salvarProduto}
              onClose={() => setProdutoModalOpen(false)}
              onNewCategory={() => setCategoriaModalOpen(true)}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

      {categoriaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle>Cadastrar categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nome da categoria" value={novaCategoria} onChange={setNovaCategoria} />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCategoriaModalOpen(false)} disabled={isSaving}>
                  Cancelar
                </Button>
                <Button onClick={salvarCategoria} disabled={isSaving || !novaCategoria.trim()}>
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

function Produtos({
  produtos,
  baixoEstoque,
  valorTotalProdutos,
  entradasMes,
  saidasMes,
  onEdit,
  onMove,
  total,
  pagina,
  totalPaginas,
  onPageChange
}: {
  produtos: ProdutoEstoque[];
  baixoEstoque: number;
  valorTotalProdutos: number;
  entradasMes: number;
  saidasMes: number;
  onEdit: (produto: ProdutoEstoque) => void;
  onMove: (produto: ProdutoEstoque) => void;
  total: number;
  pagina: number;
  totalPaginas: number;
  onPageChange: (pagina: number) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        <Metric title="Total produtos" value={String(total)} tone="green" />
        <Metric title="Valor em estoque" value={formatCurrency(valorTotalProdutos)} tone="cyan" />
        <Metric title="Baixo estoque" value={String(baixoEstoque)} tone="rose" />
        <Metric title="Entradas mês" value={String(entradasMes)} tone="green" />
        <Metric title="Saídas mês" value={String(saidasMes)} tone="amber" />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Produtos em estoque</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tam.</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Mín.</TableHead>
                <TableHead>Custo médio</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => {
                const status = statusProduto(produto);
                return (
                  <TableRow key={produto.id}>
                    <TableCell>#{produto.id}</TableCell>
                    <TableCell>{produto.nome}</TableCell>
                    <TableCell>{produto.tamanho ?? "-"}</TableCell>
                    <TableCell>{produto.quantidadeAtual ?? 0}</TableCell>
                    <TableCell>{produto.estoqueMinimo ?? 0}</TableCell>
                    <TableCell>{formatCurrency(produto.custoUnitario ?? 0)}</TableCell>
                    <TableCell>{formatCurrency(valorTotalEstoque(produto))}</TableCell>
                    <TableCell>
                      <Badge tone={status === "OK" ? "success" : "danger"}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(produto)}>
                          Editar
                        </Button>
                        <Button size="sm" onClick={() => onMove(produto)}>
                          Movimentar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{total} produto{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={pagina <= 1} onClick={() => onPageChange(Math.max(1, pagina - 1))}>Anterior</Button>
              <Button variant="outline" disabled={pagina >= totalPaginas} onClick={() => onPageChange(pagina + 1)}>Proxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProdutoFormCard({
  produtoSelecionado,
  form,
  categorias,
  setForm,
  onSave,
  onClose,
  onNewCategory,
  isSaving
}: {
  produtoSelecionado: ProdutoEstoque | null;
  form: ProdutoForm;
  categorias: CategoriaEstoque[];
  setForm: React.Dispatch<React.SetStateAction<ProdutoForm>>;
  onSave: () => void;
  onClose: () => void;
  onNewCategory: () => void;
  isSaving: boolean;
}) {
  return (
    <Card className="max-h-[90vh] overflow-y-auto shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>{produtoSelecionado ? `Editar produto #${produtoSelecionado.id}` : "Cadastrar produto"}</CardTitle>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          Fechar
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Field label="Nome do produto" value={form.nome} onChange={(value) => setForm((current) => ({ ...current, nome: value }))} />
        <Field label="Tamanho" value={form.tamanho} onChange={(value) => setForm((current) => ({ ...current, tamanho: value }))} />
        <label>
          <span className="field-label">Unidade de medida</span>
          <Select value={form.unidade} onChange={(value) => setForm((current) => ({ ...current, unidade: value }))}>
            <option value="UNIDADE">Unidade</option>
            <option value="METRO">Metro</option>
            <option value="FOLHA">Folha</option>
            <option value="LITRO">Litro</option>
            <option value="CAIXA">Caixa</option>
          </Select>
        </label>
        <label>
          <span className="field-label">Categoria</span>
          <div className="mt-2 flex gap-2">
            <Select className="mt-0" value={form.categoria} onChange={(value) => setForm((current) => ({ ...current, categoria: value }))}>
              <option value="">Selecione</option>
              {categorias.map((categoria) => (
                <option key={categoria.nome} value={categoria.nome}>
                  {categoria.nome}
                </option>
              ))}
            </Select>
            <Button type="button" variant="outline" onClick={onNewCategory}>
              Nova
            </Button>
          </div>
        </label>
        <Field label="Estoque mínimo" value={form.estoqueMinimo} onChange={(value) => setForm((current) => ({ ...current, estoqueMinimo: value.replace(/\D/g, "") }))} />
        <Field className="md:col-span-2" label="Fornecedor" value={form.fornecedor} onChange={(value) => setForm((current) => ({ ...current, fornecedor: value }))} />
        <label className="md:col-span-2 space-y-2">
          <span className="field-label">Observação</span>
          <Textarea value={form.observacao} onChange={(event) => setForm((current) => ({ ...current, observacao: event.target.value }))} maxLength={300} />
        </label>
        <div className="flex flex-wrap items-end gap-3 self-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : produtoSelecionado ? "Salvar alterações" : "Salvar produto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Movimentacao({
  produtos,
  movimentacoes,
  movForm,
  setMovForm,
  onRegister,
  isSaving,
  total,
  pagina,
  totalPaginas,
  onPageChange
}: {
  produtos: ProdutoEstoque[];
  movimentacoes: MovimentacaoEstoque[];
  movForm: MovimentacaoForm;
  setMovForm: React.Dispatch<React.SetStateAction<MovimentacaoForm>>;
  onRegister: () => void;
  isSaving: boolean;
  total: number;
  pagina: number;
  totalPaginas: number;
  onPageChange: (pagina: number) => void;
}) {
  const podeRegistrar =
    Number(movForm.produtoId) > 0 &&
    Number(movForm.quantidade) > 0 &&
    (movForm.tipo === "SAIDA" || parseCurrency(movForm.custoUnitario) > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nova movimentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label>
            <span className="field-label">Produto</span>
            <Select value={movForm.produtoId} onChange={(value) => setMovForm((current) => ({ ...current, produtoId: value }))}>
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  #{produto.id} - {produto.nome}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="field-label">Tipo</span>
            <Select value={movForm.tipo} onChange={(value) => setMovForm((current) => ({ ...current, tipo: value as "ENTRADA" | "SAIDA" }))}>
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
            </Select>
          </label>
          <Field label="Quantidade" value={movForm.quantidade} onChange={(value) => setMovForm((current) => ({ ...current, quantidade: value.replace(/\D/g, "") }))} />
          {movForm.tipo === "ENTRADA" && (
            <Field label="Custo unitário" value={movForm.custoUnitario} onChange={(value) => setMovForm((current) => ({ ...current, custoUnitario: maskCurrency(value) }))} />
          )}
          <Field label="Pedido vinculado" value={movForm.pedidoId} onChange={(value) => setMovForm((current) => ({ ...current, pedidoId: value.replace(/\D/g, "") }))} />
          <label className="space-y-2">
            <span className="field-label">Observação</span>
            <Textarea value={movForm.observacao} onChange={(event) => setMovForm((current) => ({ ...current, observacao: event.target.value }))} maxLength={300} />
          </label>
          <Button onClick={onRegister} disabled={isSaving || !podeRegistrar}>
            {isSaving ? "Registrando..." : "Registrar"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Resp.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov, index) => {
                const tipo = normalizarTipo(mov.tipo);
                return (
                  <TableRow key={`${mov.movimentadoEm ?? mov.data}-${mov.tipo}-${index}`}>
                    <TableCell>{formatDateTime(mov.movimentadoEm ?? mov.data)}</TableCell>
                    <TableCell>
                      <Badge tone={tipo === "ENTRADA" ? "success" : "danger"}>{tipo === "ENTRADA" ? "Entrada" : "Saída"}</Badge>
                    </TableCell>
                    <TableCell>{mov.produto ?? "-"}</TableCell>
                    <TableCell>{mov.quantidade ?? mov.qtd ?? "-"}</TableCell>
                    <TableCell>{mov.custoUnitario ? formatCurrency(mov.custoUnitario) : "-"}</TableCell>
                    <TableCell>{mov.total ? formatCurrency(mov.total) : "-"}</TableCell>
                    <TableCell>{mov.usuario ?? mov.responsavel ?? mov.resp ?? "-"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{total} movimentacao{total === 1 ? "" : "es"} encontrada{total === 1 ? "" : "s"}</p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={pagina <= 1} onClick={() => onPageChange(Math.max(1, pagina - 1))}>Anterior</Button>
              <Button variant="outline" disabled={pagina >= totalPaginas} onClick={() => onPageChange(pagina + 1)}>Proxima</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  readOnly = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
}) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      <Input className="mt-2" value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} />
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

function produtoToForm(produto: ProdutoEstoque): ProdutoForm {
  return {
    nome: produto.nome,
    categoria: produto.categoria,
    tamanho: produto.tamanho ?? "",
    unidade: produto.unidade,
    estoqueMinimo: String(produto.estoqueMinimo ?? 0),
    fornecedor: produto.fornecedor ?? "",
    observacao: produto.observacao ?? ""
  };
}

function statusProduto(produto: ProdutoEstoque) {
  const qtd = produto.quantidadeAtual ?? produto.quantidade ?? produto.qtd ?? 0;
  const minimo = produto.estoqueMinimo ?? produto.minimo ?? 0;
  return produto.status ?? (qtd <= minimo ? "Baixo" : "OK");
}

function valorTotalEstoque(produto: ProdutoEstoque) {
  return produto.totalEstoque ?? (produto.quantidadeAtual ?? produto.quantidade ?? produto.qtd ?? 0) * (produto.custoUnitario ?? 0);
}

function normalizarTipo(tipo: string) {
  return tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
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
        <p className="mt-2 text-3xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}

