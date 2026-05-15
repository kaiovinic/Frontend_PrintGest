import { apiRequest } from "@/services/api";

export type Despesa = {
  id?: number;
  tipo?: string;
  categoria?: string;
  descricao?: string;
  valor: number | string;
  status: string;
};

export function listarDespesas() {
  return apiRequest<Despesa[]>("/financeiro/despesas");
}
