import React from 'react';
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Download,
  Heart,
  Loader2,
  Moon,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type { DhammaAudio, DhammaPodcast } from '../types';
import { formatDuration } from '../lib/offlineDb';
import { KanoteCorner, SafeArtwork } from './KanoteOrnaments';

export type PlayableAudio = DhammaAudio | DhammaPodcast;

export function AudioMiniPlayer({
  track,
  coverUrl,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onOpenFull,
  onClose,
}: {
  track: PlayableAudio;
  coverUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onOpenFull: () => void;
  onClose: () => void;
}) {
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed bottom-[70px] lg:bottom-4 left-3 right-3 lg:left-auto lg:right-6 lg:w-[420px] z-30 rounded-2xl bg-[#0B100D]/95 backdrop-blur-xl border border-[#C9A227]/45 shadow-[0_14px_40px_rgba(0,0,0,0.85)] overflow-hidden">
      {/* Mini progress hairline */}
      <div className="h-[2px] w-full bg-white/10">
        <div
          className="h-full bg-gradient-to-r from-[#C9A227] to-[#E8C96A] transition-all duration-150"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={onOpenFull}
          className="flex items-center gap-3 flex-1 min-w-0 text-left focus:outline-none"
        >
          <div className="w-11 h-11 rounded-xl overflow-hidden border border-[#C9A227]/40 shrink-0">
            <SafeArtwork src={coverUrl || track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">
              {track.title}
            </p>
            <p className="text-[11px] text-[#E8C96A]/85 font-myanmar truncate">
              {track.monkName} · <span className="tabular-nums">{formatDuration(currentTime)}</span>
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="min-h-[44px] min-w-[44px] rounded-full bg-gradient-to-br from-[#E8C96A] to-[#B68D18] text-[#050505] flex items-center justify-center shadow-md hover:brightness-110 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close player"
            className="min-h-[40px] min-w-[40px] rounded-full text-[#A8A393] hover:text-[#F7F5EE] flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

const WAVE_HEIGHTS = [
  28, 48, 72, 42, 88, 60, 95, 52, 74, 38, 86, 65, 92, 45, 78, 56, 84, 36, 70, 90, 50, 76, 40, 62, 82, 44, 68, 34,
];

export function AudioFullPlayerModal({
  track,
  coverUrl,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  repeatMode,
  shuffle,
  sleepTimerSeconds,
  isLiked,
  isFavorite,
  isDownloaded,
  downloadProgress,
  isOffline,
  onClose,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onChangeRate,
  onCycleRepeat,
  onToggleShuffle,
  onSetSleepTimer,
  onToggleLike,
  onToggleFavorite,
  onDownload,
}: {
  track: PlayableAudio;
  coverUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  repeatMode: 'off' | 'all' | 'one';
  shuffle: boolean;
  sleepTimerSeconds: number | null;
  isLiked: boolean;
  isFavorite: boolean;
  isDownloaded: boolean;
  downloadProgress?: number;
  isOffline: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (sec: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onChangeRate: (rate: number) => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onSetSleepTimer: (minutes: number | null) => void;
  onToggleLike: () => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
}) {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const progressRatio = duration > 0 ? currentTime / duration : 0;
  const isDownloading = typeof downloadProgress === 'number' && downloadProgress >= 0 && downloadProgress < 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/98 backdrop-blur-2xl flex flex-col overflow-y-auto">
      {/* Ambient emerald-gold backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(6,59,43,0.45)_0%,rgba(201,162,39,0.08)_35%,rgba(5,5,5,1)_78%)]"
      />

      <div className="relative z-10 w-full max-w-xl mx-auto flex-1 flex flex-col justify-between px-5 py-4 sm:py-8">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            aria-label="Minimize player"
            className="min-h-[44px] min-w-[44px] rounded-full border border-[#C9A227]/30 bg-black/50 flex items-center justify-center text-[#F7F5EE] hover:border-[#E8C96A]"
          >
            <ChevronDown className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-[11px] uppercase tracking-widest text-[#E8C96A]">
              {track.type === 'podcast' ? `Dhamma Podcast · Ep. ${track.episodeNumber}` : 'Dhamma MP3 Player'}
            </p>
            <p className="text-xs text-[#A8A393]">
              {isDownloaded ? 'Offline Cached Playback' : 'Streaming Audio'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const options = [null, 15, 30, 45, 60];
              const currentMin = sleepTimerSeconds ? Math.ceil(sleepTimerSeconds / 60) : null;
              const nextIdx =
                currentMin === null
                  ? 1
                  : (options.findIndex((o) => o !== null && Math.abs(o - currentMin) <= 15) + 1) % options.length;
              onSetSleepTimer(options[nextIdx]);
            }}
            className={`min-h-[44px] px-3 rounded-full border flex items-center gap-1.5 text-xs tabular-nums transition-colors ${
              sleepTimerSeconds !== null
                ? 'border-[#E8C96A] bg-[#C9A227]/15 text-[#E8C96A]'
                : 'border-[#C9A227]/30 bg-black/50 text-[#F7F5EE]/80 hover:border-[#E8C96A]'
            }`}
            title="Sleep Timer"
          >
            <Moon className="w-4 h-4" />
            <span>{sleepTimerSeconds !== null ? formatDuration(sleepTimerSeconds) : 'Sleep'}</span>
          </button>
        </div>

        {/* Artwork with Kanote Frame */}
        <div className="my-5 flex flex-col items-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl p-1.5 bg-gradient-to-br from-[#E8C96A] via-[#C9A227] to-[#6E530B] shadow-[0_24px_65px_rgba(0,0,0,0.9)]">
            <KanoteCorner position="tl" className="absolute -top-2 -left-2 w-10 h-10 z-10" />
            <KanoteCorner position="tr" className="absolute -top-2 -right-2 w-10 h-10 z-10" />
            <KanoteCorner position="bl" className="absolute -bottom-2 -left-2 w-10 h-10 z-10" />
            <KanoteCorner position="br" className="absolute -bottom-2 -right-2 w-10 h-10 z-10" />
            <div className="w-full h-full rounded-[20px] overflow-hidden bg-[#050505]">
              <SafeArtwork
                src={coverUrl || track.coverUrl}
                alt={track.title}
                className="w-full h-full object-cover"
                fallbackTitle={track.title}
              />
            </div>
          </div>

          <div className="mt-5 text-center w-full px-2">
            <h2 className="text-xl sm:text-2xl font-bold text-[#F7F5EE] font-myanmar leading-snug">
              {track.title}
            </h2>
            <p className="mt-1 text-sm text-[#E8C96A] font-myanmar">
              {track.monkName}
            </p>
          </div>
        </div>

        {/* Animated Waveform */}
        <div className="flex items-end justify-center gap-1 h-12 px-2 my-2" aria-hidden="true">
          {WAVE_HEIGHTS.map((h, idx) => {
            const barRatio = idx / WAVE_HEIGHTS.length;
            const passed = barRatio <= progressRatio;
            return (
              <div
                key={idx}
                className={`w-1.5 rounded-full transition-colors duration-200 ${
                  passed ? 'bg-[#E8C96A]' : 'bg-[#C9A227]/25'
                } ${isPlaying ? 'wave-bar-active' : ''}`}
                style={{
                  height: `${h}%`,
                  animationDelay: `${(idx % 7) * 0.11}s`,
                }}
              />
            );
          })}
        </div>

        {/* Seek Bar */}
        <div className="space-y-1.5">
          <input
            type="range"
            min={0}
            max={Math.max(duration, 1)}
            step={0.1}
            value={Math.min(currentTime, duration || 1)}
            onChange={(e) => onSeek(Number(e.target.value))}
            aria-label="Seek audio position"
            className="w-full accent-[#E8C96A] cursor-pointer h-1.5 bg-white/15 rounded-lg"
          />
          <div className="flex items-center justify-between text-xs text-[#A8A393] tabular-nums">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Primary Transport Controls */}
        <div className="flex items-center justify-between py-3">
          <button
            type="button"
            onClick={onToggleShuffle}
            aria-label="Shuffle"
            className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-colors ${
              shuffle ? 'text-[#E8C96A] bg-[#C9A227]/15' : 'text-[#A8A393] hover:text-[#F7F5EE]'
            }`}
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous track"
            className="min-h-[48px] min-w-[48px] rounded-full border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE] hover:border-[#E8C96A]"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-[#E8C96A] via-[#C9A227] to-[#9A7512] text-[#050505] flex items-center justify-center shadow-[0_0_30px_rgba(201,162,39,0.45)] hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={onNext}
            aria-label="Next track"
            className="min-h-[48px] min-w-[48px] rounded-full border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE] hover:border-[#E8C96A]"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            aria-label="Repeat mode"
            className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center transition-colors ${
              repeatMode !== 'off' ? 'text-[#E8C96A] bg-[#C9A227]/15' : 'text-[#A8A393] hover:text-[#F7F5EE]'
            }`}
          >
            {repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
          </button>
        </div>

        {/* Speed + Like / Favorite / Download Row */}
        <div className="space-y-3 pt-2 border-t border-[#C9A227]/20">
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs text-[#A8A393] shrink-0">Speed</span>
            <div className="flex items-center gap-1">
              {speeds.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onChangeRate(s)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs tabular-nums transition-colors ${
                    playbackRate === s
                      ? 'bg-[#C9A227] text-[#050505] font-semibold'
                      : 'bg-white/5 text-[#F7F5EE]/80 hover:bg-white/10'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onToggleLike}
              disabled={isOffline}
              className={`min-h-[44px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs tabular-nums transition-colors ${
                isLiked
                  ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                  : 'border-[#C9A227]/30 text-[#F7F5EE]'
              } disabled:opacity-45`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>{track.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavorite}
              className={`min-h-[44px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs transition-colors ${
                isFavorite
                  ? 'border-[#E8C96A] bg-[#C9A227]/15 text-[#E8C96A]'
                  : 'border-[#C9A227]/30 text-[#F7F5EE]'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-[#E8C96A]' : ''}`} />
              <span>{isFavorite ? 'Saved Favorite' : 'Favorite'}</span>
            </button>

            {isDownloading ? (
              <div className="min-h-[44px] px-4 rounded-xl border border-[#C9A227]/40 bg-[#063B2B]/60 inline-flex items-center gap-2 text-xs text-[#E8C96A] tabular-nums">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{downloadProgress}%</span>
              </div>
            ) : isDownloaded ? (
              <div className="min-h-[44px] px-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 inline-flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4" />
                <span>Offline Ready</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onDownload}
                disabled={isOffline}
                className="min-h-[44px] px-4 rounded-xl border border-[#C9A227]/40 text-xs text-[#F7F5EE] hover:border-[#E8C96A] inline-flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
