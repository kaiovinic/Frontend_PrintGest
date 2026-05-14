import { Plus } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { movimentacoes, produtos } from "@/data/mockData";

export function EstoquePage() {
  const [tab, setTab] = useState("Produtos");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Controle de estoque</h1>
          <p className="text-sm text-muted-foreground">Produtos, materiais, movimentações e alertas</p>
        </div>
        <Button>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>

      <Tabs tabs={["Produtos", "Cadastrar produto", "Movimentação", "Editar produto"]} active={tab} onChange={setTab} />

      {tab === "Produtos" && <Produtos />}
      {tab === "Cadastrar produto" && <CadastrarProduto />}
      {tab === "Movimentação" && <Movimentacao />}
      {tab === "Editar produto" && <EditarProduto />}
    </div>
  );
}

function Produtos() {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Itens" value="48" tone="green" />
        <Metric title="Baixo estoque" value="7" tone="rose" />
        <Metric title="Entradas mês" value="23" tone="green" />
        <Metric title="Saídas mês" value="31" tone="amber" />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Produtos em estoque</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Tam.</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Mín.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produtos.map((produto) => (
                <TableRow key={`${produto.produto}-${produto.tamanho}`}>
                  <TableCell>{produto.produto}</TableCell>
                  <TableCell>{produto.tamanho}</TableCell>
                  <TableCell>{produto.qtd}</TableCell>
                  <TableCell>{produto.minimo}</TableCell>
                  <TableCell>
                    <Badge tone={produto.status === "OK" ? "success" : "danger"}>{produto.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline">
                      {produto.status === "Baixo" ? "Comprar" : "Editar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function CadastrarProduto() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cadastrar produto</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <Input defaultValue="Camisa branca" />
        <Input defaultValue="M" />
        <Input defaultValue="Unidade" />
        <Input defaultValue="Camisas" />
        <Input defaultValue="50" />
        <Input defaultValue="10" />
        <Input defaultValue="R$ 18,00" />
        <Input className="md:col-span-2" defaultValue="Fornecedor de malhas" />
        <Textarea className="md:col-span-2" defaultValue="Usar em pedidos de sublimação." maxLength={300} />
        <Button>Salvar produto</Button>
      </CardContent>
    </Card>
  );
}

function Movimentacao() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nova movimentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input defaultValue="Camisa branca M" />
          <Input defaultValue="Saída" />
          <Input defaultValue="20" />
          <Input defaultValue="#1025" />
          <Button>Registrar</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Qtd.</TableHead>
                <TableHead>Resp.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.map((mov) => (
                <TableRow key={`${mov.data}-${mov.tipo}`}>
                  <TableCell>{mov.data}</TableCell>
                  <TableCell>
                    <Badge tone={mov.tipo === "Entrada" ? "success" : mov.tipo === "Reserva" ? "warning" : "danger"}>
                      {mov.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>{mov.produto}</TableCell>
                  <TableCell>{mov.qtd}</TableCell>
                  <TableCell>{mov.resp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function EditarProduto() {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader>
        <CardTitle>Editar produto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input defaultValue="Camisa branca M" />
        <Input defaultValue="Camisa algodão branca M" />
        <Textarea defaultValue="Padronizar nome do produto sem perder histórico." maxLength={300} />
        <Button>Salvar alteração</Button>
      </CardContent>
    </Card>
  );
}

function Metric({ title, value, tone }: { title: string; value: string; tone: "green" | "rose" | "amber" }) {
  const colors = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
  };
  return (
    <Card className={colors[tone]}>
      <CardContent className="p-5">
        <p className="text-sm font-semibold opacity-80">{title}</p>
        <p className="mt-2 text-3xl font-black">{value}</p>
      </CardContent>
    </Card>
  );
}
