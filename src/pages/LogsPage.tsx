import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { logs } from "@/data/mockData";

export function LogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Logs</h1>
        <p className="text-sm text-muted-foreground">Auditoria de alterações, pagamentos e movimentações</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-5 md:grid-cols-4">
          <Input placeholder="Entidade" />
          <Input placeholder="Data início" />
          <Input placeholder="Data final" />
          <Input placeholder="Usuário" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico do sistema</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={`${log.data}-${log.acao}`}>
                  <TableCell>{log.data}</TableCell>
                  <TableCell>{log.usuario}</TableCell>
                  <TableCell>{log.acao}</TableCell>
                  <TableCell>{log.entidade}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
