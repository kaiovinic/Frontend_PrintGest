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

export function formatTipoPedido(value: string | number) {
  if (typeof value === "number") {
    return value === 0 ? "Orçamento" : "Pedido";
  }

  return normalize(value) === "orcamento" ? "Orçamento" : "Pedido";
}

export function formatStatusPedido(value: string | number) {
  if (typeof value === "number") {
    const statusByNumber: Record<number, string> = {
      0: "Orçado",
      1: "Aberto",
      2: "Finalizado",
      3: "Cancelado"
    };

    return statusByNumber[value] ?? String(value);
  }

  const normalized = normalize(value);
  if (normalized === "orcado") return "Orçado";
  if (normalized === "aberto") return "Aberto";
  if (normalized === "finalizado") return "Finalizado";
  if (normalized === "cancelado") return "Cancelado";
  return value;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
