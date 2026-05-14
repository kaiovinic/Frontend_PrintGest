export const pedidos = [
  {
    id: "#1024",
    cliente: "Ana Souza",
    tipo: "Orçamento",
    status: "Orçado",
    total: "R$ 680,00",
    pago: "R$ 0,00",
    saldo: "R$ 680,00",
    criadoPor: "Maria",
    dataPedido: "12/05/2026",
    entrega: "18/05/2026"
  },
  {
    id: "#1025",
    cliente: "Mercado Sol",
    tipo: "Pedido",
    status: "Aberto",
    total: "R$ 1.280,00",
    pago: "R$ 640,00",
    saldo: "R$ 640,00",
    criadoPor: "Maria",
    dataPedido: "12/05/2026",
    entrega: "20/05/2026"
  },
  {
    id: "#1026",
    cliente: "João Lima",
    tipo: "Pedido",
    status: "Finalizado",
    total: "R$ 210,00",
    pago: "R$ 210,00",
    saldo: "R$ 0,00",
    criadoPor: "Carlos",
    dataPedido: "10/05/2026",
    entrega: "14/05/2026"
  },
  {
    id: "#1027",
    cliente: "JL Eventos",
    tipo: "Pedido",
    status: "Cancelado",
    total: "R$ 430,00",
    pago: "R$ 150,00",
    saldo: "R$ 280,00",
    criadoPor: "Carlos",
    dataPedido: "09/05/2026",
    entrega: "15/05/2026"
  }
];

export const usuarios = [
  { nome: "Maria", email: "maria@print.com", perfil: "Operacional", status: "Ativo", deveTrocarSenha: false },
  { nome: "Carlos", email: "carlos@print.com", perfil: "Gerente", status: "Ativo", deveTrocarSenha: false },
  { nome: "João", email: "joao@print.com", perfil: "Operacional", status: "Bloqueado", deveTrocarSenha: true }
];

export const produtos = [
  { produto: "Camisa branca", tamanho: "M", qtd: 42, minimo: 10, unidade: "Unidade", status: "OK" },
  { produto: "Caneca branca", tamanho: "-", qtd: 8, minimo: 20, unidade: "Unidade", status: "Baixo" },
  { produto: "Papel transfer", tamanho: "A4", qtd: 15, minimo: 10, unidade: "Pacote", status: "OK" },
  { produto: "Tinta preta", tamanho: "-", qtd: 3, minimo: 5, unidade: "Litro", status: "Baixo" }
];

export const movimentacoes = [
  { data: "12/05", tipo: "Entrada", produto: "Camisa branca M", qtd: "+50", resp: "Carlos" },
  { data: "12/05", tipo: "Saída", produto: "Camisa branca M", qtd: "-20", resp: "Maria" },
  { data: "12/05", tipo: "Reserva", produto: "Caneca branca", qtd: "-10", resp: "#1026" }
];

export const despesas = [
  { tipo: "Água", valor: "R$ 120,00", status: "Aberto" },
  { tipo: "Luz", valor: "R$ 480,00", status: "Aberto" },
  { tipo: "Funcionários", valor: "R$ 4.800,00", status: "Pago" },
  { tipo: "13º", valor: "R$ 1.200,00", status: "Aberto" },
  { tipo: "Contador", valor: "R$ 350,00", status: "Pago" }
];

export const logs = [
  { data: "14/05/2026 15:20", usuario: "Maria", acao: "CRIAR_ORCAMENTO", entidade: "Pedido #1024" },
  { data: "14/05/2026 15:42", usuario: "Carlos", acao: "REGISTRAR_ENTRADA", entidade: "Pedido #1025" },
  { data: "14/05/2026 16:10", usuario: "Carlos", acao: "FINALIZAR_PEDIDO", entidade: "Pedido #1026" }
];
