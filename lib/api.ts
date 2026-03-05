const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

if (!BASE_URL) {
  console.warn(
    '[api] Missing EXPO_PUBLIC_BACKEND_URL in .env. API calls will fail.',
  );
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const { token, headers, ...rest } = options;

  const authHeader =
    token != null ? { Authorization: `Bearer ${token}` } : undefined;

  const res = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
      ...authHeader,
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data as T;
}

