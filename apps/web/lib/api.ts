export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof body.error === "string" ? body.error : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/workspace";
  }
  return value;
}
