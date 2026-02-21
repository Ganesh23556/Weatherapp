export type ApiError = { error: string };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    credentials: "include"
  });

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "error" in data
        ? String((data as any).error)
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

