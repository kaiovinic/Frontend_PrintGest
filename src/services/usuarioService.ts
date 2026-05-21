import { apiRequest } from "@/services/api";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  perfil: string;
  status: string;
  deveTrocarSenha?: boolean;
};

export type UsuarioFiltros = {
  nome?: string;
  email?: string;
  perfil?: string;
  status?: string;
};

export type UsuarioPayload = {
  nome: string;
  email: string;
  telefone: string | null;
  perfil: string;
};

function queryString(filtros?: UsuarioFiltros) {
  const params = new URLSearchParams();
  if (filtros?.nome) params.set("nome", filtros.nome);
  if (filtros?.email) params.set("email", filtros.email);
  if (filtros?.perfil) params.set("perfil", filtros.perfil);
  if (filtros?.status) params.set("status", filtros.status);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listarUsuarios(filtros?: UsuarioFiltros) {
  return apiRequest<Usuario[]>(`/usuarios${queryString(filtros)}`);
}

export function criarUsuario(payload: UsuarioPayload) {
  return apiRequest<{ id: number; senhaPadrao: string }>("/usuarios", {
    method: "POST",
    body: payload
  });
}

export function atualizarUsuario(id: number, payload: UsuarioPayload) {
  return apiRequest<void>(`/usuarios/${id}`, {
    method: "PUT",
    body: payload
  });
}

export function bloquearUsuario(id: number) {
  return apiRequest<void>(`/usuarios/${id}/bloquear`, { method: "PATCH" });
}

export function desbloquearUsuario(id: number) {
  return apiRequest<void>(`/usuarios/${id}/desbloquear`, { method: "PATCH" });
}

export function resetarSenhaUsuario(id: number) {
  return apiRequest<{ senhaPadrao: string }>(`/usuarios/${id}/resetar-senha`, { method: "PATCH" });
}
