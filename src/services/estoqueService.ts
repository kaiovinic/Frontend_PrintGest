import { apiRequest } from "@/services/api";

export type ProdutoEstoque = {
  id: number;
  nome: string;
  produto?: string;
  categoria: string;
  tamanho?: string | null;
  quantidadeAtual: number;
  qtd?: number;
  quantidade?: number;
  estoqueMinimo: number;
  minimo?: number;
  unidade: string;
  custoUnitario: number;
  totalEstoque?: number;
  fornecedor?: string | null;
  observacao?: string | null;
  ativo?: boolean;
  status?: string;
};

export type CategoriaEstoque = {
  nome: string;
};

export type MovimentacaoEstoque = {
  id?: number;
  movimentadoEm?: string;
  data?: string;
  tipo: string;
  produto?: string;
  usuario?: string;
  quantidade?: number;
  qtd?: string;
  responsavel?: string;
  resp?: string;
  pedidoId?: number | null;
  custoUnitario?: number | null;
  total?: number | null;
  observacao?: string | null;
};

export type ProdutoPayload = {
  nome: string;
  categoria: string;
  tamanho: string | null;
  unidade: string;
  estoqueMinimo: number;
  fornecedor: string | null;
  observacao: string | null;
};

export type MovimentacaoPayload = {
  produtoId: number;
  pedidoId: number | null;
  usuarioId: number;
  tipo: "ENTRADA" | "SAIDA";
  quantidade: number;
  custoUnitario: number | null;
  observacao: string | null;
};

export type ResultadoPaginado<T> = { itens: T[]; total: number; pagina: number; tamanhoPagina: number; totalPaginas: number };

export function listarProdutosEstoque(pagina = 1, tamanhoPagina = 10) {
  return apiRequest<ResultadoPaginado<ProdutoEstoque>>(`/estoque/produtos?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`);
}

export function listarCategoriasEstoque() {
  return apiRequest<CategoriaEstoque[]>("/estoque/categorias");
}

export function criarCategoriaEstoque(nome: string) {
  return apiRequest<CategoriaEstoque>("/estoque/categorias", {
    method: "POST",
    body: { nome }
  });
}

export function listarMovimentacoesEstoque(pagina = 1, tamanhoPagina = 10) {
  return apiRequest<ResultadoPaginado<MovimentacaoEstoque>>(`/estoque/movimentacoes?pagina=${pagina}&tamanhoPagina=${tamanhoPagina}`);
}

export function criarProdutoEstoque(payload: ProdutoPayload) {
  return apiRequest<{ id: number }>("/estoque/produtos", {
    method: "POST",
    body: payload
  });
}

export function atualizarProdutoEstoque(id: number, payload: ProdutoPayload) {
  return apiRequest<void>(`/estoque/produtos/${id}`, {
    method: "PUT",
    body: payload
  });
}

export function registrarMovimentacaoEstoque(payload: MovimentacaoPayload) {
  return apiRequest<{ mensagem: string }>("/estoque/movimentacoes", {
    method: "POST",
    body: payload
  });
}
