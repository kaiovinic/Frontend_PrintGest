import { apiRequest } from "@/services/api";

export type LogSistema = {
  id?: number;
  criadoEm?: string;
  data?: string;
  usuario?: string;
  acao: string;
  entidade: string;
  entidadeId?: number;
};

export function listarLogs() {
  return apiRequest<LogSistema[]>("/logs");
}
