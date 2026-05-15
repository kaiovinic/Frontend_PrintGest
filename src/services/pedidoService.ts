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
  saldoDevedor: number;
  criadoPor: string;
};

export type PedidoDetalhe = {
  id: number;
  numero: string;
  clienteId: number;
  cliente: string;
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
  tamanhosMasculinos: string | null;
  tamanhosFemininos: string | null;
  observacao: string | null;
  total: number;
  valorPago: number;
  saldoDevedor: number;
};

export type PedidoPayload = {
  numero: string;
  clienteId: number;
  usuarioId: number;
  dataPedido: string;
  dataEntrega: string | null;
  vendedor: string | null;
  formaPagamento: string | null;
  condicaoPagamento: string | null;
  frente: string | null;
  fundo: string | null;
  tamanhosMasculinos: string | null;
  tamanhosFemininos: string | null;
  observacao: string | null;
  total: number;
  valorPago: number;
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
