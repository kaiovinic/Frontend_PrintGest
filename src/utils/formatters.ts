export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

export function parseCurrency(value: string) {
  const digits = value.replace(/\D/g, "");
  return Number(digits || 0) / 100;
}

export function maskCurrency(value: string) {
  return formatCurrency(parseCurrency(value));
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, ddd, first, second) =>
      [ddd && `(${ddd}`, ddd.length === 2 && ") ", first, second && `-${second}`].filter(Boolean).join("")
    );
  }

  return digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
}

export function maskCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
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
