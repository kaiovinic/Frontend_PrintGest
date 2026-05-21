import { apiRequest } from "@/services/api";
import { ResultadoPaginado } from "@/services/pedidoService";

export type LogSistema = {
  id: number;
  usuarioId: number;
  usuario?: string;
  entidade: string;
  entidadeId: number;
  acao: string;
  descricao?: string;
  criadoEm: string;
};

export type LogFiltro = {
  entidade?: string;
  entidadeId?: number;
  dataInicio?: string;
  dataFinal?: string;
  pagina?: number;
  tamanhoPagina?: number;
};

export function listarLogs(filtros: LogFiltro = {}) {
  const params = new URLSearchParams();
  
  if (filtros.entidade) params.set("entidade", filtros.entidade);
  if (filtros.entidadeId) params.set("entidadeId", String(filtros.entidadeId));
  if (filtros.dataInicio) params.set("dataInicio", filtros.dataInicio);
  if (filtros.dataFinal) params.set("dataFinal", filtros.dataFinal);
  
  params.set("pagina", String(filtros.pagina ?? 1));
  params.set("tamanhoPagina", String(filtros.tamanhoPagina ?? 20));

  const query = params.toString();
  return apiRequest<ResultadoPaginado<LogSistema>>(`/logs${query ? `?${query}` : ""}`);
}

