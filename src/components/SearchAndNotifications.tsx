import React, { useMemo, useState } from 'react';
import { Bell, BellOff, BookOpen, CheckCircle2, Disc3, Headphones, Search, User, Video, X } from 'lucide-react';
import type {
  AnyDhammaItem,
  AppNotification,
  DhammaAudio,
  DhammaPodcast,
  DhammaText,
  DhammaVideo,
  Monk,
} from '../types';
import { contentKey } from '../lib/offlineDb';
import { SafeArtwork } from './KanoteOrnaments';

export function GlobalSearchModal({
  monks,
  mp3,
  mp4,
  podcasts,
  texts,
  downloadedKeys,
  onClose,
  onSelectMonk,
  onOpenItem,
}: {
  monks: Monk[];
  mp3: DhammaAudio[];
  mp4: DhammaVideo[];
  podcasts: DhammaPodcast[];
  texts: DhammaText[];
  downloadedKeys: Set<string>;
  onClose: () => void;
  onSelectMonk: (m: Monk) => void;
  onOpenItem: (item: AnyDhammaItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'mp3' | 'mp4' | 'podcast' | 'text'>('all');

  const q = query.trim().toLowerCase();

  const matchedMonks = useMemo(() => {
    if (!q) return monks.slice(0, 3);
    return monks.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.monastery.toLowerCase().includes(q)
    );
  }, [monks, q]);

  const allItems: AnyDhammaItem[] = useMemo(() => [...mp3, ...mp4, ...podcasts, ...texts], [mp3, mp4, podcasts, texts]);

  const matchedItems = useMemo(() => {
    return allItems.filter((item) => {
      if (kindFilter !== 'all' && item.type !== kindFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.monkName.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    });
  }, [allItems, kindFilter, q]);

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/96 backdrop-blur-xl flex flex-col">
      <div className="border-b border-[#C9A227]/25 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2.5 rounded-2xl bg-[#0B0E0C] border border-[#C9A227]/40 px-3.5 min-h-[46px]">
            <Search className="w-4 h-4 text-[#E8C96A] shrink-0" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="တရားတော်အမည်၊ ဆရာတော်အမည် ရှာဖွေရန်..."
              className="w-full bg-transparent text-sm text-[#F7F5EE] placeholder:text-[#A8A393] focus:outline-none font-myanmar"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-[#A8A393] hover:text-[#F7F5EE]"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar">
          {(
            [
              ['all', 'All'],
              ['mp3', 'MP3'],
              ['mp4', 'MP4'],
              ['podcast', 'Podcast'],
              ['text', 'Dhamma Texts'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKindFilter(id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap shrink-0 transition-colors ${
                kindFilter === id
                  ? 'bg-[#C9A227] text-[#050505] font-semibold'
                  : 'bg-white/5 text-[#A8A393] hover:text-[#F7F5EE]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="max-w-3xl mx-auto space-y-6">
          {matchedMonks.length > 0 && kindFilter === 'all' && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-[#E8C96A] mb-2.5">
                Monks · ဆရာတော်များ
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matchedMonks.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectMonk(m);
                      onClose();
                    }}
                    className="dhamma-card rounded-2xl p-3 flex items-center gap-3 text-left"
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#C9A227]/40 shrink-0">
                      <SafeArtwork src={m.portraitUrl} alt={m.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">{m.name}</p>
                      <p className="text-xs text-[#A8A393] truncate">{m.title}</p>
                    </div>
                    <User className="w-4 h-4 text-[#C9A227]/70 ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-xs uppercase tracking-wider text-[#E8C96A] mb-2.5">
              Results ({matchedItems.length})
            </h3>
            {matchedItems.length === 0 ? (
              <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
                No matching Dhamma teachings found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {matchedItems.map((item) => {
                  const isDown = downloadedKeys.has(contentKey(item.type, item.id));
                  const Icon =
                    item.type === 'mp3'
                      ? Disc3
                      : item.type === 'mp4'
                      ? Video
                      : item.type === 'podcast'
                      ? Headphones
                      : BookOpen;
                  return (
                    <button
                      key={`${item.type}:${item.id}`}
                      type="button"
                      onClick={() => {
                        onOpenItem(item);
                        onClose();
                      }}
                      className="w-full dhamma-card rounded-2xl p-3 flex items-center gap-3.5 text-left"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#C9A227]/35 shrink-0">
                        <SafeArtwork src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[11px] text-[#E8C96A] uppercase">
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.type}</span>
                          {isDown && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-emerald-400 inline-flex items-center gap-1 normal-case">
                                <CheckCircle2 className="w-3 h-3" />
                                Offline
                              </span>
                            </>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#A8A393] font-myanmar truncate">{item.monkName}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsDrawer({
  notifications,
  enabled,
  onToggleEnabled,
  onClose,
  onSelectNotification,
}: {
  notifications: AppNotification[];
  enabled: boolean;
  onToggleEnabled: (next: boolean) => void;
  onClose: () => void;
  onSelectNotification: (n: AppNotification) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-md bg-[#080B09] border-l border-[#C9A227]/35 h-full flex flex-col">
        <div className="p-4 border-b border-[#C9A227]/25 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#F7F5EE] font-myanmar">အသိပေးချက်များ</h2>
            <p className="text-xs text-[#A8A393]">Dhamma Releases & Announcements</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="min-h-[44px] min-w-[44px] rounded-xl border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-[#C9A227]/15 flex items-center justify-between bg-[#063B2B]/25">
          <div className="flex items-center gap-2 text-xs text-[#F7F5EE]">
            {enabled ? <Bell className="w-4 h-4 text-[#E8C96A]" /> : <BellOff className="w-4 h-4 text-[#A8A393]" />}
            <span>Receive Dhamma Notifications</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleEnabled(!enabled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              enabled
                ? 'bg-[#C9A227] text-[#050505]'
                : 'bg-white/10 text-[#A8A393]'
            }`}
          >
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!enabled ? (
            <div className="dhamma-card rounded-2xl p-6 text-center text-sm text-[#A8A393]">
              Notifications are currently muted. Enable above to view new Dhamma alerts.
            </div>
          ) : notifications.length === 0 ? (
            <div className="dhamma-card rounded-2xl p-6 text-center text-sm text-[#A8A393]">
              No notifications yet.
            </div>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNotification(n)}
                className="w-full dhamma-card rounded-2xl p-3.5 text-left space-y-2 hover:border-[#E8C96A]/60 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#E8C96A]">
                  <span>{n.kind === 'auto' ? 'New Release' : 'Announcement'}</span>
                  <span className="text-[#A8A393] tabular-nums">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[#F7F5EE] font-myanmar">{n.title}</p>
                <p className="text-xs text-[#A8A393] font-myanmar leading-relaxed">{n.message}</p>
                {n.imageUrl && (
                  <div className="w-full h-32 rounded-xl overflow-hidden border border-[#C9A227]/25 mt-2">
                    <SafeArtwork src={n.imageUrl} alt={n.title} className="w-full h-full object-cover" />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
