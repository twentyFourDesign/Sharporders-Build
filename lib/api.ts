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

  let data: any = null;
  try {
    // Try to parse JSON if there is a body
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    // If response is not JSON, throw a more helpful error
    throw new Error('Response from server was not valid JSON');
  }

  if (!res.ok) {
    throw new Error(data?.error || 'Request failed');
  }

  return data as T;
}

/** Upload a load image; returns the public URL. Do not set Content-Type so fetch uses multipart boundary. */
export async function uploadLoadImage(
  file: { uri: string; type?: string; name?: string },
  token: string,
): Promise<{ url: string }> {
  const url = `${BASE_URL}/api/upload/load-image`;
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type ?? 'image/jpeg',
    name: file.name ?? 'image.jpg',
  } as unknown as Blob);

  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok) {
    throw new Error(data?.error ?? 'Upload failed');
  }
  return { url: data.url! };
}

