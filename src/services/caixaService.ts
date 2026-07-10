import { apiRequest } from "@/services/api";

export type CaixaResumo = {
  entradas: number;
  saidas: number;
  saldo: number;
  dinheiro: number;
  pix: number;
  cartaoCredito: number;
  cartaoDebito: number;
};

export type CaixaMovimentacao = {
  id: string;
  pedidoId?: number | null;
  tipo: "ENTRADA" | "SAIDA";
  formaPagamento: string;
  categoria: string;
  descricao: string;
  valor: number;
  movimentadoEm: string;
  usuario: string;
  observacao?: string | null;
  origem: "PEDIDO" | "MANUAL";
};

export type CaixaMovimentacaoPayload = {
  usuarioId: number;
  pedidoId: number | null;
  tipo: "ENTRADA" | "SAIDA";
  formaPagamento: string;
  categoria: string;
  descricao: string;
  valor: number;
  observacao: string | null;
};

export type ResultadoPaginado<T> = { itens: T[]; total: number; pagina: number; tamanhoPagina: number; totalPaginas: number };

type CaixaFiltros = {
  inicio?: string;
  fim?: string;
  pagina?: number;
  tamanhoPagina?: number;
};

function queryString(filtros?: CaixaFiltros) {
  const params = new URLSearchParams();
  if (filtros?.inicio) params.set("inicio", filtros.inicio);
  if (filtros?.fim) params.set("fim", filtros.fim);
  if (filtros?.pagina) params.set("pagina", String(filtros.pagina));
  if (filtros?.tamanhoPagina) params.set("tamanhoPagina", String(filtros.tamanhoPagina));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function obterResumoCaixa(filtros?: CaixaFiltros) {
  return apiRequest<CaixaResumo>(`/caixa/resumo${queryString(filtros)}`);
}

export function listarMovimentacoesCaixa(filtros?: CaixaFiltros) {
  return apiRequest<ResultadoPaginado<CaixaMovimentacao>>(`/caixa/movimentacoes${queryString(filtros)}`);
}

export function criarMovimentacaoCaixa(payload: CaixaMovimentacaoPayload) {
  return apiRequest<{ id: number }>("/caixa/movimentacoes", {
    method: "POST",
    body: payload
  });
}

export type CancelarMovimentacaoPayload = {
  usuarioId: number;
  supervisorEmail: string;
  supervisorSenha: string;
};

export function cancelarMovimentacaoCaixa(id: string, payload: CancelarMovimentacaoPayload) {
  return apiRequest<{ mensagem: string }>(`/caixa/movimentacoes/${id}/cancelar`, {
    method: "POST",
    body: payload
  });
}
