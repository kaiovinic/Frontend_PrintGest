import { Ban, KeyRound, LockOpen, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarUsuarios, type Usuario } from "@/services/usuarioService";

export function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listarUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Usuários</h1>
        <p className="text-sm text-muted-foreground">Cadastro, bloqueio, reset e força de troca</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_170px_170px_auto]">
          <Input placeholder="Nome" />
          <Input placeholder="Email" />
          <Input placeholder="Telefone" />
          <Input placeholder="Perfil" />
          <Button>
            <Plus size={16} />
            Cadastrar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Controle de acesso</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Senha</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6}>Carregando usuários...</TableCell>
                </TableRow>
              )}
              {!isLoading &&
                usuarios.map((usuario) => (
                  <TableRow key={usuario.email}>
                    <TableCell>{usuario.nome}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>{usuario.perfil}</TableCell>
                    <TableCell>
                      <Badge tone={usuario.status === "ATIVO" || usuario.status === "Ativo" ? "success" : "danger"}>{usuario.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <KeyRound size={15} />
                        Reset
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant={usuario.status === "ATIVO" || usuario.status === "Ativo" ? "destructive" : "secondary"}>
                        {usuario.status === "ATIVO" || usuario.status === "Ativo" ? <Ban size={15} /> : <LockOpen size={15} />}
                        {usuario.status === "ATIVO" || usuario.status === "Ativo" ? "Bloquear" : "Desbloquear"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
