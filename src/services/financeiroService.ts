import { apiRequest } from "@/services/api";

export type FinanceiroFiltros = {
  ano?: string;
  mes?: string;
  inicio?: string;
  fim?: string;
  status?: string;
};

export type VendaPedido = {
  id: number;
  numero: string;
  cliente: string;
  tipo: string;
  status: string;
  dataPedido: string;
  dataEntrega: string | null;
  total: number;
  valorPago: number;
  valorEstornado: number;
  saldoDevedor: number;
  criadoPor: string;
  motivoCancelamento: string | null;
};

export type VendasFinanceiro = {
  resumo: {
    totalVendas: number;
    valorRecebido: number;
    valorPendente: number;
    quantidadePedidos: number;
    quantidadeDevolucoes: number;
    valorDevolvido: number;
    pedidosEmAndamento: number;
    valorEntrouHoje: number;
  };
  pedidos: VendaPedido[];
};

export type EntradaFinanceira = {
  origem: string;
  formaPagamento: string;
  valor: number;
  data: string;
  descricao: string;
  usuario: string;
};

export type EntradasFinanceiro = {
  resumo: {
    total: number;
    dinheiro: number;
    pix: number;
    cartaoCredito: number;
    cartaoDebito: number;
    entrouHoje: number;
  };
  entradas: EntradaFinanceira[];
};

export type Despesa = {
  id: number;
  grupoDespesaId: string;
  numeroParcela: number;
  totalParcelas: number;
  categoria: string;
  descricao: string;
  valor: number;
  valorTotal: number;
  vencimento: string;
  status: string;
  dataPagamento: string | null;
  observacao: string | null;
};

export type DespesasFinanceiro = {
  resumo: {
    totalDespesas: number;
    vencimentoHoje: number;
    valorVencimentoHoje: number;
    totalMes: number;
    totalNaoPagoMes: number;
    totalPagoMes: number;
  };
  categorias: string[];
  despesas: Despesa[];
};

export type GraficoPonto = {
  mes?: number;
  valor: number;
  categoria?: string;
  cliente?: string;
};

export type GraficosFinanceiro = {
  ano: number;
  mes: number;
  receitaAnual: GraficoPonto[];
  despesaAnual: GraficoPonto[];
  despesasMes: GraficoPonto[];
  clientesMes: GraficoPonto[];
};

export type DespesaPayload = {
  usuarioId: number;
  categoria: string;
  descricao: string;
  valor: number;
  vencimento: string;
  condicaoPagamento: "A_VISTA" | "PARCELADO";
  quantidadeParcelas: number;
  observacao: string | null;
};

function queryString(filtros?: FinanceiroFiltros) {
  const params = new URLSearchParams();
  if (filtros?.ano) params.set("ano", filtros.ano);
  if (filtros?.mes) params.set("mes", filtros.mes);
  if (filtros?.inicio) params.set("inicio", filtros.inicio);
  if (filtros?.fim) params.set("fim", filtros.fim);
  if (filtros?.status) params.set("status", filtros.status);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function obterVendasFinanceiro(filtros?: FinanceiroFiltros) {
  return apiRequest<VendasFinanceiro>(`/financeiro/vendas${queryString(filtros)}`);
}

export function obterEntradasFinanceiro(filtros?: FinanceiroFiltros) {
  return apiRequest<EntradasFinanceiro>(`/financeiro/entradas${queryString(filtros)}`);
}

export function obterDespesasFinanceiro(filtros?: FinanceiroFiltros) {
  return apiRequest<DespesasFinanceiro>(`/financeiro/despesas${queryString(filtros)}`);
}

export function obterGraficosFinanceiro(filtros?: FinanceiroFiltros) {
  return apiRequest<GraficosFinanceiro>(`/financeiro/graficos${queryString(filtros)}`);
}

export function criarDespesa(payload: DespesaPayload) {
  return apiRequest<{ id: number }>("/financeiro/despesas", {
    method: "POST",
    body: payload
  });
}

export function pagarDespesa(id: number) {
  return apiRequest<void>(`/financeiro/despesas/${id}/pagar`, {
    method: "PATCH"
  });
}

export function listarDespesas() {
  return obterDespesasFinanceiro().then((response) => response.despesas);
}