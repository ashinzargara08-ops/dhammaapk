import type {
  AnyDhammaItem,
  BootstrapPayload,
  ContentKind,
  OfflineRecord,
  PlaybackProgress,
} from '../types';
import { resolveApiUrl } from './apiUrl';

const DB_NAME = 'dhamma_yway_gyi_offline_v1';
const DB_VERSION = 1;
const STORE_DOWNLOADS = 'downloads';

const ANON_UID_KEY = 'dhamma_anon_uid_v1';
const FAVORITES_KEY = 'dhamma_favorites_v1';
const PROGRESS_KEY = 'dhamma_progress_v1';
const SNAPSHOT_KEY = 'dhamma_bootstrap_snapshot_v1';
const NOTIF_ENABLED_KEY = 'dhamma_notif_enabled_v1';
const NOTIF_READ_KEY = 'dhamma_notif_read_v1';
const FONT_SIZE_KEY = 'dhamma_reader_font_size_v1';
const BOOKMARKS_KEY = 'dhamma_text_bookmarks_v1';

export function getAnonUid(): string {
  let uid = localStorage.getItem(ANON_UID_KEY);
  if (!uid || !/^[a-zA-Z0-9_-]{8,64}$/.test(uid)) {
    const rand = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(36).slice(2, 12)}`;
    uid = `anon_${rand.slice(0, 24)}`;
    localStorage.setItem(ANON_UID_KEY, uid);
  }
  return uid;
}

export function getFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleFavoriteKey(key: string): string[] {
  const current = getFavorites();
  const next = current.includes(key) ? current.filter((k) => k !== key) : [key, ...current];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export function getBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function toggleBookmarkId(id: string): string[] {
  const current = getBookmarks();
  const next = current.includes(id) ? current.filter((k) => k !== id) : [id, ...current];
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
  return next;
}

export function getAllProgress(): PlaybackProgress[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const list = raw ? (JSON.parse(raw) as PlaybackProgress[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function savePlaybackProgress(entry: Omit<PlaybackProgress, 'updatedAt'>): PlaybackProgress[] {
  const list = getAllProgress().filter((p) => p.key !== entry.key);
  const updated: PlaybackProgress[] = [{ ...entry, updatedAt: Date.now() }, ...list].slice(0, 30);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(updated));
  return updated;
}

export function getProgressForKey(key: string): PlaybackProgress | undefined {
  return getAllProgress().find((p) => p.key === key);
}

export function saveBootstrapSnapshot(payload: BootstrapPayload): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota overflow
  }
}

export function loadBootstrapSnapshot(): BootstrapPayload | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as BootstrapPayload) : null;
  } catch {
    return null;
  }
}

export function getNotificationsEnabled(): boolean {
  const raw = localStorage.getItem(NOTIF_ENABLED_KEY);
  return raw === null ? true : raw === 'true';
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIF_ENABLED_KEY, String(enabled));
}

export function getReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(NOTIF_READ_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function markAllNotificationsRead(ids: string[]): string[] {
  const merged = Array.from(new Set([...getReadNotificationIds(), ...ids]));
  localStorage.setItem(NOTIF_READ_KEY, JSON.stringify(merged));
  return merged;
}

export function getReaderFontSize(): number {
  const val = Number(localStorage.getItem(FONT_SIZE_KEY));
  return val >= 14 && val <= 28 ? val : 18;
}

export function setReaderFontSize(size: number): void {
  localStorage.setItem(FONT_SIZE_KEY, String(size));
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_DOWNLOADS)) {
        db.createObjectStore(STORE_DOWNLOADS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllDownloads(): Promise<OfflineRecord[]> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
      const store = tx.objectStore(STORE_DOWNLOADS);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = (req.result || []) as OfflineRecord[];
        resolve(rows.sort((a, b) => b.downloadedAt - a.downloadedAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function getDownloadByKey(key: string): Promise<OfflineRecord | undefined> {
  try {
    const db = await openOfflineDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DOWNLOADS, 'readonly');
      const req = tx.objectStore(STORE_DOWNLOADS).get(key);
      req.onsuccess = () => resolve(req.result as OfflineRecord | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return undefined;
  }
}

export async function deleteDownloadByKey(key: string): Promise<void> {
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    tx.objectStore(STORE_DOWNLOADS).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function fetchBlobWithProgress(
  url: string,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch asset (${res.status})`);
  }
  const contentLength = Number(res.headers.get('content-length') || 0);
  if (!res.body || !contentLength) {
    const blob = await res.blob();
    onProgress?.(100);
    return blob;
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.length;
      onProgress?.(Math.min(98, Math.round((received / contentLength) * 100)));
    }
  }

  onProgress?.(100);
  const type = res.headers.get('content-type') || 'application/octet-stream';
  return new Blob(chunks as BlobPart[], { type });
}

export async function downloadContentItem(
  item: AnyDhammaItem,
  onProgress: (pct: number) => void
): Promise<OfflineRecord> {
  const key = `${item.type}:${item.id}`;
  onProgress(5);

  let coverBlob: Blob | undefined;
  try {
    if (item.coverUrl) {
      coverBlob = await fetchBlobWithProgress(resolveApiUrl(item.coverUrl));
    }
  } catch {
    // Cover caching is best-effort
  }

  let mediaBlob: Blob | undefined;
  let subtitleText: string | undefined;

  if (item.type === 'mp3' || item.type === 'podcast' || item.type === 'mp4') {
    mediaBlob = await fetchBlobWithProgress(resolveApiUrl(item.mediaUrl), (pct) => {
      onProgress(Math.max(10, Math.min(95, pct)));
    });
  }

  if (item.type === 'mp4' && item.subtitleVttUrl) {
    try {
      const subRes = await fetch(resolveApiUrl(item.subtitleVttUrl));
      if (subRes.ok) subtitleText = await subRes.text();
    } catch {
      // ignore optional subtitle error
    }
  }

  const textSize = item.type === 'text' ? new Blob([item.body]).size : 0;
  const sizeBytes = (mediaBlob?.size || 0) + (coverBlob?.size || 0) + textSize;

  const record: OfflineRecord = {
    key,
    type: item.type,
    id: item.id,
    item,
    mediaBlob,
    coverBlob,
    subtitleText,
    sizeBytes,
    downloadedAt: Date.now(),
  };

  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_DOWNLOADS, 'readwrite');
    tx.objectStore(STORE_DOWNLOADS).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  onProgress(100);
  return record;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function contentKey(type: ContentKind, id: string): string {
  return `${type}:${id}`;
}
