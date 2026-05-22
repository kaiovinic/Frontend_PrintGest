import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Ban, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
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
  estornarPedido,
  finalizarPedido,
  obterPedido,
  type PedidoDetalhe,
  type PedidoPayload,
  type PedidoResumo
} from "@/services/pedidoService";
import { ApiError } from "@/services/api";
import { formatCurrency, formatStatusPedido, formatTipoPedido, maskCpfCnpj, maskCurrency, maskPhone, parseCurrency } from "@/utils/formatters";

const itemSchema = z.object({
  quantidade: z.string(),
  tamanho: z.string(),
  descricao: z.string(),
  precoUnitario: z.string()
});

const pedidoSchema = z.object({
  cliente: z.string().min(1, "Informe o nome do cliente"),
  empresa: z.string(),
  cpfCnpj: z.string(),
  telefone: z.string(),
  endereco: z.string(),
  cidade: z.string(),
  tipo: z.enum(["Pedido", "Orçamento"]),
  dataPedido: z.string().min(1, "Informe a data do pedido"),
  dataEntrega: z.string(),
  formaPagamento: z.string(),
  condicaoPagamento: z.enum(["Pago", "Pagar na Entrega", "Parcelado"]),
  percentualEntrada: z.string(),
  frente: z.string(),
  fundo: z.string(),
  observacao: z.string(),
  outrosItens: z.string(),
  items: z.array(itemSchema)
});

type PedidoFormData = z.infer<typeof pedidoSchema>;
type CondicaoPagamento = "Pago" | "Pagar na Entrega" | "Parcelado";

