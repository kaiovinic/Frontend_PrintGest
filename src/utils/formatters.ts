export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function formatTipoPedido(value: string) {
  return value.toLowerCase() === "orcamento" ? "Orçamento" : "Pedido";
}

export function formatStatusPedido(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "orcado") return "Orçado";
  if (normalized === "aberto") return "Aberto";
  if (normalized === "finalizado") return "Finalizado";
  if (normalized === "cancelado") return "Cancelado";
  return value;
}
