import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listarLogs, type LogSistema } from "@/services/logService";

function obterDataHoje() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function getAcaoTone(acao: string): "default" | "success" | "warning" | "danger" | "info" | undefined {
  const act = acao.toUpperCase();
  if (act.includes("CRIAR") || act.includes("INSERT") || act.includes("ADICIONAR") || act.includes("REGISTRAR") || act.includes("SALVAR")) {
    return "success";
  }
  if (act.includes("EDITAR") || act.includes("ATUALIZAR") || act.includes("UPDATE") || act.includes("ALTERAR")) {
    return "info";
  }
  if (act.includes("DELETAR") || act.includes("EXCLUIR") || act.includes("REMOVER") || act.includes("CANCELAR") || act.includes("ESTORNAR")) {
    return "danger";
  }
  if (act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("AUTH")) {
    return "warning";
  }
  return undefined;
}

export function LogsPage() {
  const hoje = obterDataHoje();
  const [entidade, setEntidade] = useState("");
  const [entidadeId, setEntidadeId] = useState("");
  const [dataInicio, setDataInicio] = useState(hoje);
  const [dataFinal, setDataFinal] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const [logs, setLogs] = useState<LogSistema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [logSelecionado, setLogSelecionado] = useState<LogSistema | null>(null);

  const carregarLogs = async (pageNumber = pagina) => {
    setIsLoading(true);
    try {
      const response = await listarLogs({
        entidade: entidade.trim() || undefined,
        entidadeId: entidadeId ? Number(entidadeId) : undefined,
        dataInicio: dataInicio || undefined,
        dataFinal: dataFinal || undefined,
        pagina: pageNumber,
        tamanhoPagina
      });
      setLogs(response.itens);
      setTotal(response.total);
      setTotalPaginas(response.totalPaginas);
      setPagina(response.pagina);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      setLogs([]);
      setTotal(0);
      setTotalPaginas(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregarLogs(pagina);
  }, [pagina]);

  const handleFiltrar = (e: React.FormEvent) => {
    e.preventDefault();
    if (pagina === 1) {
      carregarLogs(1);
    } else {
      setPagina(1);
    }
  };

  const handleLimpar = () => {
    setEntidade("");
    setEntidadeId("");
    setDataInicio(hoje);
    setDataFinal("");
    
    setIsLoading(true);
    listarLogs({
      dataInicio: hoje,
      pagina: 1,
      tamanhoPagina
    })
      .then((response) => {
        setLogs(response.itens);
        setTotal(response.total);
        setTotalPaginas(response.totalPaginas);
        setPagina(1);
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
        setTotalPaginas(1);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Logs</h1>
        <p className="text-sm text-muted-foreground">Auditoria de alterações, pagamentos e movimentações</p>
      </div>

      <Card>
        <CardContent className="p-5">
          <form onSubmit={handleFiltrar} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto] items-end">
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Entidade</span>
              <Input
                className="mt-1"
                placeholder="Ex: Pedido, Cliente..."
                value={entidade}
                onChange={(e) => setEntidade(e.target.value)}
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">ID do Registro</span>
              <Input
                className="mt-1"
                type="number"
                placeholder="Ex: 42"
                value={entidadeId}
                onChange={(e) => setEntidadeId(e.target.value)}
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data Início</span>
              <Input
                className="mt-1"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data Final</span>
              <Input
                className="mt-1"
                type="date"
                value={dataFinal}
                onChange={(e) => setDataFinal(e.target.value)}
              />
            </div>
            <Button type="submit" variant="default" className="w-full md:w-auto">
              Filtrar
            </Button>
            <Button type="button" variant="outline" onClick={handleLimpar} className="w-full md:w-auto">
              Limpar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle>Histórico do sistema</CardTitle>
          <span className="text-xs text-muted-foreground">Clique em uma linha para ver os detalhes</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>ID Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando registros de auditoria...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum registro de log encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                logs.map((log) => (
                  <TableRow
                    key={log.id}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                    onClick={() => setLogSelecionado(log)}
                  >
                    <TableCell className="whitespace-nowrap">{formatDateTime(log.criadoEm)}</TableCell>
                    <TableCell>{log.usuario ? `${log.usuario} (ID: ${log.usuarioId})` : `ID: ${log.usuarioId}`}</TableCell>
                    <TableCell>
                      <Badge tone={getAcaoTone(log.acao)}>{log.acao}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">{log.entidade}</TableCell>
                    <TableCell>#{log.entidadeId}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>

          {!isLoading && total > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Exibindo página {pagina} de {totalPaginas} ({total} logs no total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina <= 1}
                  onClick={() => setPagina((page) => Math.max(1, page - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagina >= totalPaginas}
                  onClick={() => setPagina((page) => page + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {logSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-background">
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold">Detalhes do Registro de Auditoria</CardTitle>
                <button
                  onClick={() => setLogSelecionado(null)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">ID do Log</span>
                  <p className="text-sm font-semibold mt-0.5">#{logSelecionado.id}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Data / Hora</span>
                  <p className="text-sm font-semibold mt-0.5">{formatDateTime(logSelecionado.criadoEm)}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Usuário</span>
                  <p className="text-sm font-semibold mt-0.5">
                    {logSelecionado.usuario ? `${logSelecionado.usuario} (ID: ${logSelecionado.usuarioId})` : `ID: ${logSelecionado.usuarioId}`}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Ação</span>
                  <div className="mt-0.5">
                    <Badge tone={getAcaoTone(logSelecionado.acao)}>{logSelecionado.acao}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Entidade</span>
                  <p className="text-sm font-semibold mt-0.5">{logSelecionado.entidade}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">ID da Entidade</span>
                  <p className="text-sm font-semibold mt-0.5">#{logSelecionado.entidadeId}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Descrição / Conteúdo</span>
                <div className="mt-2">
                  {logSelecionado.descricao ? (
                    <pre className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-md text-xs font-mono overflow-auto max-h-80 whitespace-pre-wrap break-all text-slate-800 dark:text-slate-200">
                      {logSelecionado.descricao}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma descrição detalhada disponível.</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t mt-4">
                <Button onClick={() => setLogSelecionado(null)}>
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