export function PedidoFormPage({ pedido, usuarioId }: { pedido?: PedidoResumo | null; usuarioId: number }) {
  const queryClient = useQueryClient();

  // Server-sourced state
  const [clienteId, setClienteId] = useState(0);
  const [tipoOriginal, setTipoOriginal] = useState(pedido ? formatTipoPedido(pedido.tipo) : "Pedido");
  const [statusAtual, setStatusAtual] = useState(pedido ? formatStatusPedido(pedido.status) : "");
  const [saldoDevedor, setSaldoDevedor] = useState(pedido?.saldoDevedor ?? 0);
  const [valorPagoRegistrado, setValorPagoRegistrado] = useState(pedido?.valorPago ?? 0);
  const [valorEstornado, setValorEstornado] = useState(0);
  const [observacaoEstornoRegistrada, setObservacaoEstornoRegistrada] = useState("");
  const [pagamentos, setPagamentos] = useState<PedidoDetalhe["pagamentos"]>([]);

  // UI state
  const [statusMensagem, setStatusMensagem] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [valorDevolvido, setValorDevolvido] = useState(formatCurrency(0));
  const [formaDevolucao, setFormaDevolucao] = useState("PIX");
  const [observacaoEstorno, setObservacaoEstorno] = useState("");
  const [isCanceling, setIsCanceling] = useState(false);
  const [estornoModalOpen, setEstornoModalOpen] = useState(false);
  const [novoValorDevolvido, setNovoValorDevolvido] = useState(formatCurrency(0));
  const [novaFormaDevolucao, setNovaFormaDevolucao] = useState("PIX");
  const [novaObservacaoEstorno, setNovaObservacaoEstorno] = useState("");
  const [isEstornando, setIsEstornando] = useState(false);
  const [finalizarModalOpen, setFinalizarModalOpen] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [formaPagamentoFinalizacao, setFormaPagamentoFinalizacao] = useState("PIX");

  // Form
  const { watch, setValue, reset, control, handleSubmit, formState: { errors } } = useForm<PedidoFormData>({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      cliente: pedido?.cliente ?? "",
      empresa: "",
      cpfCnpj: "",
      telefone: "",
      endereco: "",
      cidade: "Alagoinhas",
      tipo: (pedido ? formatTipoPedido(pedido.tipo) : "Pedido") as "Pedido" | "Orçamento",
      dataPedido: pedido?.dataPedido ?? new Date().toISOString().slice(0, 10),
      dataEntrega: pedido?.dataEntrega ?? "",
      formaPagamento: "PIX",
      condicaoPagamento: "Parcelado",
      percentualEntrada: "50",
      frente: "",
      fundo: "",
      observacao: "",
      outrosItens: "",
      items: [{
        quantidade: pedido ? "1" : "",
        tamanho: "",
        descricao: pedido ? `Pedido ${pedido.numero} - ${pedido.cliente}` : "",
        precoUnitario: pedido ? formatCurrency(pedido.total) : formatCurrency(0)
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const tipo = watch("tipo");
  const condicaoPagamento = watch("condicaoPagamento") as CondicaoPagamento;
  const percentualEntrada = watch("percentualEntrada");
  const dataPedido = watch("dataPedido");
  const dataEntrega = watch("dataEntrega");
  const watchedItems = watch("items");

  const totalGeral = useMemo(() => watchedItems.reduce((sum, item) => sum + totalItem(item), 0), [watchedItems]);
  const parcelas = buildParcelas(condicaoPagamento, totalGeral, dataPedido, dataEntrega, Number(percentualEntrada || 0));
  const tipoBloqueado = Boolean(pedido) && tipoOriginal === "Pedido";
  const cancelReasonValido = cancelReason.trim().length >= 10;
  const valorDevolvidoNumero = parseCurrency(valorDevolvido);
  const devolucaoValida =
    valorDevolvidoNumero >= 0 &&
    valorDevolvidoNumero <= valorPagoRegistrado &&
    (valorDevolvidoNumero === 0 || Boolean(formaDevolucao)) &&
    (valorDevolvidoNumero === 0 || valorDevolvidoNumero === valorPagoRegistrado || observacaoEstorno.trim().length >= 10);
  const podeFinalizar = Boolean(pedido) && tipoOriginal === "Pedido" && statusAtual === "Aberto";
  const registroEncerrado = statusAtual === "Cancelado" || statusAtual === "Finalizado";
  const valorRetidoAtual = Math.max(valorPagoRegistrado - valorEstornado, 0);
  const novoValorDevolvidoNumero = parseCurrency(novoValorDevolvido);
  const novoEstornoValido =
    novoValorDevolvidoNumero > 0 &&
    novoValorDevolvidoNumero <= valorRetidoAtual &&
    Boolean(novaFormaDevolucao) &&
    novaObservacaoEstorno.trim().length >= 10;

  const pedidoDetalheQuery = useQuery({
    queryKey: ["pedidos", "detalhe", pedido?.id],
    queryFn: () => obterPedido(pedido!.id),
    enabled: Boolean(pedido?.id)
  });

  const criarPedidoMutation = useMutation({ mutationFn: criarPedido });
  const criarOrcamentoMutation = useMutation({ mutationFn: criarOrcamento });
  const atualizarPedidoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PedidoPayload }) => atualizarPedido(id, payload)
  });
  const atualizarOrcamentoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: PedidoPayload }) => atualizarOrcamento(id, payload)
  });
  const cancelarPedidoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof cancelarPedido>[1] }) => cancelarPedido(id, payload)
  });
  const estornarPedidoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof estornarPedido>[1] }) => estornarPedido(id, payload)
  });
  const finalizarPedidoMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof finalizarPedido>[1] }) => finalizarPedido(id, payload)
  });

  useEffect(() => {
    if (pedidoDetalheQuery.data) {
      preencherComDetalhe(pedidoDetalheQuery.data);
    }
  }, [pedidoDetalheQuery.data]);

  useEffect(() => {
    if (pedidoDetalheQuery.error) {
      setStatusMensagem("Nao foi possivel carregar os detalhes do pedido.");
    }
  }, [pedidoDetalheQuery.error]);

  async function salvar(data: PedidoFormData) {
    setStatusMensagem(null);
    setIsSaving(true);

    const payload: PedidoPayload = {
      numero: pedido?.numero ?? String(Date.now()).slice(-6).padStart(6, "0"),
      clienteId,
      clienteNome: data.cliente,
      empresa: data.empresa || null,
      cpfCnpj: data.cpfCnpj || null,
      telefone: data.telefone || null,
      endereco: data.endereco || null,
      cidade: data.cidade || null,
      usuarioId,
      dataPedido: data.dataPedido,
      dataEntrega: data.dataEntrega || null,
      vendedor: null,
      formaPagamento: data.formaPagamento,
      condicaoPagamento: data.condicaoPagamento,
      frente: data.frente || null,
      fundo: data.fundo || null,
      observacao: data.observacao || null,
      outrosItens: data.outrosItens || null,
      total: totalGeral,
      valorPago: pedido ? valorPagoRegistrado : parcelas[0]?.valor ?? 0,
      itens: data.items
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
        if (tipoOriginal === "Pedido" && data.tipo === "Orçamento") {
          setStatusMensagem("Não é permitido transformar um pedido em orçamento. Se o cliente desistiu, use a opção Cancelar.");
          return;
        }

        if (data.tipo === "Pedido") {
          await atualizarPedidoMutation.mutateAsync({ id: pedido.id, payload });
        } else {
          await atualizarOrcamentoMutation.mutateAsync({ id: pedido.id, payload });
        }
        await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
        setStatusMensagem("Registro atualizado com sucesso.");
      } else if (data.tipo === "Pedido") {
        await criarPedidoMutation.mutateAsync(payload);
        await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
        setStatusMensagem("Pedido criado com sucesso.");
        limparFormulario();
      } else {
        await criarOrcamentoMutation.mutateAsync(payload);
        await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
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
      await cancelarPedidoMutation.mutateAsync({
        id: pedido.id,
        payload: {
        usuarioId,
        observacao: cancelReason,
        valorDevolvido: valorDevolvidoNumero,
        formaDevolucao: valorDevolvidoNumero > 0 ? formaDevolucao : null,
        observacaoEstorno: observacaoEstorno.trim() || null
        }
      });
      setStatusAtual("Cancelado");
      setValorEstornado(valorDevolvidoNumero);
      setObservacaoEstornoRegistrada(observacaoEstorno);
      setCancelModalOpen(false);
      setCancelReason("");
      setValorDevolvido(formatCurrency(0));
      setObservacaoEstorno("");
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      setStatusMensagem(`${tipoOriginal} cancelado com sucesso.`);
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Não foi possível cancelar este registro.");
    } finally {
      setIsCanceling(false);
    }
  }

  async function confirmarNovoEstorno() {
    if (!pedido) {
      return;
    }

    setStatusMensagem(null);
    if (!novoEstornoValido) {
      setStatusMensagem("Informe valor, forma e observacao da devolucao complementar.");
      return;
    }

    setIsEstornando(true);

    try {
      await estornarPedidoMutation.mutateAsync({
        id: pedido.id,
        payload: {
        usuarioId,
        valorDevolvido: novoValorDevolvidoNumero,
        formaDevolucao: novaFormaDevolucao,
        observacao: novaObservacaoEstorno.trim()
        }
      });
      setValorEstornado((current) => current + novoValorDevolvidoNumero);
      setObservacaoEstornoRegistrada((current) =>
        current ? `${current}\n${novaObservacaoEstorno.trim()}` : novaObservacaoEstorno.trim()
      );
      setEstornoModalOpen(false);
      setNovoValorDevolvido(formatCurrency(0));
      setNovaFormaDevolucao("PIX");
      setNovaObservacaoEstorno("");
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      setStatusMensagem("Devolucao complementar registrada com sucesso.");
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Nao foi possivel registrar a devolucao complementar.");
    } finally {
      setIsEstornando(false);
    }
  }

  async function confirmarFinalizacao() {
    if (!pedido) {
      return;
    }

    setStatusMensagem(null);
    setIsFinalizing(true);

    try {
      await finalizarPedidoMutation.mutateAsync({
        id: pedido.id,
        payload: {
        usuarioId,
        observacao:
          saldoDevedor > 0
            ? `Pagamento do saldo devedor de ${formatCurrency(saldoDevedor)} registrado na finalização.`
            : "Produto entregue e pagamento confirmado.",
        receberSaldo: saldoDevedor > 0,
        formaPagamento: saldoDevedor > 0 ? formaPagamentoFinalizacao : null
        }
      });
      setStatusAtual("Finalizado");
      setValorPagoRegistrado((current) => current + saldoDevedor);
      setSaldoDevedor(0);
      setFinalizarModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      setStatusMensagem("Pedido finalizado com sucesso.");
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Não foi possível finalizar este pedido.");
    } finally {
      setIsFinalizing(false);
    }
  }

  function limparFormulario() {
    reset({
      cliente: "",
      empresa: "",
      cpfCnpj: "",
      telefone: "",
      endereco: "",
      cidade: "Alagoinhas",
      tipo: "Pedido",
      dataPedido: new Date().toISOString().slice(0, 10),
      dataEntrega: "",
      formaPagamento: "PIX",
      condicaoPagamento: "Parcelado",
      percentualEntrada: "50",
      frente: "",
      fundo: "",
      observacao: "",
      outrosItens: "",
      items: [{ quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) }]
    });
    setClienteId(0);
    setTipoOriginal("Pedido");
    setStatusAtual("");
    setSaldoDevedor(0);
    setValorPagoRegistrado(0);
    setValorEstornado(0);
    setObservacaoEstornoRegistrada("");
    setPagamentos([]);
    setFormaPagamentoFinalizacao("PIX");
  }

  function preencherComDetalhe(detalhe: PedidoDetalhe) {
    setClienteId(detalhe.clienteId);
    setTipoOriginal(formatTipoPedido(detalhe.tipo));
    setStatusAtual(formatStatusPedido(detalhe.status));
    setSaldoDevedor(detalhe.saldoDevedor);
    setValorPagoRegistrado(detalhe.valorPago);
    setValorEstornado(detalhe.valorEstornado ?? 0);
    setObservacaoEstornoRegistrada(detalhe.observacaoEstorno ?? "");
    setPagamentos(detalhe.pagamentos ?? []);
    setFormaPagamentoFinalizacao(toUiFormaPagamento(detalhe.formaPagamento));
    reset({
      cliente: detalhe.cliente,
      empresa: detalhe.empresa ?? "",
      cpfCnpj: maskCpfCnpj(detalhe.cpfCnpj ?? ""),
      telefone: maskPhone(detalhe.telefone ?? ""),
      endereco: detalhe.endereco ?? "",
      cidade: detalhe.cidade ?? "Alagoinhas",
      tipo: formatTipoPedido(detalhe.tipo) as "Pedido" | "Orçamento",
      dataPedido: detalhe.dataPedido,
      dataEntrega: detalhe.dataEntrega ?? "",
      formaPagamento: toUiFormaPagamento(detalhe.formaPagamento),
      condicaoPagamento: toUiCondicaoPagamento(detalhe.condicaoPagamento),
      percentualEntrada: detalhe.total > 0 ? String(Math.round((detalhe.valorPago / detalhe.total) * 100)) : "50",
      frente: detalhe.frente ?? "",
      fundo: detalhe.fundo ?? "",
      observacao: detalhe.observacao ?? "",
      outrosItens: detalhe.outrosItens ?? "",
      items: detalhe.itens?.length
        ? detalhe.itens.map((item) => ({
            quantidade: String(item.quantidade),
            tamanho: item.tamanho ?? "",
            descricao: item.descricao,
            precoUnitario: formatCurrency(item.valorUnitario)
          }))
        : [{ quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) }]
    });
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
        {pedido && statusAtual === "Cancelado" && valorRetidoAtual > 0 && (
          <Button variant="outline" onClick={() => setEstornoModalOpen(true)}>
            Registrar nova devolucao
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div>
            <Field label="Cliente" value={watch("cliente")} onChange={(v) => setValue("cliente", v)} />
            {errors.cliente && <p className="mt-1 text-xs font-semibold text-red-600">{errors.cliente.message}</p>}
          </div>
          <Field label="Empresa" value={watch("empresa")} onChange={(v) => setValue("empresa", v)} />
          <Field label="CPF/CNPJ" value={watch("cpfCnpj")} onChange={(v) => setValue("cpfCnpj", maskCpfCnpj(v))} />
          <Field label="Telefone" value={watch("telefone")} onChange={(v) => setValue("telefone", maskPhone(v))} />
          <Field className="md:col-span-2" label="Endereço" value={watch("endereco")} onChange={(v) => setValue("endereco", v)} />
          <Field label="Cidade" value={watch("cidade")} onChange={(v) => setValue("cidade", v)} />
          <label>
            <span className="field-label">Tipo</span>
            <Select value={tipo} onChange={(v) => setValue("tipo", v as "Pedido" | "Orçamento")} disabled={tipoBloqueado}>
              <option value="Pedido">Pedido</option>
              {!tipoBloqueado && <option value="Orçamento">Orçamento</option>}
            </Select>
          </label>
          <Field label="Data do pedido" value={watch("dataPedido")} onChange={(v) => setValue("dataPedido", v)} type="date" />
          <Field label="Data de entrega" value={watch("dataEntrega")} onChange={(v) => setValue("dataEntrega", v)} type="date" />
          <p className="md:col-span-4 rounded-md border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800 dark:border-cyan-900 dark:bg-cyan-950/40 dark:text-cyan-200">
            Se salvar como Orçamento, ele aparece na tabela com status Orçado. Ao editar e trocar para Pedido, o orçamento vira pedido. Pedido já aberto não volta para orçamento.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens do pedido</CardTitle>
          <Button size="sm" onClick={() => append({ quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) })}>
            <Plus size={16} />
            Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="grid gap-3 md:grid-cols-[90px_110px_1fr_160px_160px_48px]">
              <Field label="Quant." value={watchedItems[index]?.quantidade ?? ""} onChange={(v) => setValue(`items.${index}.quantidade`, v.replace(/\D/g, ""))} />
              <Field label="Tam." value={watchedItems[index]?.tamanho ?? ""} onChange={(v) => setValue(`items.${index}.tamanho`, v)} />
              <Field label="Descrição" value={watchedItems[index]?.descricao ?? ""} onChange={(v) => setValue(`items.${index}.descricao`, v)} />
              <Field label="Preço unitário" value={watchedItems[index]?.precoUnitario ?? ""} onChange={(v) => setValue(`items.${index}.precoUnitario`, maskCurrency(v))} />
              <Field label="Total" value={formatCurrency(totalItem(watchedItems[index] ?? { quantidade: "", tamanho: "", descricao: "", precoUnitario: formatCurrency(0) }))} onChange={() => undefined} readOnly />
              <Button className="mt-6" size="icon" variant="outline" onClick={() => { if (fields.length > 1) remove(index); }} aria-label="Remover item">
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
            <TextField label="Frente" value={watch("frente")} onChange={(v) => setValue("frente", v)} />
            <TextField label="Fundo" value={watch("fundo")} onChange={(v) => setValue("fundo", v)} />
            <div className="grid gap-4 md:grid-cols-2">
              <TextField label="Observação" value={watch("observacao")} onChange={(v) => setValue("observacao", v)} />
              <TextField label="Outros itens" value={watch("outrosItens")} onChange={(v) => setValue("outrosItens", v)} />
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
                <Select value={watch("formaPagamento")} onChange={(v) => setValue("formaPagamento", v)}>
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="CARTAO_CREDITO">Cartão de crédito</option>
                  <option value="CARTAO_DEBITO">Cartão de débito</option>
                </Select>
              </label>
              <label>
                <span className="field-label">Condição</span>
                <Select value={condicaoPagamento} onChange={(v) => setValue("condicaoPagamento", v as CondicaoPagamento)}>
                  <option value="Pago">Pago</option>
                  <option value="Pagar na Entrega">Pagar na entrega</option>
                  <option value="Parcelado">Parcelado</option>
                </Select>
              </label>
              <Field label="Total geral" value={formatCurrency(totalGeral)} onChange={() => undefined} readOnly />
              {pedido && <Field label="Pago registrado" value={formatCurrency(valorPagoRegistrado)} onChange={() => undefined} readOnly />}
              {pedido && <Field label="Saldo devedor" value={formatCurrency(saldoDevedor)} onChange={() => undefined} readOnly />}
              {pedido && valorEstornado > 0 && <Field label="Valor devolvido" value={formatCurrency(valorEstornado)} onChange={() => undefined} readOnly />}
              {pedido && valorEstornado > 0 && <Field label="Valor retido" value={formatCurrency(valorRetidoAtual)} onChange={() => undefined} readOnly />}
            </div>

            {pedido && observacaoEstornoRegistrada && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Observação da devolução: {observacaoEstornoRegistrada}
              </p>
            )}

            {pedido && pagamentos.length > 0 && (
              <div className="rounded-lg border p-4">
                <p className="mb-3 text-sm font-black">Pagamentos registrados</p>
                <div className="space-y-2">
                  {pagamentos.map((pagamento) => (
                    <div key={pagamento.id} className="grid gap-2 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-[1fr_1fr_1fr]">
                      <span className="font-semibold">{formatCurrency(pagamento.valor)}</span>
                      <span>{formatFormaPagamento(pagamento.formaPagamento)}</span>
                      <span>{formatDateTime(pagamento.registradoEm)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border p-4">
              <p className="mb-3 text-sm font-black">Parcelas</p>
              <div className="grid gap-3 md:grid-cols-[80px_1fr_1fr_1fr]">
                {parcelas.map((parcela) => (
                  <div className="contents" key={parcela.numero}>
                    <Field label="#" value={String(parcela.numero)} onChange={() => undefined} readOnly />
                    <Field
                      label="Perc. (%)"
                      value={String(parcela.percentual)}
                      onChange={(v) => setValue("percentualEntrada", v.replace(/\D/g, "").slice(0, 3))}
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

            <Button className="w-full" variant="secondary" onClick={handleSubmit(salvar)} disabled={isSaving || registroEncerrado}>
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

            {valorPagoRegistrado > 0 && (
              <div className="mt-5 space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-semibold">
                  Este pedido possui {formatCurrency(valorPagoRegistrado)} pago. Informe se haverá devolução ao cliente. O valor devolvido será lançado como saída no caixa.
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Valor devolvido" value={valorDevolvido} onChange={(value) => setValorDevolvido(maskCurrency(value))} />
                  <label>
                    <span className="field-label">Forma da devolução</span>
                    <Select value={formaDevolucao} onChange={setFormaDevolucao}>
                      <option value="PIX">PIX</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="CARTAO_CREDITO">Cartão de crédito</option>
                      <option value="CARTAO_DEBITO">Cartão de débito</option>
                    </Select>
                  </label>
                </div>
                <TextField label="Observação da devolução" value={observacaoEstorno} onChange={setObservacaoEstorno} />
                <p className="text-xs font-semibold">
                  Valor retido pela empresa: {formatCurrency(Math.max(valorPagoRegistrado - valorDevolvidoNumero, 0))}.
                  {valorDevolvidoNumero > 0 && valorDevolvidoNumero < valorPagoRegistrado ? " Para devolução parcial, a observação deve ter pelo menos 10 caracteres." : ""}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelModalOpen(false)} disabled={isCanceling}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={confirmarCancelamento} disabled={isCanceling || !cancelReasonValido || !devolucaoValida}>
                <Ban size={16} />
                {isCanceling ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {estornoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h2 className="text-xl font-black">Registrar nova devolucao</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use esta acao para devolver depois uma parte do valor que ficou retido no cancelamento.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-semibold">Valor ainda retido: {formatCurrency(valorRetidoAtual)}.</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Valor devolvido" value={novoValorDevolvido} onChange={(value) => setNovoValorDevolvido(maskCurrency(value))} />
                <label>
                  <span className="field-label">Forma da devolucao</span>
                  <Select value={novaFormaDevolucao} onChange={setNovaFormaDevolucao}>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="CARTAO_CREDITO">Cartao de credito</option>
                    <option value="CARTAO_DEBITO">Cartao de debito</option>
                  </Select>
                </label>
              </div>
              <TextField label="Observacao da nova devolucao" value={novaObservacaoEstorno} onChange={setNovaObservacaoEstorno} />
              <p className="text-xs font-semibold">
                Depois desta devolucao, ainda ficara retido: {formatCurrency(Math.max(valorRetidoAtual - novoValorDevolvidoNumero, 0))}.
                A observacao deve ter pelo menos 10 caracteres.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button variant="outline" onClick={() => setEstornoModalOpen(false)} disabled={isEstornando}>
                Voltar
              </Button>
              <Button onClick={confirmarNovoEstorno} disabled={isEstornando || !novoEstornoValido}>
                <CheckCircle2 size={16} />
                {isEstornando ? "Registrando..." : "Registrar devolucao"}
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

function totalItem(item: { quantidade: string; tamanho: string; descricao: string; precoUnitario: string }) {
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

function formatFormaPagamento(value: string) {
  const labels: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
    CARTAO_CREDITO: "Cartão de crédito",
    CARTAO_DEBITO: "Cartão de débito"
  };
  return labels[value] ?? value;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
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
