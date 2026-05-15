import { apiRequest } from "@/services/api";

export type Usuario = {
  id?: number;
  nome: string;
  email: string;
  perfil: string;
  status: string;
  deveTrocarSenha?: boolean;
};

export function listarUsuarios() {
  return apiRequest<Usuario[]>("/usuarios");
}
