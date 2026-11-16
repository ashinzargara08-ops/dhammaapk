import React from 'react';
import {
  Bookmark,
  CheckCircle2,
  Download,
  Heart,
  Play,
  BookOpen,
  WifiOff,
  Loader2,
  Pause,
} from 'lucide-react';
import type { AnyDhammaItem } from '../types';
import { contentKey, formatDuration } from '../lib/offlineDb';
import { SafeArtwork } from './KanoteOrnaments';

export function DhammaContentCard({
  item,
  isPlaying,
  isLiked,
  isFavorite,
  isDownloaded,
  downloadProgress,
  isOffline,
  coverOverrideUrl,
  onPlayOrOpen,
  onToggleLike,
  onToggleFavorite,
  onDownload,
}: {
  item: AnyDhammaItem;
  isPlaying?: boolean;
  isLiked: boolean;
  isFavorite: boolean;
  isDownloaded: boolean;
  downloadProgress?: number;
  isOffline: boolean;
  coverOverrideUrl?: string;
  onPlayOrOpen: (item: AnyDhammaItem) => void;
  onToggleLike: (item: AnyDhammaItem) => void;
  onToggleFavorite: (item: AnyDhammaItem) => void;
  onDownload: (item: AnyDhammaItem) => void;
}) {
  const unavailableOffline = isOffline && !isDownloaded;
  const isDownloading = typeof downloadProgress === 'number' && downloadProgress >= 0 && downloadProgress < 100;

  const metaDuration =
    item.type === 'text'
      ? `${item.readMinutes} min read`
      : formatDuration(item.durationSeconds);

  const typeLabel =
    item.type === 'mp3'
      ? 'MP3 Dhamma'
      : item.type === 'mp4'
      ? 'MP4 Video'
      : item.type === 'podcast'
      ? `Ep. ${item.episodeNumber}`
      : 'Dhamma Text';

  return (
    <article
      className={`dhamma-card rounded-2xl p-3.5 transition-all flex flex-col justify-between gap-3 ${
        unavailableOffline ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={() => onPlayOrOpen(item)}
          className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-[#C9A227]/35 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C96A]"
        >
          <SafeArtwork
            src={coverOverrideUrl || item.coverUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            fallbackTitle={item.title}
          />
          <div className="absolute inset-0 bg-black/35 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="w-9 h-9 rounded-full bg-black/70 border border-[#E8C96A]/70 flex items-center justify-center text-[#F7F5EE]">
              {item.type === 'text' ? (
                <BookOpen className="w-4 h-4" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 text-[#E8C96A]" />
              ) : (
                <Play className="w-4 h-4 ml-0.5" />
              )}
            </span>
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-[11px] text-[#E8C96A]/90">
            <span className="font-medium tracking-wide">{typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums text-[#A8A393]">{metaDuration}</span>
            {isDownloaded && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Offline
                </span>
              </>
            )}
            {unavailableOffline && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-amber-300/80">
                  <WifiOff className="w-3 h-3" />
                  Online Only
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => onPlayOrOpen(item)}
            className="mt-1 text-left w-full focus:outline-none"
          >
            <h3 className="text-sm sm:text-base font-semibold text-[#F7F5EE] font-myanmar line-clamp-2 hover:text-[#E8C96A] transition-colors">
              {item.title}
            </h3>
          </button>

          <p className="mt-0.5 text-xs text-[#A8A393] font-myanmar truncate">
            {item.monkName}
          </p>
          {item.description && (
            <p className="mt-1 text-xs text-[#A8A393]/80 font-myanmar line-clamp-1">
              {item.description}
            </p>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#C9A227]/15">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleLike(item)}
            disabled={isOffline}
            title={isOffline ? 'Likes require an internet connection' : 'Like'}
            className={`min-h-[40px] px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs tabular-nums transition-colors ${
              isLiked
                ? 'text-rose-400 bg-rose-500/10'
                : 'text-[#F7F5EE]/80 hover:text-rose-300 hover:bg-white/5'
            } disabled:opacity-45`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
            <span>{item.likesCount}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleFavorite(item)}
            title="Save to Favorites"
            className={`min-h-[40px] min-w-[40px] px-2.5 rounded-xl inline-flex items-center justify-center gap-1 text-xs transition-colors ${
              isFavorite
                ? 'text-[#E8C96A] bg-[#C9A227]/15'
                : 'text-[#F7F5EE]/80 hover:text-[#E8C96A] hover:bg-white/5'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#E8C96A]' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isDownloading ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#063B2B]/60 border border-[#C9A227]/30 text-xs text-[#E8C96A] tabular-nums">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{downloadProgress}%</span>
            </div>
          ) : isDownloaded ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onDownload(item)}
              disabled={isOffline}
              className="min-h-[40px] px-3 rounded-xl border border-[#C9A227]/35 text-xs text-[#F7F5EE] hover:border-[#E8C96A] hover:text-[#E8C96A] inline-flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {isDownloading && (
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C96A] transition-all duration-150"
            style={{ width: `${downloadProgress}%` }}
          />
        </div>
      )}
    </article>
  );
}

export function getItemKey(item: AnyDhammaItem): string {
  return contentKey(item.type, item.id);
}
