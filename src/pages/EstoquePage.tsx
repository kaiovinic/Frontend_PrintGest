import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { listarMovimentacoesEstoque, listarProdutosEstoque, type MovimentacaoEstoque, type ProdutoEstoque } from "@/services/estoqueService";

export function EstoquePage() {
  const [tab, setTab] = useState("Produtos");
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const baixoEstoque = produtos.filter((produto) => statusProduto(produto) === "Baixo").length;

  useEffect(() => {
    listarProdutosEstoque().then(setProdutos).catch(() => setProdutos([]));
    listarMovimentacoesEstoque().then(setMovimentacoes).catch(() => setMovimentacoes([]));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">Controle de estoque</h1>
          <p className="text-sm text-muted-foreground">Produtos, materiais, movimentações e alertas</p>
        </div>
        <Button onClick={() => setTab("Cadastrar produto")}>
          <Plus size={16} />
          Novo produto
        </Button>
      </div>

      <Tabs tabs={["Produtos", "Cadastrar produto", "Movimentação", "Editar produto"]} active={tab} onChange={setTab} />

      {tab === "Produtos" && <Produtos produtos={produtos} baixoEstoque={baixoEstoque} />}
      {tab === "Cadastrar produto" && <CadastrarProduto />}
      {tab === "Movimentação" && <Movimentacao movimentacoes={movimentacoes} />}
      {tab === "Editar produto" && <EditarProduto />}
    </div>
  );
}

function Produtos({ produtos, baixoEstoque }: { produtos: ProdutoEstoque[]; baixoEstoque: number }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Itens" value={String(produtos.length)} tone="green" />
        <Metric title="Baixo estoque" value={String(baixoEstoque)} tone="rose" />
        <Metric title="Entradas mês" value="0" tone="green" />
        <Metric title="Saídas mês" value="0" tone="amber" />
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
              {produtos.map((produto, index) => {
                const status = statusProduto(produto);
                return (
                  <TableRow key={`${produto.id ?? index}-${produto.nome ?? produto.produto}`}>
                    <TableCell>{produto.nome ?? produto.produto}</TableCell>
                    <TableCell>{produto.tamanho ?? "-"}</TableCell>
                    <TableCell>{produto.quantidade ?? produto.qtd ?? 0}</TableCell>
                    <TableCell>{produto.estoqueMinimo ?? produto.minimo ?? 0}</TableCell>
                    <TableCell>
                      <Badge tone={status === "OK" ? "success" : "danger"}>{status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        {status === "Baixo" ? "Comprar" : "Editar"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
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
        <Input placeholder="Nome do produto" />
        <Input placeholder="Tamanho" />
        <Input placeholder="Unidade" />
        <Input placeholder="Categoria" />
        <Input placeholder="Qtd. inicial" />
        <Input placeholder="Estoque mínimo" />
        <Input placeholder="Custo unitário" />
        <Input className="md:col-span-2" placeholder="Fornecedor" />
        <Textarea className="md:col-span-2" placeholder="Observação" maxLength={300} />
        <Button>Salvar produto</Button>
      </CardContent>
    </Card>
  );
}

function Movimentacao({ movimentacoes }: { movimentacoes: MovimentacaoEstoque[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>Nova movimentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Produto" />
          <Input placeholder="Tipo" />
          <Input placeholder="Quantidade" />
          <Input placeholder="Pedido vinculado" />
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
              {movimentacoes.map((mov, index) => (
                <TableRow key={`${mov.data}-${mov.tipo}-${index}`}>
                  <TableCell>{mov.data ?? "-"}</TableCell>
                  <TableCell>
                    <Badge tone={mov.tipo === "Entrada" ? "success" : mov.tipo === "Reserva" ? "warning" : "danger"}>{mov.tipo}</Badge>
                  </TableCell>
                  <TableCell>{mov.produto ?? "-"}</TableCell>
                  <TableCell>{mov.quantidade ?? mov.qtd ?? "-"}</TableCell>
                  <TableCell>{mov.responsavel ?? mov.resp ?? "-"}</TableCell>
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
        <Input placeholder="Nome atual" />
        <Input placeholder="Novo nome" />
        <Textarea placeholder="Motivo da alteração" maxLength={300} />
        <Button>Salvar alteração</Button>
      </CardContent>
    </Card>
  );
}

function statusProduto(produto: ProdutoEstoque) {
  const qtd = produto.quantidade ?? produto.qtd ?? 0;
  const minimo = produto.estoqueMinimo ?? produto.minimo ?? 0;
  return produto.status ?? (qtd <= minimo ? "Baixo" : "OK");
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
