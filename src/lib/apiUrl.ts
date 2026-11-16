import { Capacitor } from '@capacitor/core';

const SERVER_URL_KEY = 'dhamma_server_base_url_v1';
const DEFAULT_REMOTE_SERVER =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
  'https://ais-pre-2vjex6qoibqhhbdd2uj3vo-57759665827.asia-east1.run.app';

export function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getServerBaseUrl(): string {
  if (!isCapacitorNative()) return '';
  try {
    const saved = localStorage.getItem(SERVER_URL_KEY);
    if (saved && saved.startsWith('http')) {
      return saved.replace(/\/+$/, '');
    }
  } catch {
    // ignore storage read error
  }
  return DEFAULT_REMOTE_SERVER.replace(/\/+$/, '');
}

export function setServerBaseUrl(url: string): void {
  try {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) localStorage.setItem(SERVER_URL_KEY, clean);
    else localStorage.removeItem(SERVER_URL_KEY);
  } catch {
    // ignore
  }
}

export function resolveApiUrl(path: string): string {
  if (!path) return path;
  if (/^(https?:|blob:|data:)/i.test(path)) return path;

  // Map dev /src/assets/images/* paths to bundled /assets/images/* in dist/APK
  if (path.startsWith('/src/assets/images/')) {
    return path.replace('/src/assets/images/', '/assets/images/');
  }

  const base = getServerBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
