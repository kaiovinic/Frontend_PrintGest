import { Ban, Edit, KeyRound, LockOpen, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  type UsuarioPayload
} from "@/services/usuarioService";

const emptyForm: UsuarioPayload = { nome: "", email: "", telefone: "", perfil: "OPERACIONAL" };
const perfis = ["ADMIN", "GERENTE", "OPERACIONAL"];

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [nomeFiltro, setNomeFiltro] = useState("");
  const [emailFiltro, setEmailFiltro] = useState("");
  const [perfilFiltro, setPerfilFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<UsuarioPayload>(emptyForm);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const filtros = useMemo(() => ({
    nome: nomeFiltro || undefined,
    email: emailFiltro || undefined,
    perfil: perfilFiltro || undefined,
    status: statusFiltro || undefined
  }), [emailFiltro, nomeFiltro, perfilFiltro, statusFiltro]);

  useEffect(() => {
    carregarUsuarios();
  }, [filtros]);

  async function carregarUsuarios() {
    setIsLoading(true);
    await listarUsuarios(filtros)
      .then(setUsuarios)
      .catch(() => {
        setUsuarios([]);
        setMensagem("Nao foi possivel carregar usuarios.");
      })
      .finally(() => setIsLoading(false));
  }

  function novoUsuario() {
    setEditando(null);
    setForm(emptyForm);
    setMensagem(null);
    setFormOpen(true);
  }

  function editarUsuario(usuario: Usuario) {
    setEditando(usuario);
    setForm({ nome: usuario.nome, email: usuario.email, telefone: usuario.telefone ?? "", perfil: normalizarPerfil(usuario.perfil) });
    setMensagem(null);
    setFormOpen(true);
  }

  async function salvarUsuario() {
    if (!form.nome.trim() || !form.email.trim() || !form.perfil) {
      setMensagem("Informe nome, email e perfil do usuario.");
      return;
    }

    setIsSaving(true);
    setMensagem(null);
    try {
      const payload = { ...form, nome: form.nome.trim(), email: form.email.trim(), telefone: form.telefone?.trim() || null };
      if (editando) {
        await atualizarUsuario(editando.id, payload);
        setMensagem("Usuario atualizado com sucesso.");
      } else {
        await criarUsuario(payload);
        setMensagem("Usuario cadastrado com senha padrao 123456789.");
      }
      setFormOpen(false);
      setForm(emptyForm);
      setEditando(null);
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Nao foi possivel salvar o usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  async function alternarBloqueio(usuario: Usuario) {
    setMensagem(null);
    try {
      if (usuarioAtivo(usuario)) {
        await bloquearUsuario(usuario.id);
        setMensagem("Usuario bloqueado.");
      } else {
        await desbloquearUsuario(usuario.id);
        setMensagem("Usuario desbloqueado.");
      }
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Nao foi possivel alterar o status do usuario.");
    }
  }

  async function resetarSenha(usuario: Usuario) {
    setMensagem(null);
    try {
      await resetarSenhaUsuario(usuario.id);
      setMensagem("Senha de " + usuario.nome + " resetada para 123456789. O usuario devera trocar no proximo acesso.");
      await carregarUsuarios();
    } catch (error) {
      setMensagem(error instanceof Error ? error.message : "Nao foi possivel resetar a senha.");
    }
  }

  function limparFiltros() {
    setNomeFiltro("");
    setEmailFiltro("");
    setPerfilFiltro("");
    setStatusFiltro("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-black">Usuarios</h1><p className="text-sm text-muted-foreground">Cadastro, bloqueio, reset e forca de troca</p></div>
        <Button onClick={novoUsuario}><Plus size={16} />Novo usuario</Button>
      </div>
      {mensagem && <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">{mensagem}</p>}
      <Card><CardHeader><CardTitle>Filtros</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_180px_180px_auto]"><Field label="Nome"><Input value={nomeFiltro} onChange={(event) => setNomeFiltro(event.target.value)} /></Field><Field label="Email"><Input value={emailFiltro} onChange={(event) => setEmailFiltro(event.target.value)} /></Field><Field label="Perfil"><Select value={perfilFiltro} onChange={setPerfilFiltro}><option value="">Todos</option>{perfis.map((perfil) => <option key={perfil} value={perfil}>{formatPerfil(perfil)}</option>)}</Select></Field><Field label="Status"><Select value={statusFiltro} onChange={setStatusFiltro}><option value="">Todos</option><option value="ATIVO">Ativo</option><option value="BLOQUEADO">Bloqueado</option></Select></Field><Button className="self-end" variant="outline" onClick={limparFiltros}>Limpar</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Controle de acesso</CardTitle></CardHeader><CardContent className="overflow-x-auto"><Table className="min-w-[920px]"><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Email</TableHead><TableHead>Telefone</TableHead><TableHead>Perfil</TableHead><TableHead>Status</TableHead><TableHead>Troca senha</TableHead><TableHead>Acao</TableHead></TableRow></TableHeader><TableBody>{isLoading && <TableRow><TableCell colSpan={7}>Carregando usuarios...</TableCell></TableRow>}{!isLoading && usuarios.length === 0 && <TableRow><TableCell colSpan={7}>Nenhum usuario encontrado.</TableCell></TableRow>}{!isLoading && usuarios.map((usuario) => <TableRow key={usuario.id}><TableCell>{usuario.nome}</TableCell><TableCell>{usuario.email}</TableCell><TableCell>{usuario.telefone ?? "-"}</TableCell><TableCell>{formatPerfil(usuario.perfil)}</TableCell><TableCell><Badge tone={usuarioAtivo(usuario) ? "success" : "danger"}>{formatStatus(usuario.status)}</Badge></TableCell><TableCell>{usuario.deveTrocarSenha ? "Sim" : "Nao"}</TableCell><TableCell><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => editarUsuario(usuario)}><Edit size={15} />Editar</Button><Button size="sm" variant="outline" onClick={() => resetarSenha(usuario)}><KeyRound size={15} />Reset</Button><Button size="sm" variant={usuarioAtivo(usuario) ? "destructive" : "secondary"} onClick={() => alternarBloqueio(usuario)}>{usuarioAtivo(usuario) ? <Ban size={15} /> : <LockOpen size={15} />}{usuarioAtivo(usuario) ? "Bloquear" : "Desbloquear"}</Button></div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
      {formOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"><Card className="w-full max-w-2xl shadow-2xl"><CardHeader><CardTitle>{editando ? "Editar usuario" : "Novo usuario"}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><Field label="Nome"><Input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} /></Field><Field label="Email"><Input value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field><Field label="Telefone"><Input value={form.telefone ?? ""} onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))} /></Field><Field label="Perfil"><Select value={form.perfil} onChange={(value) => setForm((current) => ({ ...current, perfil: value }))}>{perfis.map((perfil) => <option key={perfil} value={perfil}>{formatPerfil(perfil)}</option>)}</Select></Field><div className="flex justify-end gap-3 md:col-span-2"><Button variant="outline" onClick={() => setFormOpen(false)} disabled={isSaving}>Cancelar</Button><Button onClick={salvarUsuario} disabled={isSaving}>{isSaving ? "Salvando..." : editando ? "Salvar alteracoes" : "Cadastrar"}</Button></div></CardContent></Card></div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="field-label">{label}</span><div className="mt-2">{children}</div></label>; }
function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) { return <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>; }
function normalizarPerfil(value: string) { return value.trim().toUpperCase(); }
function formatPerfil(value: string) { return { ADMIN: "Administrador", GERENTE: "Gerente", OPERACIONAL: "Operacional" }[normalizarPerfil(value)] ?? value; }
function formatStatus(value: string) { return value.trim().toUpperCase() === "ATIVO" ? "Ativo" : "Bloqueado"; }
function usuarioAtivo(usuario: Usuario) { return usuario.status.trim().toUpperCase() === "ATIVO"; }
