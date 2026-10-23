
import type { ApiErrorResponse } from "../types/task";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "/api"
).replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error = payload as ApiErrorResponse | null;

    throw new ApiError(
      error?.message ?? `Request failed (${response.status}).`,
      response.status,
      error?.errors ?? {},
    );
  }

  return payload as T;
}
