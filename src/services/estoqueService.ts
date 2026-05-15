import { apiRequest } from "@/services/api";

export type ProdutoEstoque = {
  id?: number;
  produto?: string;
  nome?: string;
  tamanho?: string | null;
  quantidade?: number;
  qtd?: number;
  estoqueMinimo?: number;
  minimo?: number;
  unidade?: string;
  status?: string;
};

export type MovimentacaoEstoque = {
  data?: string;
  tipo: string;
  produto?: string;
  quantidade?: number;
  qtd?: string;
  responsavel?: string;
  resp?: string;
};

export function listarProdutosEstoque() {
  return apiRequest<ProdutoEstoque[]>("/estoque/produtos");
}

export function listarMovimentacoesEstoque() {
  return apiRequest<MovimentacaoEstoque[]>("/estoque/movimentacoes");
}
