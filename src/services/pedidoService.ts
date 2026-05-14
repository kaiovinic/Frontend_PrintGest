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

export function listarPedidosRecentes() {
  return apiRequest<PedidoResumo[]>("/pedidos/recentes");
}

export function listarPedidos() {
  return apiRequest<PedidoResumo[]>("/pedidos");
}
