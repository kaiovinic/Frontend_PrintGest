import { AlertTriangle, Ban, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  atualizarOrcamento,
  atualizarPedido,
  cancelarPedido,
  criarOrcamento,
  criarPedido,
  finalizarPedido,
  obterPedido,
  type PedidoDetalhe,
  type PedidoPayload,
  type PedidoResumo
} from "@/services/pedidoService";
import { ApiError } from "@/services/api";
import { formatCurrency, formatStatusPedido, formatTipoPedido, maskCpfCnpj, maskCurrency, maskPhone, parseCurrency } from "@/utils/formatters";

type ItemPedido = {
  id: number;
  quantidade: string;
  tamanho: string;
  descricao: string;
  precoUnitario: string;
};

type CondicaoPagamento = "Pago" | "Pagar na Entrega" | "Parcelado";

export function PedidoFormPage({ pedido, usuarioId }: { pedido?: PedidoResumo | null; usuarioId: number }) {
  const [clienteId, setClienteId] = useState(0);
  const [cliente, setCliente] = useState(pedido?.cliente ?? "");
  const [empresa, setEmpresa] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [cidade, setCidade] = useState("Alagoinhas");
  const [tipo, setTipo] = useState(pedido ? formatTipoPedido(pedido.tipo) : "Pedido");
  const [tipoOriginal, setTipoOriginal] = useState(pedido ? formatTipoPedido(pedido.tipo) : "Pedido");
  const [statusAtual, setStatusAtual] = useState(pedido ? formatStatusPedido(pedido.status) : "");
  const [dataPedido, setDataPedido] = useState(pedido?.dataPedido ?? new Date().toISOString().slice(0, 10));
  const [dataEntrega, setDataEntrega] = useState(pedido?.dataEntrega ?? "");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [condicaoPagamento, setCondicaoPagamento] = useState<CondicaoPagamento>("Parcelado");
  const [percentualEntrada, setPercentualEntrada] = useState("50");
  const [observacao, setObservacao] = useState("");
  const [frente, setFrente] = useState("");
  const [fundo, setFundo] = useState("");
  const [outrosItens, setOutrosItens] = useState("");
  const [statusMensagem, setStatusMensagem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [saldoDevedor, setSaldoDevedor] = useState(pedido?.saldoDevedor ?? 0);
  const [formaPagamentoFinalizacao, setFormaPagamentoFinalizacao] = useState("PIX");
  const [items, setItems] = useState<ItemPedido[]>([
    {
      id: 1,
      quantidade: pedido ? "1" : "",
      tamanho: "",
      descricao: pedido ? `Pedido ${pedido.numero} - ${pedido.cliente}` : "",
      precoUnitario: pedido ? formatCurrency(pedido.total) : formatCurrency(0)
    }
  ]);

  const totalGeral = useMemo(() => items.reduce((sum, item) => sum + totalItem(item), 0), [items]);
  const parcelas = buildParcelas(condicaoPagamento, totalGeral, dataPedido, dataEntrega, Number(percentualEntrada || 0));
  const tipoBloqueado = Boolean(pedido) && tipoOriginal === "Pedido";
  const cancelReasonValido = cancelReason.trim().length >= 10;
  const podeFinalizar = Boolean(pedido) && tipoOriginal === "Pedido" && statusAtual === "Aberto";
  const registroEncerrado = statusAtual === "Cancelado" || statusAtual === "Finalizado";

  useEffect(() => {
    if (!pedido?.id) {
      return;
    }

    obterPedido(pedido.id)
      .then(preencherComDetalhe)
      .catch(() => setStatusMensagem("Não foi possível carregar os detalhes do pedido."));
  }, [pedido?.id]);

  function updateItem(id: number, field: keyof ItemPedido, value: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItems((current) => [...current, { id: Date.now(), quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) }]);
  }

  function removeItem(id: number) {
    setItems((current) => (current.length === 1 ? current : current.filter((item) => item.id !== id)));
  }

  async function salvar() {
    setStatusMensagem(null);
    setIsSaving(true);

    const payload: PedidoPayload = {
      numero: pedido?.numero ?? String(Date.now()).slice(-6).padStart(6, "0"),
      clienteId,
      clienteNome: cliente,
      empresa: empresa || null,
      cpfCnpj: cpfCnpj || null,
      telefone: telefone || null,
      endereco: endereco || null,
      cidade: cidade || null,
      usuarioId,
      dataPedido,
      dataEntrega: dataEntrega || null,
      vendedor: null,
      formaPagamento,
      condicaoPagamento,
      frente: frente || null,
      fundo: fundo || null,
      observacao: observacao || null,
      outrosItens: outrosItens || null,
      total: totalGeral,
      valorPago: parcelas[0]?.valor ?? 0,
      itens: items
        .filter((item) => item.descricao.trim() || Number(item.quantidade || 0) > 0 || item.tamanho.trim())
        .map((item) => ({
          descricao: item.descricao.trim(),
          tamanho: item.tamanho.trim() || null,
          quantidade: Number(item.quantidade || 0),
          valorUnitario: parseCurrency(item.precoUnitario),
          valorTotal: totalItem(item)
        }))
    };

    try {
      if (pedido) {
        if (tipoOriginal === "Pedido" && tipo === "OrÃ§amento") {
          setStatusMensagem("NÃ£o Ã© permitido transformar um pedido em orÃ§amento. Se o cliente desistiu, use a opÃ§Ã£o Cancelar.");
          return;
        }

        if (tipo === "Pedido") {
          await atualizarPedido(pedido.id, payload);
        } else {
          await atualizarOrcamento(pedido.id, payload);
        }
        setStatusMensagem("Registro atualizado com sucesso.");
      } else if (tipo === "Pedido") {
        await criarPedido(payload);
        setStatusMensagem("Pedido criado com sucesso.");
        limparFormulario();
      } else {
        await criarOrcamento(payload);
        setStatusMensagem("Orçamento criado com sucesso.");
        limparFormulario();
      }
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Não foi possível salvar. Confira os campos e se a API está rodando.");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmarCancelamento() {
    if (!pedido) {
      return;
    }

    setStatusMensagem(null);
    if (!cancelReasonValido) {
      setStatusMensagem("Informe o motivo do cancelamento com pelo menos 10 caracteres.");
      return;
    }

    setIsCanceling(true);

    try {
      await cancelarPedido(pedido.id, usuarioId, cancelReason);
      setStatusAtual("Cancelado");
      setCancelModalOpen(false);
      setCancelReason("");
      setStatusMensagem(`${tipoOriginal} cancelado com sucesso.`);
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Não foi possível cancelar este registro.");
    } finally {
      setIsCanceling(false);
    }
  }

  async function confirmarFinalizacao() {
    if (!pedido) {
      return;
    }

    setStatusMensagem(null);
    setIsFinalizing(true);

    try {
      await finalizarPedido(pedido.id, {
        usuarioId,
        observacao:
          saldoDevedor > 0
            ? `Pagamento do saldo devedor de ${formatCurrency(saldoDevedor)} registrado na finalização.`
            : "Produto entregue e pagamento confirmado.",
        receberSaldo: saldoDevedor > 0,
        formaPagamento: saldoDevedor > 0 ? formaPagamentoFinalizacao : null
      });
      setStatusAtual("Finalizado");
      setSaldoDevedor(0);
      setFinalizarModalOpen(false);
      setStatusMensagem("Pedido finalizado com sucesso.");
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Não foi possível finalizar este pedido.");
    } finally {
      setIsFinalizing(false);
    }
  }

  function limparFormulario() {
    setCliente("");
    setClienteId(0);
    setEmpresa("");
    setCpfCnpj("");
    setTelefone("");
    setEndereco("");
    setCidade("Alagoinhas");
    setTipo("Pedido");
    setTipoOriginal("Pedido");
    setStatusAtual("");
    setSaldoDevedor(0);
    setDataPedido(new Date().toISOString().slice(0, 10));
    setDataEntrega("");
    setFormaPagamento("PIX");
    setFormaPagamentoFinalizacao("PIX");
    setCondicaoPagamento("Parcelado");
    setPercentualEntrada("50");
    setObservacao("");
    setFrente("");
    setFundo("");
    setOutrosItens("");
    setItems([{ id: Date.now(), quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) }]);
  }

  function preencherComDetalhe(detalhe: PedidoDetalhe) {
    setClienteId(detalhe.clienteId);
    setCliente(detalhe.cliente);
    setEmpresa(detalhe.empresa ?? "");
    setCpfCnpj(maskCpfCnpj(detalhe.cpfCnpj ?? ""));
    setTelefone(maskPhone(detalhe.telefone ?? ""));
    setEndereco(detalhe.endereco ?? "");
    setCidade(detalhe.cidade ?? "Alagoinhas");
    setTipo(formatTipoPedido(detalhe.tipo));
    setTipoOriginal(formatTipoPedido(detalhe.tipo));
    setStatusAtual(formatStatusPedido(detalhe.status));
    setSaldoDevedor(detalhe.saldoDevedor);
    setDataPedido(detalhe.dataPedido);
    setDataEntrega(detalhe.dataEntrega ?? "");
    setFormaPagamento(toUiFormaPagamento(detalhe.formaPagamento));
    setFormaPagamentoFinalizacao(toUiFormaPagamento(detalhe.formaPagamento));
    setCondicaoPagamento(toUiCondicaoPagamento(detalhe.condicaoPagamento));
    setObservacao(detalhe.observacao ?? "");
    setFrente(detalhe.frente ?? "");
    setFundo(detalhe.fundo ?? "");
    setOutrosItens(detalhe.outrosItens ?? "");
    setPercentualEntrada(detalhe.total > 0 ? String(Math.round((detalhe.valorPago / detalhe.total) * 100)) : "50");
    setItems(
      detalhe.itens?.length
        ? detalhe.itens.map((item) => ({
            id: item.id,
            quantidade: String(item.quantidade),
            tamanho: item.tamanho ?? "",
            descricao: item.descricao,
            precoUnitario: formatCurrency(item.valorUnitario)
          }))
        : [{ id: Date.now(), quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) }]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black">{pedido ? `Editar pedido ${pedido.numero}` : "Pedido"}</h1>
          <p className="text-sm text-muted-foreground">Campos baseados no talão físico da Print Impressões</p>
        </div>
        {pedido && statusAtual !== "Cancelado" && statusAtual !== "Finalizado" && (
          <div className="flex flex-wrap gap-3">
            {podeFinalizar && (
              <Button onClick={() => setFinalizarModalOpen(true)}>
                <CheckCircle2 size={16} />
                Finalizar pedido
              </Button>
            )}
            <Button variant="destructive" onClick={() => setCancelModalOpen(true)}>
              <Ban size={16} />
              Cancelar {tipoOriginal.toLowerCase()}
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Field label="Cliente" value={cliente} onChange={setCliente} />
          <Field label="Empresa" value={empresa} onChange={setEmpresa} />
          <Field label="CPF/CNPJ" value={cpfCnpj} onChange={(value) => setCpfCnpj(maskCpfCnpj(value))} />
          <Field label="Telefone" value={telefone} onChange={(value) => setTelefone(maskPhone(value))} />
          <Field className="md:col-span-2" label="Endereço" value={endereco} onChange={setEndereco} />
          <Field label="Cidade" value={cidade} onChange={setCidade} />
          <label>
            <span className="field-label">Tipo</span>
            <Select value={tipo} onChange={setTipo} disabled={tipoBloqueado}>
              <option value="Pedido">Pedido</option>
              {!tipoBloqueado && <option value="Orçamento">Orçamento</option>}
            </Select>
          </label>
          <Field label="Data do pedido" value={dataPedido} onChange={setDataPedido} type="date" />
          <Field label="Data de entrega" value={dataEntrega} onChange={setDataEntrega} type="date" />
          <p className="md:col-span-4 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
            Se salvar como Orçamento, ele aparece na tabela com status Orçado. Ao editar e trocar para Pedido, o orçamento vira pedido. Pedido já aberto não volta para orçamento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens do pedido</CardTitle>
          <Button size="sm" onClick={addItem}>
            <Plus size={16} />
            Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-3 md:grid-cols-[90px_110px_1fr_160px_160px_48px]">
              <Field label="Quant." value={item.quantidade} onChange={(value) => updateItem(item.id, "quantidade", value.replace(/\D/g, ""))} />
              <Field label="Tam." value={item.tamanho} onChange={(value) => updateItem(item.id, "tamanho", value)} />
              <Field label="Descrição" value={item.descricao} onChange={(value) => updateItem(item.id, "descricao", value)} />
              <Field label="Preço unitário" value={item.precoUnitario} onChange={(value) => updateItem(item.id, "precoUnitario", maskCurrency(value))} />
              <Field label="Total" value={formatCurrency(totalItem(item))} onChange={() => undefined} readOnly />
              <Button className="mt-6" size="icon" variant="outline" onClick={() => removeItem(item.id)} aria-label="Remover item">
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Arte e observações</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <TextField label="Frente" value={frente} onChange={setFrente} />
            <TextField label="Fundo" value={fundo} onChange={setFundo} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Observação" value={observacao} onChange={setObservacao} />
              <TextField label="Outros itens" value={outrosItens} onChange={setOutrosItens} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label>
                <span className="field-label">Forma de pagamento</span>
                <Select value={formaPagamento} onChange={setFormaPagamento}>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de débito</option>
                </Select>
              </label>
              <label>
                <span className="field-label">Condição</span>
                <Select value={condicaoPagamento} onChange={(value) => setCondicaoPagamento(value as CondicaoPagamento)}>
                  <option value="Pago">Pago</option>
                  <option value="Pagar na Entrega">Pagar na entrega</option>
                  <option value="Parcelado">Parcelado</option>
                </Select>
              </label>
              <Field label="Total geral" value={formatCurrency(totalGeral)} onChange={() => undefined} readOnly />
            </div>

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-black">Parcelas</p>
              <div className="grid gap-3 md:grid-cols-[80px_1fr_1fr_1fr]">
                {parcelas.map((parcela) => (
                  <div className="contents" key={parcela.numero}>
                    <Field label="#" value={String(parcela.numero)} onChange={() => undefined} readOnly />
                    <Field
                      label="Perc. (%)"
                      value={String(parcela.percentual)}
                      onChange={(value) => setPercentualEntrada(value.replace(/\D/g, "").slice(0, 3))}
                      readOnly={condicaoPagamento !== "Parcelado" || parcela.numero === 2}
                    />
                    <Field label="Valor" value={formatCurrency(parcela.valor)} onChange={() => undefined} readOnly />
                    <Field label="Vencimento" type="date" value={parcela.vencimento} onChange={() => undefined} readOnly />
                  </div>
                ))}
              </div>
            </div>

            {statusMensagem && (
              <p className="rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
                {statusMensagem}
              </p>
            )}

            {registroEncerrado && (
              <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                Este registro está {statusAtual.toLowerCase()} e não pode mais ser editado.
              </p>
            )}

            <Button className="w-full" variant="secondary" onClick={salvar} disabled={isSaving || registroEncerrado}>
              <Save size={16} />
              {registroEncerrado ? "Edição bloqueada" : isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black">Cancelar {tipoOriginal.toLowerCase()}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Esta ação muda o status para cancelado e registra o motivo informado. Confirme apenas se o cliente realmente desistiu.
                </p>
              </div>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="field-label">Motivo do cancelamento</span>
              <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={300} placeholder="Ex.: Cliente desistiu do pedido." />
              <span className="text-xs font-semibold text-muted-foreground">
                Mínimo de 10 caracteres. {cancelReason.trim().length}/300
              </span>
            </label>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={isCanceling}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={confirmarCancelamento} disabled={isCanceling || !cancelReasonValido}>
                <Ban size={16} />
                {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {finalizarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black">Finalizar pedido</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Confirme apenas se o produto foi entregue e o pagamento foi concluído. Após finalizar, o pedido deixa de aparecer no dashboard.
                </p>
              </div>
            </div>

            {saldoDevedor > 0 && (
              <div className="mt-5 space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">
                  Este pedido ainda possui saldo devedor de {formatCurrency(saldoDevedor)}. Para finalizar, registre o recebimento do valor faltante.
                </p>
                <label className="block">
                  <span className="field-label">Forma de pagamento do saldo</span>
                  <Select value={formaPagamentoFinalizacao} onChange={setFormaPagamentoFinalizacao}>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="CARTAO_CREDITO">Cartão de crédito</option>
                    <option value="CARTAO_DEBITO">Cartão de débito</option>
                  </Select>
                </label>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setFinalizarModalOpen(false)} disabled={isFinalizing}>
                Voltar
              </Button>
              <Button onClick={confirmarFinalizacao} disabled={isFinalizing}>
                <CheckCircle2 size={16} />
                {isFinalizing ? "Finalizando..." : saldoDevedor > 0 ? "Receber saldo e finalizar" : "Confirmar finalização"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function totalItem(item: ItemPedido) {
  return Number(item.quantidade || 0) * parseCurrency(item.precoUnitario);
}

function buildParcelas(condicao: CondicaoPagamento, total: number, dataPedido: string, dataEntrega: string, percentualEntrada: number) {
  if (condicao === "Parcelado") {
    const entrada = Math.min(Math.max(percentualEntrada, 0), 100);
    const restante = 100 - entrada;
    return [
      { numero: 1, percentual: entrada, valor: total * (entrada / 100), vencimento: dataPedido },
      { numero: 2, percentual: restante, valor: total * (restante / 100), vencimento: dataEntrega || dataPedido }
    ];
  }

  return [{ numero: 1, percentual: 100, valor: total, vencimento: condicao === "Pagar na Entrega" ? dataEntrega || dataPedido : dataPedido }];
}

function toUiFormaPagamento(value: string | null) {
  if (value === "DINHEIRO") return "Dinheiro";
  if (value === "CARTAO_CREDITO") return "CARTAO_CREDITO";
  if (value === "CARTAO_DEBITO") return "CARTAO_DEBITO";
  return "PIX";
}

function toUiCondicaoPagamento(value: string | null): CondicaoPagamento {
  if (value === "A_VISTA" || value === "PAGAMENTO_NO_PEDIDO") return "Pago";
  if (value === "ADIANTAMENTO") return "Parcelado";
  return "Parcelado";
}

function Field({
  label,
  value,
  onChange,
  className,
  type = "text",
  readOnly = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <label className={className}>
      <span className="field-label">{label}</span>
      <Input className="mt-2" type={type} value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="space-y-2">
      <span className="field-label">{label}</span>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={300} />
    </label>
  );
}

function Select({
  value,
  onChange,
  children,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <select
      className={cn(
        "mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-60"
      )}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    >
      {children}
    </select>
  );
}
