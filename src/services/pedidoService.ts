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
  outrosItens: string | null;
  total: number;
  valorPago: number;
  saldoDevedor: number;
  itens: PedidoItemDetalhe[];
};

export type PedidoItemDetalhe = {
  id: number;
  descricao: string;
  tamanho: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
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
