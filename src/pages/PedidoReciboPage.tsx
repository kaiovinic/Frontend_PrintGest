import { Copy, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { obterPedido, type PedidoDetalhe, type PedidoResumo } from "@/services/pedidoService";
import { formatCurrency, formatStatusPedido, formatTipoPedido } from "@/utils/formatters";

export function PedidoReciboPage({ pedido }: { pedido?: PedidoResumo | null }) {
  const [detalhe, setDetalhe] = useState<PedidoDetalhe | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(pedido?.id));
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    if (!pedido?.id) {
      setMensagem("Selecione um pedido para visualizar o recibo.");
      setIsLoading(false);
      return;
    }

    obterPedido(pedido.id)
      .then((data) => {
        setDetalhe(data);
        setMensagem(null);
      })
      .catch(() => setMensagem("Não foi possível carregar o recibo do pedido."))
      .finally(() => setIsLoading(false));
  }, [pedido?.id]);

  const dadosRecibo = useMemo(() => {
    if (!detalhe) return null;

    const status = formatStatusPedido(detalhe.status);
    const valorRetido = Math.max(detalhe.valorPago - detalhe.valorEstornado, 0);
    const saldoExibido = status === "Cancelado" ? valorRetido : detalhe.saldoDevedor;

    return {
      tipo: formatTipoPedido(detalhe.tipo),
      status,
      valorRetido,
      saldoExibido
    };
  }, [detalhe]);

  const resumo = useMemo(() => {
    if (!detalhe || !dadosRecibo) return "";

    const itens = detalhe.itens.length
      ? detalhe.itens.map((item, index) => {
          const tamanho = item.tamanho ? ` ${item.tamanho}` : "";
          return `${index + 1}. ${item.quantidade}x${tamanho} ${item.descricao} - ${formatCurrency(item.valorTotal)}`;
        })
      : ["Nenhum item informado."];

    return [
      `Print Impressões - ${dadosRecibo.tipo} ${detalhe.numero}`,
      `Status: ${dadosRecibo.status}`,
      `Cliente: ${detalhe.cliente}`,
      detalhe.empresa ? `Empresa: ${detalhe.empresa}` : null,
      detalhe.telefone ? `Telefone: ${detalhe.telefone}` : null,
      `Data do pedido: ${formatDate(detalhe.dataPedido)}`,
      detalhe.dataEntrega ? `Entrega: ${formatDate(detalhe.dataEntrega)}` : null,
      "",
      "Itens:",
      ...itens,
      "",
      `Total: ${formatCurrency(detalhe.total)}`,
      `Pago: ${formatCurrency(detalhe.valorPago)}`,
      dadosRecibo.status === "Cancelado" ? `Valor retido: ${formatCurrency(dadosRecibo.valorRetido)}` : `Saldo: ${formatCurrency(detalhe.saldoDevedor)}`,
      detalhe.valorEstornado > 0 ? `Devolução: ${formatCurrency(detalhe.valorEstornado)}` : null,
      detalhe.formaPagamento ? `Pagamento: ${formatFormaPagamento(detalhe.formaPagamento)}` : null,
      detalhe.condicaoPagamento ? `Condição: ${formatCondicao(detalhe.condicaoPagamento)}` : null,
      detalhe.frente ? `Frente: ${detalhe.frente}` : null,
      detalhe.fundo ? `Fundo: ${detalhe.fundo}` : null,
      detalhe.outrosItens ? `Outros itens: ${detalhe.outrosItens}` : null,
      detalhe.observacao ? `Observação: ${detalhe.observacao}` : null,
      detalhe.motivoCancelamento ? `Motivo do cancelamento: ${detalhe.motivoCancelamento}` : null,
      detalhe.observacaoEstorno ? `Observação da devolução: ${detalhe.observacaoEstorno}` : null
    ]
      .filter((line) => line !== null)
      .join("\n");
  }, [detalhe, dadosRecibo]);

  async function copiarResumo() {
    if (!resumo) return;
    await navigator.clipboard.writeText(resumo);
    setMensagem("Resumo completo copiado. Agora pode colar no WhatsApp.");
  }

  if (isLoading) {
    return <p className="text-sm font-semibold text-muted-foreground">Carregando recibo...</p>;
  }

  if (!detalhe || !dadosRecibo) {
    return <p className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive">{mensagem}</p>;
  }

  return (
    <div className="space-y-4">
      <style>{printStyles}</style>
      <div className="receipt-actions flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-black">Recibo / Pedido</h1>
          <p className="text-sm text-muted-foreground">Modelo compacto para impressão, PDF ou envio ao cliente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copiarResumo}>
            <Copy size={16} />
            Copiar resumo
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir / salvar PDF
          </Button>
        </div>
      </div>

      {mensagem && <p className="receipt-message print:hidden rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">{mensagem}</p>}

      <article className="receipt mx-auto max-w-[820px] border border-slate-300 bg-white p-5 text-slate-950 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="receipt-section grid grid-cols-[1fr_auto] gap-4 border-b-2 border-slate-900 pb-3">
          <div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black leading-none text-primary">Print</span>
              <span className="text-sm font-black leading-none">Impressões</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-slate-700">Rua Carlos Gomes, Centro - Alagoinhas/BA</p>
            <p className="text-[11px] font-semibold text-slate-700">Telefone: (75) 3422-5776</p>
          </div>
          <div className="min-w-44 border border-slate-900 p-2 text-right">
            <p className="text-[10px] font-black uppercase text-slate-600">Recibo / Pedido</p>
            <p className="text-2xl font-black leading-tight">#{detalhe.numero}</p>
            <p className="text-[11px] font-bold">{dadosRecibo.tipo} - {dadosRecibo.status}</p>
            <p className="text-[11px] font-semibold">Emissão: {formatDate(detalhe.dataPedido)}</p>
          </div>
        </header>

        <section className="receipt-section mt-3 border border-slate-400">
          <h2 className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-black uppercase tracking-wide">Cliente / Destinatário</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-2 text-[12px]">
            <Line label="Cliente" value={detalhe.cliente} />
            <Line label="Empresa" value={detalhe.empresa} />
            <Line label="CPF/CNPJ" value={detalhe.cpfCnpj} />
            <Line label="Telefone" value={detalhe.telefone} />
            <Line label="Endereço" value={detalhe.endereco} wide />
            <Line label="Cidade" value={detalhe.cidade} />
            <Line label="Data entrega" value={detalhe.dataEntrega ? formatDate(detalhe.dataEntrega) : "-"} />
          </div>
        </section>

        <section className="receipt-section mt-3">
          <h2 className="border border-b-0 border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-black uppercase tracking-wide">Itens do pedido</h2>
          <table className="receipt-table w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th>Qtd.</th>
                <th>Tam.</th>
                <th className="text-left">Descrição</th>
                <th>Unitário</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {detalhe.itens.length ? (
                detalhe.itens.map((item) => (
                  <tr key={item.id}>
                    <td className="text-center">{item.quantidade}</td>
                    <td className="text-center">{item.tamanho ?? "-"}</td>
                    <td>{item.descricao}</td>
                    <td className="text-right">{formatCurrency(item.valorUnitario)}</td>
                    <td className="text-right font-bold">{formatCurrency(item.valorTotal)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>Nenhum item informado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="receipt-section mt-3 grid grid-cols-[1fr_260px] gap-3">
          <div className="border border-slate-400">
            <h2 className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-black uppercase tracking-wide">Observações e produção</h2>
            <div className="space-y-1 p-2 text-[11px] leading-snug">
              <CompactText label="Frente" value={detalhe.frente} />
              <CompactText label="Fundo" value={detalhe.fundo} />
              <CompactText label="Outros itens" value={detalhe.outrosItens} />
              <CompactText label="Observação" value={detalhe.observacao} />
              {detalhe.motivoCancelamento && <CompactText label="Motivo cancelamento" value={detalhe.motivoCancelamento} />}
              {detalhe.observacaoEstorno && <CompactText label="Obs. devolução" value={detalhe.observacaoEstorno} />}
            </div>
          </div>

          <div className="border border-slate-900 text-[12px]">
            <h2 className="border-b border-slate-900 bg-slate-900 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-white">Totais</h2>
            <MoneyLine label="Total" value={formatCurrency(detalhe.total)} strong />
            <MoneyLine label="Pago" value={formatCurrency(detalhe.valorPago)} />
            <MoneyLine label={dadosRecibo.status === "Cancelado" ? "Valor retido" : "Saldo"} value={formatCurrency(dadosRecibo.saldoExibido)} />
            {detalhe.valorEstornado > 0 && <MoneyLine label="Devolução" value={formatCurrency(detalhe.valorEstornado)} />}
            <div className="border-t border-slate-300 px-2 py-1">
              <p><span className="font-black">Forma:</span> {formatFormaPagamento(detalhe.formaPagamento)}</p>
              <p><span className="font-black">Condição:</span> {formatCondicao(detalhe.condicaoPagamento)}</p>
            </div>
          </div>
        </section>

        {detalhe.pagamentos && detalhe.pagamentos.length > 0 && (
          <section className="receipt-section mt-3 border border-slate-400">
            <h2 className="border-b border-slate-400 bg-slate-100 px-2 py-1 text-[11px] font-black uppercase tracking-wide">
              Histórico de Pagamentos
            </h2>
            <div className="p-2 space-y-1 text-[11px]">
              {detalhe.pagamentos.map((pag) => (
                <div key={pag.id} className="grid grid-cols-3 gap-2 py-0.5 border-b border-slate-200 last:border-b-0">
                  <span className="font-bold">{formatCurrency(pag.valor)}</span>
                  <span>{formatFormaPagamento(pag.formaPagamento)}</span>
                  <span className="text-slate-600 text-right">{formatDateTime(pag.registradoEm)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="receipt-section mt-6 grid grid-cols-2 gap-12 text-center text-[11px] font-bold">
          <div className="border-t border-slate-900 pt-1">Vendedor</div>
          <div className="border-t border-slate-900 pt-1">Cliente</div>
        </footer>
      </article>
    </div>
  );
}

function Line({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <p className={wide ? "col-span-2" : undefined}>
      <span className="font-black">{label}:</span> {value || "-"}
    </p>
  );
}

function CompactText({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-black">{label}:</span> {value}
    </p>
  );
}

function MoneyLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="grid grid-cols-[1fr_auto] border-b border-slate-300 px-2 py-1">
      <span className="font-bold">{label}</span>
      <span className={strong ? "text-base font-black" : "font-black"}>{value}</span>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatFormaPagamento(value: string | null) {
  if (!value) return "-";
  const labels: Record<string, string> = {
    PIX: "PIX",
    DINHEIRO: "Dinheiro",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito"
  };
  if (value.includes(" e ")) {
    return value.split(" e ").map(v => labels[v.trim()] ?? v.trim()).join(" e ");
  }
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function formatCondicao(value: string | null) {
  const labels: Record<string, string> = {
    A_VISTA: "À vista",
    PAGAMENTO_NO_PEDIDO: "Pagamento no pedido",
    ADIANTAMENTO: "Adiantamento / parcelado"
  };
  return value ? labels[value] ?? value : "-";
}

const printStyles = `
  @page {
    size: A4;
    margin: 9mm;
  }

  .receipt-table th,
  .receipt-table td {
    border: 1px solid #94a3b8;
    padding: 4px 6px;
    vertical-align: top;
  }

  .receipt-table th {
    background: #f1f5f9;
    font-size: 10px;
    text-transform: uppercase;
  }

  @media print {
    html,
    body {
      background: white !important;
    }

    aside,
    main > header,
    .receipt-actions,
    .receipt-message {
      display: none !important;
    }

    main,
    .page-shell {
      display: block !important;
    }

    main > div {
      max-width: none !important;
      padding: 0 !important;
      margin: 0 !important;
    }

    .receipt {
      width: 100% !important;
      margin: 0 !important;
      color: #020617 !important;
      font-size: 11px !important;
      line-height: 1.25 !important;
    }

    .receipt-section,
    .receipt-table tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
  }
`;