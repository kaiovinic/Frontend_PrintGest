import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  useForm,
  type UseFormReturn,
  type UseFormRegisterReturn,
} from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ApiError } from "@/services/api";
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
  type ProdutoPayload,
} from "@/services/estoqueService";
import {
  formatCurrency,
  maskCurrency,
  parseCurrency,
} from "@/utils/formatters";

const tamanhoPagina = 10;
const estoqueKeys = {
  produtos: (pagina: number) => ["estoque", "produtos", pagina] as const,
  movimentacoes: (pagina: number) =>
    ["estoque", "movimentacoes", pagina] as const,
  categorias: ["estoque", "categorias"] as const,
};

const produtoSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do produto."),
  categoria: z.string().trim().min(1, "Selecione uma categoria."),
  tamanho: z.string().trim().optional(),
  unidade: z.string().trim().min(1, "Selecione a unidade."),
  estoqueMinimo: z.string().trim().min(1, "Informe o estoque minimo."),
  fornecedor: z.string().trim().optional(),
  observacao: z
    .string()
    .max(300, "A observacao deve ter no maximo 300 caracteres.")
    .optional(),
});

type ProdutoForm = z.infer<typeof produtoSchema>;
const categoriaSchema = z.object({
  nome: z.string().trim().min(2, "Informe a categoria."),
});
type CategoriaForm = z.infer<typeof categoriaSchema>;

