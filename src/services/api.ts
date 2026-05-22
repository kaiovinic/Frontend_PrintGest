const API_URL = import.meta.env.VITE_API_URL ?? "https://localhost:7131/api";
const USER_STORAGE_KEY = "printgest:user";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

function getAuthToken(): string | null {
  try {
    const raw = sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw) as { accessToken?: string };
    return user.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getAuthToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    throw new ApiError("Sessão expirada. Faça login novamente.", 401);
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { mensagem?: string; message?: string; title?: string };
    return data.mensagem ?? data.message ?? data.title ?? "Erro ao chamar a API.";
  } catch {
    return "Erro ao chamar a API.";
  }
}
