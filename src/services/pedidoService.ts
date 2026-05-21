import { apiRequest } from "@/services/api";

export type PedidoResumo = {
  id: number;
  numero: string;
  cliente: string;
  tipo: "Orcamento" | "Pedido" | string | number;
  status: "Orcado" | "Aberto" | "Finalizado" | "Cancelado" | string | number;
  dataPedido: string;
  dataEntrega: string | null;
  total: number;
  valorPago: number;
  valorEstornado: number;
  saldoDevedor: number;
  criadoPor: string;
  motivoCancelamento: string | null;
};

export type PedidoDetalhe = {
  id: number;
  numero: string;
  clienteId: number;
  cliente: string;
  empresa: string | null;
  cpfCnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  usuarioId: number;
  tipo: string | number;
  status: string | number;
  dataPedido: string;
  dataEntrega: string | null;
  vendedor: string | null;
  formaPagamento: string | null;
  condicaoPagamento: string | null;
  frente: string | null;
  fundo: string | null;
  observacao: string | null;
  motivoCancelamento: string | null;
  valorEstornado: number;
  valorRetido: number;
  observacaoEstorno: string | null;
  outrosItens: string | null;
  total: number;
  valorPago: number;
  saldoDevedor: number;
  itens: PedidoItemDetalhe[];
  pagamentos: PedidoPagamentoDetalhe[];
};

export type PedidoItemDetalhe = {
  id: number;
  descricao: string;
  tamanho: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export type PedidoPagamentoDetalhe = {
  id: number;
  formaPagamento: string;
  condicaoPagamento: string;
  valor: number;
  observacao: string | null;
  registradoEm: string;
  usuario: string;
};

export type PedidoPayload = {
  numero: string;
  clienteId: number;
  clienteNome: string;
  empresa: string | null;
  cpfCnpj: string | null;
  telefone: string | null;
  endereco: string | null;
  cidade: string | null;
  usuarioId: number;
  dataPedido: string;
  dataEntrega: string | null;
  vendedor: string | null;
  formaPagamento: string | null;
  condicaoPagamento: string | null;
  frente: string | null;
  fundo: string | null;
  observacao: string | null;
  outrosItens: string | null;
  total: number;
  valorPago: number;
  itens: PedidoItemPayload[];
};

export type PedidoItemPayload = {
  descricao: string;
  tamanho: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
};

export function listarPedidosRecentes() {
  return apiRequest<PedidoResumo[]>("/pedidos/recentes");
}

export function listarPedidos() {
  return apiRequest<PedidoResumo[]>("/pedidos");
}

export function obterPedido(id: number) {
  return apiRequest<PedidoDetalhe>(`/pedidos/${id}`);
}

export function criarPedido(payload: PedidoPayload) {
  return apiRequest<{ id: number }>("/pedidos", {
    method: "POST",
    body: payload
  });
}

export function criarOrcamento(payload: PedidoPayload) {
  return apiRequest<{ id: number }>("/pedidos/orcamentos", {
    method: "POST",
    body: payload
  });
}

export function atualizarPedido(id: number, payload: PedidoPayload) {
  return apiRequest<void>(`/pedidos/${id}`, {
    method: "PUT",
    body: payload
  });
}

export function atualizarOrcamento(id: number, payload: PedidoPayload) {
  return apiRequest<void>(`/pedidos/${id}/orcamento`, {
    method: "PUT",
    body: payload
  });
}

export type CancelarPedidoPayload = {
  usuarioId: number;
  observacao?: string | null;
  valorDevolvido: number;
  formaDevolucao?: string | null;
  observacaoEstorno?: string | null;
};

export function cancelarPedido(id: number, payload: CancelarPedidoPayload) {
  return apiRequest<void>(`/pedidos/${id}/cancelar`, {
    method: "PATCH",
    body: payload
  });
}

export type EstornarPedidoPayload = {
  usuarioId: number;
  valorDevolvido: number;
  formaDevolucao: string;
  observacao: string;
};

export function estornarPedido(id: number, payload: EstornarPedidoPayload) {
  return apiRequest<void>(`/pedidos/${id}/estornar`, {
    method: "PATCH",
    body: payload
  });
}

export type FinalizarPedidoPayload = {
  usuarioId: number;
  observacao?: string | null;
  receberSaldo: boolean;
  formaPagamento?: string | null;
};

export function finalizarPedido(id: number, payload: FinalizarPedidoPayload) {
  return apiRequest<void>(`/pedidos/${id}/finalizar`, {
    method: "PATCH",
    body: payload
  });
}



