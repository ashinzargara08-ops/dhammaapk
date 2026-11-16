import { resolveApiUrl } from './apiUrl';

const ADMIN_TOKEN_KEY = 'dhamma_admin_token_v1';

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const target = typeof input === 'string' ? resolveApiUrl(input) : input;
  return fetch(target, {
    ...init,
    headers,
    credentials: 'include',
  });
}
