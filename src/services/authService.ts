import { apiRequest } from "@/services/api";

export type AuthUser = {
  usuarioId: number;
  nome: string;
  email: string;
  perfil: "ADMIN" | "GERENTE" | "OPERACIONAL" | string;
  deveTrocarSenha: boolean;
  accessToken: string;
};

export type LoginPayload = {
  email: string;
  senha: string;
};

export function login(payload: LoginPayload) {
  return apiRequest<AuthUser>("/auth/login", {
    method: "POST",
    body: payload
  });
}

export type TrocarSenhaPayload = {
  email: string;
  senhaAtual: string;
  novaSenha: string;
  confirmarNovaSenha: string;
};

export function trocarSenha(payload: TrocarSenhaPayload) {
  return apiRequest<void>("/auth/trocar-senha", {
    method: "PATCH",
    body: payload
  });
}
