import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Edit, KeyRound, LockOpen, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm, type UseFormRegisterReturn, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  atualizarUsuario,
  bloquearUsuario,
  criarUsuario,
  desbloquearUsuario,
  listarUsuarios,
  resetarSenhaUsuario,
  type Usuario,
  type UsuarioFiltros,
  type UsuarioPayload
} from "@/services/usuarioService";

const perfis = ["ADMIN", "GERENTE", "OPERACIONAL"];
const usuarioKeys = { lista: (filtros: UsuarioFiltros) => ["usuarios", filtros] as const };

const usuarioSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do usuario."),
  email: z.string().trim().min(1, "Informe o email.").email("Informe um email valido."),
  telefone: z.string().trim().optional(),
  perfil: z.string().min(1, "Selecione o perfil.")
});

type UsuarioForm = z.infer<typeof usuarioSchema>;
const emptyForm: UsuarioForm = { nome: "", email: "", telefone: "", perfil: "OPERACIONAL" };

export function UsuariosPage() {
  const queryClient = useQueryClient();
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [emailFiltro, setEmailFiltro] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const form = useForm<UsuarioForm>({ resolver: zodResolver(usuarioSchema), defaultValues: emptyForm });
  const filtros = useMemo<UsuarioFiltros>(() => ({ nome: nomeFiltro || undefined, email: emailFiltro || undefined, perfil: perfilFiltro || undefined, status: statusFiltro || undefined }), [emailFiltro, nomeFiltro, perfilFiltro, statusFiltro]);

  const usuariosQuery = useQuery({
    queryKey: usuarioKeys.lista(filtros),
    queryFn: () => listarUsuarios(filtros),
    placeholderData: []
  });

  const salvarMutation = useMutation({
    mutationFn: async ({ id, payload }: { id?: number; payload: UsuarioPayload }) => {
      if (id) {
        await atualizarUsuario(id, payload);
        return;
      }
      await criarUsuario(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setMensagem(editando ? "Usuario atualizado com sucesso." : "Usuario cadastrado com senha padrao 123456789.");
      setFormOpen(false);
      setEditando(null);
      form.reset(emptyForm);
    },
    onError: (error) => setMensagem(error instanceof Error ? error.message : "Nao foi possivel salvar o usuario.")
  });

  const resetMutation = useMutation({
    mutationFn: resetarSenhaUsuario,
    onSuccess: async (_, id) => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      const usuario = usuarios.find((item) => item.id === id);
      setMensagem(`Senha de ${usuario?.nome ?? "usuario"} resetada para 123456789. O usuario devera trocar no proximo acesso.`);
    },
    onError: (error) => setMensagem(error instanceof Error ? error.message : "Nao foi possivel resetar a senha.")
  });

  const bloqueioMutation = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) => (ativo ? bloquearUsuario(id) : desbloquearUsuario(id)),
    onSuccess: async (_, values) => {
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setMensagem(values.ativo ? "Usuario bloqueado." : "Usuario desbloqueado.");
    },
    onError: (error) => setMensagem(error instanceof Error ? error.message : "Nao foi possivel alterar o status do usuario.")
  });

  const usuarios = usuariosQuery.data ?? [];
  const isSaving = salvarMutation.isPending || resetMutation.isPending || bloqueioMutation.isPending;

  function novoUsuario() {
    setEditando(null);
    form.reset(emptyForm);
    setMensagem(null);
    setFormOpen(true);
  }

  function editarUsuario(usuario: Usuario) {
    setEditando(usuario);
    form.reset({ nome: usuario.nome, email: usuario.email, telefone: usuario.telefone ?? "", perfil: normalizarPerfil(usuario.perfil) });
    setMensagem(null);
    setFormOpen(true);
  }

  function salvarUsuario(values: UsuarioForm) {
    const payload: UsuarioPayload = { nome: values.nome.trim(), email: values.email.trim(), telefone: values.telefone?.trim() || null, perfil: values.perfil };
    setMensagem(null);
    salvarMutation.mutate({ id: editando?.id, payload });
  }

  function limparFiltros() {
    setNomeFiltro("");
    setEmailFiltro("");
    setPerfilFiltro("");
    setStatusFiltro("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-3xl font-black">Usuarios</h1><p className="text-sm text-muted-foreground">Cadastro, bloqueio, reset e forca de troca</p></div><Button onClick={novoUsuario}><Plus size={16} />Novo usuario</Button></div>
      {mensagem && <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">{mensagem}</p>}
      <Card><CardHeader><CardTitle>Filtros</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_180px_180px_auto]"><Field label="Nome"><Input value={nomeFiltro} onChange={(event) => setNomeFiltro(event.target.value)} /></Field><Field label="Email"><Input value={emailFiltro} onChange={(event) => setEmailFiltro(event.target.value)} /></Field><Field label="Perfil"><Select value={perfilFiltro} onChange={setPerfilFiltro}><option value="">Todos</option>{perfis.map((perfil) => <option key={perfil} value={perfil}>{formatPerfil(perfil)}</option>)}</Select></Field><Field label="Status"><Select value={statusFiltro} onChange={setStatusFiltro}><option value="">Todos</option><option value="ATIVO">Ativo</option><option value="BLOQUEADO">Bloqueado</option></Select></Field><Button className="self-end" variant="outline" onClick={limparFiltros}>Limpar</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Controle de acesso</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead>Troca senha</TableHead><TableHead>Acao</TableHead></TableRow></TableHeader><TableBody>{usuariosQuery.isLoading && <TableRow><TableCell colSpan={7}>Carregando usuarios...</TableCell></TableRow>}{!usuariosQuery.isLoading && usuarios.length === 0 && <TableRow><TableCell colSpan={7}>Nenhum usuario encontrado.</TableCell></TableRow>}{!usuariosQuery.isLoading && usuarios.map((usuario) => <TableRow key={usuario.id}><TableCell>{usuario.nome}</TableCell><TableCell>{usuario.email}</TableCell><TableCell>{usuario.telefone ?? "-"}</TableCell><TableCell>{formatPerfil(usuario.perfil)}</TableCell><TableCell><Badge tone={usuarioAtivo(usuario) ? "success" : "danger"}>{formatStatus(usuario.status)}</Badge></TableCell><TableCell>{usuario.deveTrocarSenha ? "Sim" : "Nao"}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => editarUsuario(usuario)} disabled={isSaving}><Edit size={15} />Editar</Button><Button size="sm" variant="outline" onClick={() => resetMutation.mutate(usuario.id)} disabled={isSaving}><KeyRound size={15} />Reset</Button><Button size="sm" variant={usuarioAtivo(usuario) ? "destructive" : "secondary"} onClick={() => bloqueioMutation.mutate({ id: usuario.id, ativo: usuarioAtivo(usuario) })} disabled={isSaving}>{usuarioAtivo(usuario) ? <Ban size={15} /> : <LockOpen size={15} />}{usuarioAtivo(usuario) ? "Bloquear" : "Desbloquear"}</Button></div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><Card className="w-full max-w-2xl shadow-2xl"><CardHeader><CardTitle>{editando ? "Editar usuario" : "Novo usuario"}</CardTitle></CardHeader><CardContent><UsuarioFormCard form={form} perfis={perfis} isSaving={isSaving} onCancel={() => setFormOpen(false)} onSubmit={salvarUsuario} /></CardContent></Card></div>}
    </div>
  );
}

