import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Ban, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useController, useFieldArray, useForm, useWatch, type Control } from "react-hook-form";
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
import { criarMovimentacaoCaixa } from "@/services/caixaService";
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
}).superRefine((data, ctx) => {
  if (data.tipo === "Pedido") {
    if (!data.dataEntrega) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data de entrega é obrigatória para pedidos",
        path: ["dataEntrega"]
      });
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deliveryDate = new Date(data.dataEntrega + "T00:00:00");
      if (deliveryDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "A data de entrega não pode ser anterior à data atual",
          path: ["dataEntrega"]
        });
      }
    }
  }
});

type PedidoFormData = z.infer<typeof pedidoSchema>;
type CondicaoPagamento = "Pago" | "Pagar na Entrega" | "Parcelado";

const ItemRow = memo(function ItemRow({
  index,
  control,
  canRemove,
  onRemove
}: {
  index: number;
  control: Control<PedidoFormData>;
  canRemove: boolean;
  onRemove: (index: number) => void;
}) {
  const { field: qtyField } = useController({ control, name: `items.${index}.quantidade` });
  const { field: tamField } = useController({ control, name: `items.${index}.tamanho` });
  const { field: descField } = useController({ control, name: `items.${index}.descricao` });
  const { field: precoField } = useController({ control, name: `items.${index}.precoUnitario` });

  const itemTotal = Number(qtyField.value || 0) * parseCurrency(precoField.value);

  return (
    <div className="grid gap-3 md:grid-cols-[90px_110px_1fr_160px_160px_48px]">
      <Field label="Quant." value={qtyField.value} onChange={(v) => qtyField.onChange(v.replace(/\D/g, ""))} />
      <Field label="Tam." value={tamField.value} onChange={(v) => tamField.onChange(v)} />
      <Field label="Descrição" value={descField.value} onChange={(v) => descField.onChange(v)} />
      <Field label="Preço unitário" value={precoField.value} onChange={(v) => precoField.onChange(maskCurrency(v))} />
      <Field label="Total" value={formatCurrency(itemTotal)} onChange={() => undefined} readOnly />
      <Button
        className="mt-6"
        size="icon"
        variant="outline"
        onClick={() => { if (canRemove) onRemove(index); }}
        aria-label="Remover item"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
});

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
  const [valorRecebidoPedido, setValorRecebidoPedido] = useState("");
  const [valorRecebidoFinalizacao, setValorRecebidoFinalizacao] = useState("");

  // Quick payment form states (for editing existing orders)
  const [mostrarFormPagamento, setMostrarFormPagamento] = useState(false);
  const [novoPagamentoValor, setNovoPagamentoValor] = useState("");
  const [novoPagamentoForma, setNovoPagamentoForma] = useState("PIX");
  const [novoPagamentoObs, setNovoPagamentoObs] = useState("");
  const [novoPagamentoRecebido, setNovoPagamentoRecebido] = useState("");
  const [isSavingPagamento, setIsSavingPagamento] = useState(false);

  // Split payment state
  const [dividirPagamento, setDividirPagamento] = useState(false);
  const [formaPagamento2, setFormaPagamento2] = useState("Dinheiro");
  const [valorPago1, setValorPago1] = useState("");
  const [valorRecebidoPedido1, setValorRecebidoPedido1] = useState("");
  const [valorRecebidoPedido2, setValorRecebidoPedido2] = useState("");

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

  const removeItem = useCallback((index: number) => remove(index), [remove]);

  const tipo = watch("tipo");
  const condicaoPagamento = watch("condicaoPagamento") as CondicaoPagamento;
  const percentualEntrada = watch("percentualEntrada");
  const dataPedido = watch("dataPedido");
  const dataEntrega = watch("dataEntrega");
  const formaPagamento = watch("formaPagamento");
  const watchedItems = useWatch({ control, name: "items" }) as PedidoFormData["items"];

  const totalGeral = useMemo(() => watchedItems.reduce((sum, item) => sum + totalItem(item), 0), [watchedItems]);
  const parcelas = buildParcelas(condicaoPagamento, totalGeral, dataPedido, dataEntrega, Number(percentualEntrada || 0));

  const valorAPagar = condicaoPagamento === "Pago" 
    ? totalGeral 
    : condicaoPagamento === "Parcelado" 
      ? (parcelas[0]?.valor ?? 0) 
      : 0;

  const podeDividirPagamento = (!pedido || (tipoOriginal === "Orçamento" && tipo === "Pedido")) && condicaoPagamento !== "Pagar na Entrega" && valorAPagar > 0;

  const v1 = dividirPagamento ? (valorPago1 !== "" ? parseCurrency(valorPago1) : (valorAPagar / 2)) : valorAPagar;
  const v2 = dividirPagamento ? Math.max(0, valorAPagar - v1) : 0;

  const valorRecebidoPedidoNum = parseCurrency(valorRecebidoPedido);
  const trocoPedido = Math.max(0, valorRecebidoPedidoNum - valorAPagar);

  const valorRecebidoFinalizacaoNum = parseCurrency(valorRecebidoFinalizacao);
  const trocoFinalizacao = Math.max(0, valorRecebidoFinalizacaoNum - saldoDevedor);

  const valorRecebidoPedido1Num = parseCurrency(valorRecebidoPedido1);
  const trocoPedido1 = Math.max(0, valorRecebidoPedido1Num - v1);

  const valorRecebidoPedido2Num = parseCurrency(valorRecebidoPedido2);
  const trocoPedido2 = Math.max(0, valorRecebidoPedido2Num - v2);

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
      valorPago: !pedido || (tipoOriginal === "Orçamento" && data.tipo === "Pedido")
        ? v1
        : valorPagoRegistrado,
      formaPagamento2: dividirPagamento && v2 > 0 ? formaPagamento2 : null,
      valorPago2: dividirPagamento && v2 > 0 ? v2 : null,
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
      await queryClient.invalidateQueries({ queryKey: ["caixa"] });
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
    setValorRecebidoPedido("");
    setValorRecebidoFinalizacao("");
    setDividirPagamento(false);
    setFormaPagamento2("Dinheiro");
    setValorPago1("");
    setValorRecebidoPedido1("");
    setValorRecebidoPedido2("");
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
    setValorRecebidoPedido("");
    setValorRecebidoFinalizacao("");
    
    // Initialize quick payment form values
    setNovoPagamentoValor(formatCurrency(detalhe.saldoDevedor));
    
    const isSplit = detalhe.formaPagamento?.includes(" e ") ?? false;
    setDividirPagamento(isSplit);
    if (isSplit && detalhe.formaPagamento) {
      const parts = detalhe.formaPagamento.split(" e ");
      setFormaPagamento2(toUiFormaPagamento(parts[1]));
    } else {
      setFormaPagamento2("Dinheiro");
    }
    setValorPago1("");
    setValorRecebidoPedido1("");
    setValorRecebidoPedido2("");

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

  async function executarRegistroPagamento() {
    if (!pedido) return;
    const valor = parseCurrency(novoPagamentoValor);
    if (valor <= 0) {
      setStatusMensagem("Informe um valor maior que zero.");
      return;
    }
    if (valor > saldoDevedor) {
      setStatusMensagem("O valor do pagamento não pode ser maior que o saldo devedor.");
      return;
    }

    setIsSavingPagamento(true);
    setStatusMensagem(null);
    try {
      await criarMovimentacaoCaixa({
        usuarioId,
        pedidoId: pedido.id,
        tipo: "ENTRADA",
        formaPagamento: novoPagamentoForma,
        categoria: "Pedido",
        descricao: `Pagamento do pedido ${pedido.numero} - ${watch("cliente")}`,
        valor: valor,
        observacao: novoPagamentoObs?.trim() || null
      });

      await queryClient.invalidateQueries({ queryKey: ["pedidos"] });
      await queryClient.invalidateQueries({ queryKey: ["caixa"] });
      
      setMostrarFormPagamento(false);
      setNovoPagamentoObs("");
      setNovoPagamentoRecebido("");
      setStatusMensagem("Pagamento registrado com sucesso!");
    } catch (error) {
      setStatusMensagem(error instanceof ApiError ? error.message : "Não foi possível registrar o pagamento.");
    } finally {
      setIsSavingPagamento(false);
    }
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
          <div>
            <Field label="Data de entrega" value={watch("dataEntrega")} onChange={(v) => setValue("dataEntrega", v)} type="date" />
            {errors.dataEntrega && <p className="mt-1 text-xs font-semibold text-red-600">{errors.dataEntrega.message}</p>}
          </div>
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
            <ItemRow
              key={field.id}
              index={index}
              control={control}
              canRemove={fields.length > 1}
              onRemove={removeItem}
            />
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

              {podeDividirPagamento && (
                <div className="col-span-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dividirPagamento}
                      onChange={(e) => {
                        setDividirPagamento(e.target.checked);
                        setValorPago1("");
                      }}
                      className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pagar com duas formas de pagamento</span>
                  </label>

                  {dividirPagamento && (
                    <div className="grid gap-3 md:grid-cols-2 border-t pt-3 mt-2">
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500">Primeira Parte</p>
                        <Field
                          label="Valor 1"
                          value={valorPago1 || formatCurrency(valorAPagar / 2)}
                          onChange={(v) => {
                            const cleanVal = parseCurrency(v);
                            if (cleanVal <= valorAPagar) {
                              setValorPago1(maskCurrency(v));
                              setValorRecebidoPedido1("");
                            }
                          }}
                        />
                        {watch("formaPagamento") === "Dinheiro" && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2 dark:border-slate-800 dark:bg-slate-900/50 mt-2">
                            <span className="text-[10px] font-bold text-muted-foreground block">Calculadora de Troco (Parte 1)</span>
                            <div className="grid grid-cols-2 gap-2">
                              <label>
                                <span className="text-[10px] font-semibold text-muted-foreground">Valor Recebido</span>
                                <Input
                                  className="h-7 text-xs mt-1 px-2"
                                  value={valorRecebidoPedido1}
                                  onChange={(e) => setValorRecebidoPedido1(maskCurrency(e.target.value))}
                                  placeholder="R$ 0,00"
                                />
                              </label>
                              <label>
                                <span className="text-[10px] font-semibold text-muted-foreground">Troco</span>
                                <Input
                                  className="h-7 text-xs mt-1 bg-muted font-bold text-emerald-600 dark:text-emerald-400 px-2"
                                  value={formatCurrency(trocoPedido1)}
                                  readOnly
                                />
                              </label>
                            </div>
                            {valorRecebidoPedido1Num > 0 && valorRecebidoPedido1Num >= v1 && (
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Troco: {formatCurrency(trocoPedido1)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-500">Segunda Parte</p>
                        <label>
                          <span className="field-label">Segunda forma de pagamento</span>
                          <Select value={formaPagamento2} onChange={(v) => {
                            setFormaPagamento2(v);
                            setValorRecebidoPedido2("");
                          }}>
                            <option value="PIX">PIX</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="CARTAO_CREDITO">Cartão de crédito</option>
                            <option value="CARTAO_DEBITO">Cartão de débito</option>
                          </Select>
                        </label>
                        <Field
                          label="Valor 2 (Calculado)"
                          value={formatCurrency(v2)}
                          onChange={() => undefined}
                          readOnly
                        />
                        {formaPagamento2 === "Dinheiro" && (
                          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 space-y-2 dark:border-slate-800 dark:bg-slate-900/50 mt-2">
                            <span className="text-[10px] font-bold text-muted-foreground block">Calculadora de Troco (Parte 2)</span>
                            <div className="grid grid-cols-2 gap-2">
                              <label>
                                <span className="text-[10px] font-semibold text-muted-foreground">Valor Recebido</span>
                                <Input
                                  className="h-7 text-xs mt-1 px-2"
                                  value={valorRecebidoPedido2}
                                  onChange={(e) => setValorRecebidoPedido2(maskCurrency(e.target.value))}
                                  placeholder="R$ 0,00"
                                />
                              </label>
                              <label>
                                <span className="text-[10px] font-semibold text-muted-foreground">Troco</span>
                                <Input
                                  className="h-7 text-xs mt-1 bg-muted font-bold text-emerald-600 dark:text-emerald-400 px-2"
                                  value={formatCurrency(trocoPedido2)}
                                  readOnly
                                />
                              </label>
                            </div>
                            {valorRecebidoPedido2Num > 0 && valorRecebidoPedido2Num >= v2 && (
                              <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Troco: {formatCurrency(trocoPedido2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formaPagamento === "Dinheiro" && valorAPagar > 0 && !dividirPagamento && (
                <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
                  <span className="text-xs font-bold text-muted-foreground block">Calculadora de Troco</span>
                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="text-xs font-semibold text-muted-foreground">Valor Recebido</span>
                      <Input
                        className="h-8 text-xs mt-1"
                        value={valorRecebidoPedido}
                        onChange={(e) => setValorRecebidoPedido(maskCurrency(e.target.value))}
                        placeholder="R$ 0,00"
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold text-muted-foreground">Troco</span>
                      <Input
                        className="h-8 text-xs mt-1 bg-muted font-bold text-emerald-600 dark:text-emerald-400"
                        value={formatCurrency(trocoPedido)}
                        readOnly
                      />
                    </label>
                  </div>
                  {valorRecebidoPedidoNum > 0 && valorRecebidoPedidoNum >= valorAPagar && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                      Pedido: {formatCurrency(valorAPagar)} | Pagamento: {formatCurrency(valorRecebidoPedidoNum)} | Troco: {formatCurrency(trocoPedido)}
                    </p>
                  )}
                </div>
              )}
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

            {pedido && (
              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-black">Pagamentos registrados</p>
                  {!registroEncerrado && saldoDevedor > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setMostrarFormPagamento(!mostrarFormPagamento);
                        setNovoPagamentoValor(formatCurrency(saldoDevedor));
                      }}
                    >
                      {mostrarFormPagamento ? "Cancelar" : "Registrar Pagamento"}
                    </Button>
                  )}
                </div>

                {mostrarFormPagamento && !registroEncerrado && saldoDevedor > 0 && (
                  <div className="rounded-md border bg-slate-50/50 p-4 space-y-3 dark:bg-slate-900/50">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Novo Pagamento no Caixa</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label>
                        <span className="field-label font-bold text-xs">Valor</span>
                        <Input
                          className="mt-2 h-9"
                          value={novoPagamentoValor}
                          onChange={(e) => setNovoPagamentoValor(maskCurrency(e.target.value))}
                        />
                      </label>
                      <label>
                        <span className="field-label font-bold text-xs">Forma de pagamento</span>
                        <select
                          className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={novoPagamentoForma}
                          onChange={(e) => setNovoPagamentoForma(e.target.value)}
                        >
                          <option value="DINHEIRO">Dinheiro</option>
                          <option value="PIX">PIX</option>
                          <option value="CARTAO_CREDITO">Cartão Crédito</option>
                          <option value="CARTAO_DEBITO">Cartão Débito</option>
                        </select>
                      </label>
                      <label>
                        <span className="field-label font-bold text-xs">Observação</span>
                        <Input
                          className="mt-2 h-9"
                          value={novoPagamentoObs}
                          onChange={(e) => setNovoPagamentoObs(e.target.value)}
                          placeholder="Opcional"
                        />
                      </label>
                    </div>

                    {novoPagamentoForma === "DINHEIRO" && parseCurrency(novoPagamentoValor) > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm">
                        <label>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Valor Recebido</span>
                          <Input
                            className="h-8 text-xs mt-1"
                            value={novoPagamentoRecebido}
                            onChange={(e) => setNovoPagamentoRecebido(maskCurrency(e.target.value))}
                            placeholder="R$ 0,00"
                          />
                        </label>
                        <label>
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Troco</span>
                          <Input
                            className="h-8 text-xs mt-1 bg-muted font-bold text-emerald-600 dark:text-emerald-400"
                            value={formatCurrency(Math.max(0, parseCurrency(novoPagamentoRecebido) - parseCurrency(novoPagamentoValor)))}
                            readOnly
                          />
                        </label>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSavingPagamento}
                        onClick={executarRegistroPagamento}
                      >
                        {isSavingPagamento ? "Registrando..." : "Confirmar Pagamento"}
                      </Button>
                    </div>
                  </div>
                )}

                {pagamentos.length > 0 ? (
                  <div className="space-y-2">
                    {pagamentos.map((pagamento) => (
                      <div key={pagamento.id} className="grid gap-2 rounded-md bg-muted/40 p-3 text-sm md:grid-cols-[1fr_1fr_1fr]">
                        <span className="font-semibold">{formatCurrency(pagamento.valor)}</span>
                        <span>{formatFormaPagamento(pagamento.formaPagamento)}</span>
                        <span>{formatDateTime(pagamento.registradoEm)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                )}
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
                      value={String(parseFloat(Number(parcela.percentual).toFixed(2)))}
                      onChange={(v) => {
                        const cleanVal = v.replace(/\D/g, "").slice(0, 3);
                        const pNum = Number(cleanVal);
                        if (parcela.numero === 1) {
                          setValue("percentualEntrada", String(pNum));
                        } else {
                          setValue("percentualEntrada", String(Math.max(0, 100 - pNum)));
                        }
                      }}
                      readOnly={condicaoPagamento !== "Parcelado"}
                    />
                    <Field
                      label="Valor"
                      value={formatCurrency(parcela.valor)}
                      onChange={(v) => {
                        const parsedVal = parseCurrency(v);
                        if (parcela.numero === 1) {
                          const p = totalGeral > 0 ? (parsedVal / totalGeral) * 100 : 0;
                          setValue("percentualEntrada", String(p));
                        } else {
                          const p = totalGeral > 0 ? ((totalGeral - parsedVal) / totalGeral) * 100 : 0;
                          setValue("percentualEntrada", String(p));
                        }
                      }}
                      readOnly={condicaoPagamento !== "Parcelado"}
                    />
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

            {tipoOriginal === "Pedido" && valorPagoRegistrado > 0 && (
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

                {formaPagamentoFinalizacao === "Dinheiro" && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-900/50">
                    <span className="text-xs font-bold text-muted-foreground block">Calculadora de Troco</span>
                    <div className="grid grid-cols-2 gap-2">
                      <label>
                        <span className="text-xs font-semibold text-muted-foreground">Valor Recebido</span>
                        <Input
                          className="h-8 text-xs mt-1"
                          value={valorRecebidoFinalizacao}
                          onChange={(e) => setValorRecebidoFinalizacao(maskCurrency(e.target.value))}
                          placeholder="R$ 0,00"
                        />
                      </label>
                      <label>
                        <span className="text-xs font-semibold text-muted-foreground">Troco</span>
                        <Input
                          className="h-8 text-xs mt-1 bg-muted font-bold text-emerald-600 dark:text-emerald-400"
                          value={formatCurrency(trocoFinalizacao)}
                          readOnly
                        />
                      </label>
                    </div>
                    {valorRecebidoFinalizacaoNum > 0 && valorRecebidoFinalizacaoNum >= saldoDevedor && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        Pedido: {formatCurrency(saldoDevedor)} | Pagamento: {formatCurrency(valorRecebidoFinalizacaoNum)} | Troco: {formatCurrency(trocoFinalizacao)}
                      </p>
                    )}
                  </div>
                )}
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
  if (!value) return "";
  const labels: Record<string, string> = {
    DINHEIRO: "Dinheiro",
    PIX: "PIX",
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
