import React, { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  CheckCircle2,
  Clock,
  Disc3,
  Download,
  HardDrive,
  Headphones,
  Shield,
  Trash2,
  Video,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { AnyDhammaItem, OfflineRecord, PlaybackProgress } from '../types';
import { contentKey, formatBytes, formatDuration } from '../lib/offlineDb';
import { getServerBaseUrl, isCapacitorNative, setServerBaseUrl } from '../lib/apiUrl';
import { SafeArtwork } from './KanoteOrnaments';

export function MyLibraryView({
  downloads,
  favorites,
  allItems,
  progressList,
  isOffline,
  simulatedOffline,
  notificationsEnabled,
  isAdminAuthenticated,
  onToggleSimulatedOffline,
  onToggleNotifications,
  onOpenItem,
  onDeleteDownload,
  onRemoveFavorite,
  onOpenAdmin,
}: {
  downloads: OfflineRecord[];
  favorites: string[];
  allItems: AnyDhammaItem[];
  progressList: PlaybackProgress[];
  isOffline: boolean;
  simulatedOffline: boolean;
  notificationsEnabled: boolean;
  isAdminAuthenticated: boolean;
  onToggleSimulatedOffline: () => void;
  onToggleNotifications: () => void;
  onOpenItem: (item: AnyDhammaItem) => void;
  onDeleteDownload: (key: string) => void;
  onRemoveFavorite: (key: string) => void;
  onOpenAdmin: () => void;
}) {
  const [sectionTab, setSectionTab] = useState<'downloads' | 'favorites' | 'history'>('downloads');
  const nativeApp = isCapacitorNative();
  const [serverUrlInput, setServerUrlInput] = useState<string>(() => getServerBaseUrl());
  const [serverUrlSaved, setServerUrlSaved] = useState(false);

  const totalBytes = downloads.reduce((s, d) => s + d.sizeBytes, 0);
  const downloadedMap = new Map(downloads.map((d) => [d.key, d]));

  const favoriteItems = favorites
    .map((key) => {
      const onlineMatch = allItems.find((i) => contentKey(i.type, i.id) === key);
      if (onlineMatch) return onlineMatch;
      return downloadedMap.get(key)?.item;
    })
    .filter((x): x is AnyDhammaItem => Boolean(x));

  return (
    <div className="space-y-6 pb-8">
      {/* Header Summary */}
      <div className="rounded-3xl emerald-sanctuary-surface p-5 sm:p-7 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F7F5EE] font-myanmar">
              ကျွန်ုပ်၏ ဓမ္မစာကြည့်တိုက်
            </h1>
            <p className="text-xs sm:text-sm text-[#A8A393] mt-0.5">
              Offline Downloads · Favorites · Playback History
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenAdmin}
            className="min-h-[44px] px-4 rounded-xl border border-[#C9A227]/45 bg-[#050505]/70 text-xs sm:text-sm text-[#E8C96A] hover:bg-[#C9A227]/15 inline-flex items-center gap-2 self-start sm:self-auto transition-colors"
          >
            <Shield className="w-4 h-4" />
            <span>{isAdminAuthenticated ? 'Admin Dashboard' : 'Owner Admin Login'}</span>
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2.5 pt-2">
          <div className="rounded-2xl bg-[#050505]/65 border border-[#C9A227]/20 p-3">
            <p className="text-[11px] text-[#A8A393]">Offline Files</p>
            <p className="text-lg font-bold text-[#F7F5EE] tabular-nums mt-0.5">{downloads.length}</p>
          </div>
          <div className="rounded-2xl bg-[#050505]/65 border border-[#C9A227]/20 p-3">
            <p className="text-[11px] text-[#A8A393]">Storage Used</p>
            <p className="text-lg font-bold text-[#E8C96A] tabular-nums mt-0.5">{formatBytes(totalBytes)}</p>
          </div>
          <div className="rounded-2xl bg-[#050505]/65 border border-[#C9A227]/20 p-3">
            <p className="text-[11px] text-[#A8A393]">Favorites</p>
            <p className="text-lg font-bold text-[#F7F5EE] tabular-nums mt-0.5">{favoriteItems.length}</p>
          </div>
        </div>

        {/* Device / Offline Mode & Notifications Controls */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#C9A227]/15">
          <button
            type="button"
            onClick={onToggleSimulatedOffline}
            className={`min-h-[40px] px-3.5 rounded-xl border text-xs inline-flex items-center gap-2 transition-colors ${
              isOffline
                ? 'border-amber-400/60 bg-amber-500/15 text-amber-300'
                : 'border-[#C9A227]/30 text-[#F7F5EE]/90 hover:border-[#E8C96A]'
            }`}
          >
            {isOffline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <span>
              {simulatedOffline ? 'Offline Mode Active (Tap to Go Online)' : isOffline ? 'Device Offline' : 'Online · Test Offline Mode'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleNotifications}
            className="min-h-[40px] px-3.5 rounded-xl border border-[#C9A227]/30 text-xs text-[#F7F5EE]/90 hover:border-[#E8C96A]"
          >
            Notifications: {notificationsEnabled ? 'On' : 'Off'}
          </button>
        </div>

        {nativeApp && (
          <div className="pt-3 border-t border-[#C9A227]/15 space-y-2">
            <label className="block text-[11px] text-[#A8A393]">
              Backend Server URL (Android App)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={serverUrlInput}
                onChange={(e) => {
                  setServerUrlInput(e.target.value);
                  setServerUrlSaved(false);
                }}
                placeholder="https://..."
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#050505]/80 border border-[#C9A227]/30 text-xs text-[#F7F5EE] focus:outline-none focus:border-[#E8C96A]"
              />
              <button
                type="button"
                onClick={() => {
                  setServerBaseUrl(serverUrlInput);
                  setServerUrlSaved(true);
                  window.location.reload();
                }}
                className="min-h-[40px] px-4 rounded-xl bg-[#C9A227] text-[#050505] text-xs font-semibold"
              >
                {serverUrlSaved ? 'Saved' : 'Save & Reconnect'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#0B0E0C] border border-[#C9A227]/25">
        {(
          [
            ['downloads', 'Downloads', Download],
            ['favorites', 'Favorites', Bookmark],
            ['history', 'Continue', Clock],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSectionTab(id)}
            className={`flex-1 min-h-[42px] rounded-xl text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors ${
              sectionTab === id
                ? 'bg-[#C9A227] text-[#050505]'
                : 'text-[#A8A393] hover:text-[#F7F5EE]'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Downloads Section */}
      {sectionTab === 'downloads' && (
        <div className="space-y-3">
          {downloads.length === 0 ? (
            <div className="dhamma-card rounded-2xl p-8 text-center space-y-2">
              <HardDrive className="w-8 h-8 text-[#C9A227]/70 mx-auto" />
              <p className="text-sm font-medium text-[#F7F5EE]">No downloaded Dhamma files yet</p>
              <p className="text-xs text-[#A8A393]">
                Download MP3 talks, MP4 videos, Podcasts, or Dhamma Texts to listen and read offline without Internet.
              </p>
            </div>
          ) : (
            downloads.map((rec) => {
              const Icon =
                rec.type === 'mp3'
                  ? Disc3
                  : rec.type === 'mp4'
                  ? Video
                  : rec.type === 'podcast'
                  ? Headphones
                  : BookOpen;
              return (
                <div
                  key={rec.key}
                  className="dhamma-card rounded-2xl p-3.5 flex items-center gap-3.5"
                >
                  <button
                    type="button"
                    onClick={() => onOpenItem(rec.item)}
                    className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#C9A227]/35 shrink-0">
                      <SafeArtwork src={rec.item.coverUrl} alt={rec.item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="uppercase">{rec.type}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums text-[#A8A393]">{formatBytes(rec.sizeBytes)}</span>
                      </div>
                      <h3 className="mt-0.5 text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">
                        {rec.item.title}
                      </h3>
                      <p className="text-xs text-[#A8A393] font-myanmar truncate">{rec.item.monkName}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteDownload(rec.key)}
                    aria-label="Delete downloaded file"
                    className="min-h-[44px] min-w-[44px] rounded-xl border border-rose-500/25 text-rose-400 hover:bg-rose-500/15 flex items-center justify-center shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Favorites Section */}
      {sectionTab === 'favorites' && (
        <div className="space-y-3">
          {favoriteItems.length === 0 ? (
            <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
              No favorites saved yet. Tap the bookmark icon on any Dhamma talk or article.
            </div>
          ) : (
            favoriteItems.map((item) => {
              const key = contentKey(item.type, item.id);
              const isDown = downloadedMap.has(key);
              const blockedOffline = isOffline && !isDown;
              return (
                <div key={key} className={`dhamma-card rounded-2xl p-3.5 flex items-center gap-3.5 ${blockedOffline ? 'opacity-55' : ''}`}>
                  <button
                    type="button"
                    onClick={() => onOpenItem(item)}
                    className="flex items-center gap-3.5 flex-1 min-w-0 text-left"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#C9A227]/35 shrink-0">
                      <SafeArtwork src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] uppercase text-[#E8C96A]">
                        {item.type} {isDown ? '· Offline Ready' : isOffline ? '· Online Only' : ''}
                      </p>
                      <h3 className="mt-0.5 text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">{item.title}</h3>
                      <p className="text-xs text-[#A8A393] font-myanmar truncate">{item.monkName}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveFavorite(key)}
                    aria-label="Remove favorite"
                    className="min-h-[44px] min-w-[44px] rounded-xl text-[#E8C96A] hover:bg-white/5 flex items-center justify-center"
                  >
                    <Bookmark className="w-4 h-4 fill-[#E8C96A]" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Continue History Section */}
      {sectionTab === 'history' && (
        <div className="space-y-3">
          {progressList.length === 0 ? (
            <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
              Your recent MP3, MP4, and Podcast listening positions will appear here automatically.
            </div>
          ) : (
            progressList.map((entry) => {
              const match =
                allItems.find((i) => contentKey(i.type, i.id) === entry.key) ||
                downloadedMap.get(entry.key)?.item;
              if (!match) return null;
              const pct = entry.durationSeconds > 0 ? Math.min(100, Math.round((entry.positionSeconds / entry.durationSeconds) * 100)) : 0;
              return (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => onOpenItem(match)}
                  className="w-full dhamma-card rounded-2xl p-3.5 flex items-center gap-3.5 text-left"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#C9A227]/35 shrink-0">
                    <SafeArtwork src={entry.coverUrl} alt={entry.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-[#E8C96A] uppercase tabular-nums">
                      {entry.type} · Resume at {formatDuration(entry.positionSeconds)} ({pct}%)
                    </p>
                    <h3 className="mt-0.5 text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">
                      {entry.title}
                    </h3>
                    <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#E8C96A]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