const movimentacaoSchema = z
  .object({
    produtoId: z.string().min(1, "Selecione o produto."),
    tipo: z.enum(["ENTRADA", "SAIDA"]),
    quantidade: z.string().min(1, "Informe a quantidade."),
    custoUnitario: z.string().optional(),
    pedidoId: z.string().optional(),
    observacao: z
      .string()
      .max(300, "A observacao deve ter no maximo 300 caracteres.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (Number(data.quantidade) <= 0)
      ctx.addIssue({
        code: "custom",
        path: ["quantidade"],
        message: "Informe uma quantidade maior que zero.",
      });
    if (data.tipo === "ENTRADA" && parseCurrency(data.custoUnitario ?? "") <= 0)
      ctx.addIssue({
        code: "custom",
        path: ["custoUnitario"],
        message: "Informe o custo unitario da entrada.",
      });
  });

type MovimentacaoForm = z.infer<typeof movimentacaoSchema>;

const produtoDefaultValues: ProdutoForm = {
  nome: "",
  categoria: "",
  tamanho: "",
  unidade: "UNIDADE",
  estoqueMinimo: "",
  fornecedor: "",
  observacao: "",
};
const movimentacaoDefaultValues: MovimentacaoForm = {
  produtoId: "",
  tipo: "ENTRADA",
  quantidade: "",
  custoUnitario: formatCurrency(0),
  pedidoId: "",
  observacao: "",
};
const emptyProdutos = {
  itens: [],
  total: 0,
  pagina: 1,
  tamanhoPagina,
  totalPaginas: 1,
};
const emptyMovimentacoes = {
  itens: [],
  total: 0,
  pagina: 1,
  tamanhoPagina,
  totalPaginas: 1,
};

export function EstoquePage({ usuarioId }: { usuarioId: number }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("Produtos");
  const [paginaProdutos, setPaginaProdutos] = useState(1);
  const [paginaMovimentacoes, setPaginaMovimentacoes] = useState(1);
  const [produtoSelecionado, setProdutoSelecionado] =
    useState<ProdutoEstoque | null>(null);
  const [produtoModalOpen, setProdutoModalOpen] = useState(false);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const [statusMensagem, setStatusMensagem] = useState<string | null>(null);

  const produtoForm = useForm<ProdutoForm>({
    resolver: zodResolver(produtoSchema),
    defaultValues: produtoDefaultValues,
  });
  const categoriaForm = useForm<CategoriaForm>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: { nome: "" },
  });
  const movimentacaoForm = useForm<MovimentacaoForm>({
    resolver: zodResolver(movimentacaoSchema),
    defaultValues: movimentacaoDefaultValues,
  });
  const tipoMovimentacao = movimentacaoForm.watch("tipo");

  const produtosQuery = useQuery({
    queryKey: estoqueKeys.produtos(paginaProdutos),
    queryFn: () => listarProdutosEstoque(paginaProdutos, tamanhoPagina),
    placeholderData: emptyProdutos,
  });
  const movimentacoesQuery = useQuery({
    queryKey: estoqueKeys.movimentacoes(paginaMovimentacoes),
    queryFn: () =>
      listarMovimentacoesEstoque(paginaMovimentacoes, tamanhoPagina),
    placeholderData: emptyMovimentacoes,
  });
  const categoriasQuery = useQuery({
    queryKey: estoqueKeys.categorias,
    queryFn: listarCategoriasEstoque,
    placeholderData: [],
  });

  const produtosResponse = produtosQuery.data ?? emptyProdutos;
  const movimentacoesResponse = movimentacoesQuery.data ?? emptyMovimentacoes;
  const categorias = categoriasQuery.data ?? [];
  const produtos = produtosResponse.itens;
  const movimentacoes = movimentacoesResponse.itens;
  const baixoEstoque = produtos.filter(
    (produto) => statusProduto(produto) === "Baixo",
  ).length;
  const valorTotalProdutos = produtos.reduce(
    (sum, produto) => sum + valorTotalEstoque(produto),
    0,
  );
  const entradasMes = movimentacoes
    .filter((mov) => normalizarTipo(mov.tipo) === "ENTRADA")
    .reduce((sum, mov) => sum + Number(mov.quantidade ?? 0), 0);
  const saidasMes = movimentacoes
    .filter((mov) => normalizarTipo(mov.tipo) === "SAIDA")
    .reduce((sum, mov) => sum + Number(mov.quantidade ?? 0), 0);

  const produtoMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id?: number;
      payload: ProdutoPayload;
    }) => {
      if (id) {
        await atualizarProdutoEstoque(id, payload);
        return;
      }
      await criarProdutoEstoque(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["estoque"] });
      setStatusMensagem(
        produtoSelecionado
          ? "Produto atualizado com sucesso."
          : "Produto cadastrado com sucesso.",
      );
      setProdutoSelecionado(null);
      produtoForm.reset(produtoDefaultValues);
      setProdutoModalOpen(false);
    },
    onError: (error) =>
      setStatusMensagem(
        error instanceof Error
          ? error.message
          : "Nao foi possivel salvar o produto.",
      ),
  });

  const categoriaMutation = useMutation({
    mutationFn: (values: CategoriaForm) => criarCategoriaEstoque(values.nome),
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: estoqueKeys.categorias });
      produtoForm.setValue("categoria", values.nome);
      categoriaForm.reset({ nome: "" });
      setCategoriaModalOpen(false);
      setStatusMensagem("Categoria cadastrada com sucesso.");
    },
    onError: (error) =>
      setStatusMensagem(
        error instanceof Error
          ? error.message
          : "Nao foi possivel cadastrar a categoria.",
      ),
  });

  const movimentacaoMutation = useMutation({
    mutationFn: (values: MovimentacaoForm) => {
      const nomeProduto =
        produtos.find((p) => p.id === Number(values.produtoId))?.nome ?? null;
      return registrarMovimentacaoEstoque({
        produtoId: Number(values.produtoId),
        pedidoId: values.pedidoId ? Number(values.pedidoId) : null,
        usuarioId,
        tipo: values.tipo,
        quantidade: Number(values.quantidade),
        custoUnitario:
          values.tipo === "ENTRADA"
            ? parseCurrency(values.custoUnitario ?? "")
            : null,
        observacao: values.observacao?.trim() || null,
        nomeProduto,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["estoque"] });
      movimentacaoForm.reset(movimentacaoDefaultValues);
      setStatusMensagem("Movimentacao registrada com sucesso.");
    },
    onError: (error) =>
      setStatusMensagem(
        error instanceof ApiError
          ? error.message
          : "Nao foi possivel registrar a movimentacao.",
      ),
  });

  const isSaving =
    produtoMutation.isPending ||
    categoriaMutation.isPending ||
    movimentacaoMutation.isPending;

  function novoProduto() {
    setProdutoSelecionado(null);
    produtoForm.reset(produtoDefaultValues);
    setStatusMensagem(null);
    setTab("Produtos");
    setProdutoModalOpen(true);
  }

  function editarProduto(produto: ProdutoEstoque) {
    setProdutoSelecionado(produto);
    produtoForm.reset(produtoToForm(produto));
    setStatusMensagem(null);
    setTab("Produtos");
    setProdutoModalOpen(true);
  }

  function movimentarProduto(produto: ProdutoEstoque) {
    movimentacaoForm.reset({
      ...movimentacaoDefaultValues,
      produtoId: String(produto.id),
    });
    setStatusMensagem(null);
    setTab("Movimentacao");
  }

  function salvarProduto(values: ProdutoForm) {
    const payload: ProdutoPayload = {
      nome: values.nome.trim(),
      categoria: values.categoria.trim(),
      tamanho: values.tamanho?.trim() || null,
      unidade: values.unidade,
      estoqueMinimo: Number(values.estoqueMinimo || 0),
      fornecedor: values.fornecedor?.trim() || null,
      observacao: values.observacao?.trim() || null,
    };
    setStatusMensagem(null);
    produtoMutation.mutate({ id: produtoSelecionado?.id, payload });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Controle de estoque</h1>
          <p className="text-sm text-muted-foreground">
            Produtos, materiais, movimentacoes e alertas
          </p>
        </div>
        <Button onClick={novoProduto}>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>
      <Tabs
        tabs={["Produtos", "Movimentacao"]}
        active={tab}
        onChange={setTab}
      />
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
          total={produtosResponse.total}
          pagina={produtosResponse.pagina}
          totalPaginas={produtosResponse.totalPaginas}
          isLoading={produtosQuery.isLoading}
          onPageChange={setPaginaProdutos}
        />
      )}
      {tab === "Movimentacao" && (
        <Movimentacao
          produtos={produtos}
          movimentacoes={movimentacoes}
          form={movimentacaoForm}
          tipoMovimentacao={tipoMovimentacao}
          onRegister={movimentacaoForm.handleSubmit((values) =>
            movimentacaoMutation.mutate(values),
          )}
          isSaving={isSaving}
          total={movimentacoesResponse.total}
          pagina={movimentacoesResponse.pagina}
          totalPaginas={movimentacoesResponse.totalPaginas}
          isLoading={movimentacoesQuery.isLoading}
          onPageChange={setPaginaMovimentacoes}
        />
      )}
      {produtoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <form
            className="w-full max-w-5xl"
            onSubmit={produtoForm.handleSubmit(salvarProduto)}
          >
            <ProdutoFormCard
              produtoSelecionado={produtoSelecionado}
              form={produtoForm}
              categorias={categorias}
              onClose={() => setProdutoModalOpen(false)}
              onNewCategory={() => setCategoriaModalOpen(true)}
              isSaving={isSaving}
            />
          </form>
        </div>
      )}
      {categoriaModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle>Cadastrar categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={categoriaForm.handleSubmit((values) =>
                  categoriaMutation.mutate(values),
                )}
              >
                <FieldError
                  message={categoriaForm.formState.errors.nome?.message}
                >
                  <Field
                    label="Nome da categoria"
                    register={categoriaForm.register("nome")}
                  />
                </FieldError>
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCategoriaModalOpen(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Salvar categoria"}
                  </Button>
                </div>
              </form>
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
  isLoading,
  onPageChange,
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
  isLoading: boolean;
  onPageChange: (pagina: number) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-5">
        <Metric title="Total produtos" value={String(total)} tone="green" />
        <Metric
          title="Valor em estoque"
          value={formatCurrency(valorTotalProdutos)}
          tone="cyan"
        />
        <Metric
          title="Baixo estoque"
          value={String(baixoEstoque)}
          tone="rose"
        />
        <Metric title="Entradas mes" value={String(entradasMes)} tone="green" />
        <Metric title="Saidas mes" value={String(saidasMes)} tone="amber" />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Produtos em estoque</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Codigo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Tam.</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Min.</TableHead>
                <TableHead>Custo medio</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9}>Carregando produtos...</TableCell>
                </TableRow>
              )}
              {!isLoading && produtos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9}>Nenhum produto encontrado.</TableCell>
                </TableRow>
              )}
              {!isLoading &&
                produtos.map((produto) => {
                  const status = statusProduto(produto);
                  return (
                    <TableRow key={produto.id}>
                      <TableCell>#{produto.id}</TableCell>
                      <TableCell>{produto.nome}</TableCell>
                      <TableCell>{produto.tamanho ?? "-"}</TableCell>
                      <TableCell>{produto.quantidadeAtual ?? 0}</TableCell>
                      <TableCell>{produto.estoqueMinimo ?? 0}</TableCell>
                      <TableCell>
                        {formatCurrency(produto.custoUnitario ?? 0)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(valorTotalEstoque(produto))}
                      </TableCell>
                      <TableCell>
                        <Badge tone={status === "OK" ? "success" : "danger"}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(produto)}
                          >
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
          <Paginacao
            total={total}
            pagina={pagina}
            totalPaginas={totalPaginas}
            onPageChange={onPageChange}
            label="produto"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProdutoFormCard({
  produtoSelecionado,
  form,
  categorias,
  onClose,
  onNewCategory,
  isSaving,
}: {
  produtoSelecionado: ProdutoEstoque | null;
  form: UseFormReturn<ProdutoForm>;
  categorias: CategoriaEstoque[];
  onClose: () => void;
  onNewCategory: () => void;
  isSaving: boolean;
}) {
  return (
    <Card className="max-h-[90vh] overflow-y-auto shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>
          {produtoSelecionado
            ? `Editar produto #${produtoSelecionado.id}`
            : "Cadastrar produto"}
        </CardTitle>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
        >
          Fechar
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <FieldError message={form.formState.errors.nome?.message}>
          <Field label="Nome do produto" register={form.register("nome")} />
        </FieldError>
        <FieldError message={form.formState.errors.tamanho?.message}>
          <Field label="Tamanho" register={form.register("tamanho")} />
        </FieldError>
        <label>
          <span className="field-label">Unidade de medida</span>
          <Select register={form.register("unidade")}>
            <option value="UNIDADE">Unidade</option>
            <option value="METRO">Metro</option>
            <option value="FOLHA">Folha</option>
            <option value="LITRO">Litro</option>
            <option value="CAIXA">Caixa</option>
          </Select>
        </label>
        <FieldError message={form.formState.errors.categoria?.message}>
          <label>
            <span className="field-label">Categoria</span>
            <div className="mt-2 flex gap-2">
              <Select className="mt-0" register={form.register("categoria")}>
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
        </FieldError>
        <FieldError message={form.formState.errors.estoqueMinimo?.message}>
          <Field
            label="Estoque minimo"
            register={form.register("estoqueMinimo", {
              onChange: (event) =>
                form.setValue(
                  "estoqueMinimo",
                  event.target.value.replace(/\D/g, ""),
                ),
            })}
          />
        </FieldError>
        <FieldError
          message={form.formState.errors.fornecedor?.message}
          className="md:col-span-2"
        >
          <Field label="Fornecedor" register={form.register("fornecedor")} />
        </FieldError>
        <label className="md:col-span-2 space-y-2">
          <span className="field-label">Observacao</span>
          <Textarea {...form.register("observacao")} maxLength={300} />
          {form.formState.errors.observacao && (
            <ErrorText message={form.formState.errors.observacao.message} />
          )}
        </label>
        <div className="flex flex-wrap items-end gap-3 self-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving
              ? "Salvando..."
              : produtoSelecionado
                ? "Salvar alteracoes"
                : "Salvar produto"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Movimentacao({
  produtos,
  movimentacoes,
  form,
  tipoMovimentacao,
  onRegister,
  isSaving,
  total,
  pagina,
  totalPaginas,
  isLoading,
  onPageChange,
}: {
  produtos: ProdutoEstoque[];
  movimentacoes: MovimentacaoEstoque[];
  form: UseFormReturn<MovimentacaoForm>;
  tipoMovimentacao: "ENTRADA" | "SAIDA";
  onRegister: () => void;
  isSaving: boolean;
  total: number;
  pagina: number;
  totalPaginas: number;
  isLoading: boolean;
  onPageChange: (pagina: number) => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nova movimentacao</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onRegister}>
            <FieldError message={form.formState.errors.produtoId?.message}>
              <label>
                <span className="field-label">Produto</span>
                <Select register={form.register("produtoId")}>
                  <option value="">Selecione um produto</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      #{produto.id} - {produto.nome}
                    </option>
                  ))}
                </Select>
              </label>
            </FieldError>
            <label>
              <span className="field-label">Tipo</span>
              <Select register={form.register("tipo")}>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saida</option>
              </Select>
            </label>
            <FieldError message={form.formState.errors.quantidade?.message}>
              <Field
                label="Quantidade"
                register={form.register("quantidade", {
                  onChange: (event) =>
                    form.setValue(
                      "quantidade",
                      event.target.value.replace(/\D/g, ""),
                    ),
                })}
              />
            </FieldError>
            {tipoMovimentacao === "ENTRADA" && (
              <FieldError
                message={form.formState.errors.custoUnitario?.message}
              >
                <Field
                  label="Custo unitario"
                  register={form.register("custoUnitario", {
                    onChange: (event) =>
                      form.setValue(
                        "custoUnitario",
                        maskCurrency(event.target.value),
                      ),
                  })}
                />
              </FieldError>
            )}
            <Field
              label="Pedido vinculado"
              register={form.register("pedidoId", {
                onChange: (event) =>
                  form.setValue(
                    "pedidoId",
                    event.target.value.replace(/\D/g, ""),
                  ),
              })}
            />
            <label className="space-y-2">
              <span className="field-label">Observacao</span>
              <Textarea {...form.register("observacao")} maxLength={300} />
              {form.formState.errors.observacao && (
                <ErrorText message={form.formState.errors.observacao.message} />
              )}
            </label>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Registrando..." : "Registrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Historico</CardTitle>
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
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7}>Carregando movimentacoes...</TableCell>
                </TableRow>
              )}
              {!isLoading && movimentacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    Nenhuma movimentacao encontrada.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                movimentacoes.map((mov, index) => {
                  const tipo = normalizarTipo(mov.tipo);
                  return (
                    <TableRow
                      key={`${mov.movimentadoEm ?? mov.data}-${mov.tipo}-${index}`}
                    >
                      <TableCell>
                        {formatDateTime(mov.movimentadoEm ?? mov.data)}
                      </TableCell>
                      <TableCell>
                        <Badge tone={tipo === "ENTRADA" ? "success" : "danger"}>
                          {tipo === "ENTRADA" ? "Entrada" : "Saida"}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.produto ?? "-"}</TableCell>
                      <TableCell>{mov.quantidade ?? mov.qtd ?? "-"}</TableCell>
                      <TableCell>
                        {mov.custoUnitario
                          ? formatCurrency(mov.custoUnitario)
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {mov.total ? formatCurrency(mov.total) : "-"}
                      </TableCell>
                      <TableCell>
                        {mov.usuario ?? mov.responsavel ?? mov.resp ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          <Paginacao
            total={total}
            pagina={pagina}
            totalPaginas={totalPaginas}
            onPageChange={onPageChange}
            label="movimentacao"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  register,
}: {
  label: string;
  register: UseFormRegisterReturn;
}) {
  return (
    <label>
      <span className="field-label">{label}</span>
      <Input className="mt-2" {...register} />
    </label>
  );
}
function Select({
  register,
  children,
  className,
}: {
  register: UseFormRegisterReturn;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      className={cn(
        "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...register}
    >
      {children}
    </select>
  );
}
function FieldError({
  message,
  children,
  className,
}: {
  message?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {children}
      {message && <ErrorText message={message} />}
    </div>
  );
}
function ErrorText({ message }: { message?: string }) {
  return (
    <p className="mt-1 text-sm font-semibold text-destructive">{message}</p>
  );
}
function Paginacao({
  total,
  pagina,
  totalPaginas,
  onPageChange,
  label,
}: {
  total: number;
  pagina: number;
  totalPaginas: number;
  onPageChange: (pagina: number) => void;
  label: string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total} {label}
        {total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pagina <= 1}
          onClick={() => onPageChange(Math.max(1, pagina - 1))}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={pagina >= totalPaginas}
          onClick={() => onPageChange(pagina + 1)}
        >
          Proxima
        </Button>
      </div>
    </div>
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
    observacao: produto.observacao ?? "",
  };
}
function statusProduto(produto: ProdutoEstoque) {
  const qtd = produto.quantidadeAtual ?? produto.quantidade ?? produto.qtd ?? 0;
  const minimo = produto.estoqueMinimo ?? produto.minimo ?? 0;
  return produto.status ?? (qtd <= minimo ? "Baixo" : "OK");
}
function valorTotalEstoque(produto: ProdutoEstoque) {
  return (
    produto.totalEstoque ??
    (produto.quantidadeAtual ?? produto.quantidade ?? produto.qtd ?? 0) *
      (produto.custoUnitario ?? 0)
  );
}
function normalizarTipo(tipo: string) {
  return tipo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}
function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
function Metric({
  title,
  value,
  tone,
}: {
  title: string;
  value: string;
  tone: "green" | "rose" | "amber" | "cyan";
}) {
  const colors = {
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    cyan: "bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
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