function UsuarioFormCard({ form, perfis, isSaving, onCancel, onSubmit }: { form: UseFormReturn<UsuarioForm>; perfis: string[]; isSaving: boolean; onCancel: () => void; onSubmit: (values: UsuarioForm) => void }) {
  return <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}><FieldError message={form.formState.errors.nome?.message}><FieldInput label="Nome" register={form.register("nome")} /></FieldError><FieldError message={form.formState.errors.email?.message}><FieldInput label="Email" register={form.register("email")} /></FieldError><FieldError message={form.formState.errors.telefone?.message}><FieldInput label="Telefone" register={form.register("telefone")} /></FieldError><FieldError message={form.formState.errors.perfil?.message}><label><span className="field-label">Perfil</span><select className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" {...form.register("perfil")}>{perfis.map((perfil) => <option key={perfil} value={perfil}>{formatPerfil(perfil)}</option>)}</select></label></FieldError><div className="flex justify-end gap-3 md:col-span-2"><Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button><Button type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button></div></form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="field-label">{label}</span><div className="mt-2">{children}</div></label>; }
function FieldInput({ label, register }: { label: string; register: UseFormRegisterReturn }) { return <label><span className="field-label">{label}</span><Input className="mt-2" {...register} /></label>; }
function FieldError({ message, children }: { message?: string; children: React.ReactNode }) { return <div>{children}{message && <p className="mt-1 text-sm font-semibold text-destructive">{message}</p>}</div>; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>; }
function normalizarPerfil(value: string) { return value.trim().toUpperCase(); }
function formatPerfil(value: string) { return { ADMIN: "Administrador", GERENTE: "Gerente", OPERACIONAL: "Operacional" }[normalizarPerfil(value)] ?? value; }
function formatStatus(value: string) { return value.trim().toUpperCase() === "ATIVO" ? "Ativo" : "Bloqueado"; }
function usuarioAtivo(usuario: Usuario) { return usuario.status.trim().toUpperCase() === "ATIVO"; }
