import React, { useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  Download,
  Heart,
  Loader2,
  Minus,
  Plus,
} from 'lucide-react';
import type { DhammaText } from '../types';
import { getReaderFontSize, setReaderFontSize } from '../lib/offlineDb';
import { KanoteCorner, KanoteDivider, SafeArtwork } from './KanoteOrnaments';

export function TextReaderModal({
  article,
  coverUrl,
  isLiked,
  isFavorite,
  isBookmarked,
  isDownloaded,
  downloadProgress,
  isOffline,
  onClose,
  onToggleLike,
  onToggleFavorite,
  onToggleBookmark,
  onDownload,
}: {
  article: DhammaText;
  coverUrl?: string;
  isLiked: boolean;
  isFavorite: boolean;
  isBookmarked: boolean;
  isDownloaded: boolean;
  downloadProgress?: number;
  isOffline: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleFavorite: () => void;
  onToggleBookmark: () => void;
  onDownload: () => void;
}) {
  const [fontSize, setFontSize] = useState<number>(() => getReaderFontSize());

  const adjustFont = (delta: number) => {
    const next = Math.max(14, Math.min(28, fontSize + delta));
    setFontSize(next);
    setReaderFontSize(next);
  };

  const isDownloading = typeof downloadProgress === 'number' && downloadProgress >= 0 && downloadProgress < 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto">
      {/* Top Sticky Reader Bar */}
      <header className="sticky top-0 z-20 bg-[#050505]/92 backdrop-blur-xl border-b border-[#C9A227]/25 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-3 rounded-xl border border-[#C9A227]/30 text-sm text-[#F7F5EE] hover:border-[#E8C96A] inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#E8C96A]" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => adjustFont(-2)}
              aria-label="Decrease font size"
              className="min-h-[40px] min-w-[40px] rounded-xl border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE] hover:border-[#E8C96A]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs text-[#E8C96A] tabular-nums">{fontSize}px</span>
            <button
              type="button"
              onClick={() => adjustFont(2)}
              aria-label="Increase font size"
              className="min-h-[40px] min-w-[40px] rounded-xl border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE] hover:border-[#E8C96A]"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="relative rounded-3xl emerald-sanctuary-surface p-5 sm:p-8 overflow-hidden">
          <KanoteCorner position="tl" className="absolute top-3 left-3 w-11 h-11 opacity-75" />
          <KanoteCorner position="tr" className="absolute top-3 right-3 w-11 h-11 opacity-75" />

          <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
            <div className="w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-2xl overflow-hidden border border-[#C9A227]/40">
              <SafeArtwork src={coverUrl || article.coverUrl} alt={article.title} className="w-full h-full object-cover" />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xs text-[#E8C96A]">
                Dhamma Reading · {article.readMinutes} min read {isDownloaded ? '· Offline Saved' : ''}
              </p>
              <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#F7F5EE] font-myanmar leading-snug">
                {article.title}
              </h1>
              <p className="mt-1.5 text-sm text-[#A8A393] font-myanmar">{article.monkName}</p>
            </div>
          </div>

          <KanoteDivider className="my-5" />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleLike}
              disabled={isOffline}
              className={`min-h-[42px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs tabular-nums ${
                isLiked ? 'border-rose-400/50 bg-rose-500/15 text-rose-300' : 'border-[#C9A227]/30 text-[#F7F5EE]'
              } disabled:opacity-45`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>{article.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavorite}
              className={`min-h-[42px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs ${
                isFavorite ? 'border-[#E8C96A] bg-[#C9A227]/15 text-[#E8C96A]' : 'border-[#C9A227]/30 text-[#F7F5EE]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#E8C96A]' : ''}`} />
              <span>{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleBookmark}
              className={`min-h-[42px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs ${
                isBookmarked ? 'border-emerald-400/50 bg-emerald-950/50 text-emerald-300' : 'border-[#C9A227]/30 text-[#F7F5EE]'
              }`}
            >
              <span>{isBookmarked ? 'Bookmarked' : 'Bookmark Page'}</span>
            </button>

            {isDownloading ? (
              <div className="min-h-[42px] px-4 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center gap-2 tabular-nums">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{downloadProgress}%</span>
              </div>
            ) : isDownloaded ? (
              <div className="min-h-[42px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-xs text-emerald-300 inline-flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved Offline</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onDownload}
                disabled={isOffline}
                className="min-h-[42px] px-4 rounded-xl border border-[#C9A227]/40 text-xs text-[#F7F5EE] hover:border-[#E8C96A] inline-flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Save Offline</span>
              </button>
            )}
          </div>
        </div>

        {/* Reading Body */}
        <article className="dhamma-card rounded-3xl p-6 sm:p-10">
          <div
            className="font-myanmar text-[#F7F5EE]/95 whitespace-pre-line"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.92 }}
          >
            {article.body}
          </div>
        </article>
      </main>
    </div>
  );
}
