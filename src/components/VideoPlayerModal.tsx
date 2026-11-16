import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  CheckCircle2,
  Captions,
  Download,
  Heart,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Unlock,
  X,
} from 'lucide-react';
import type { DhammaVideo } from '../types';
import { contentKey, formatDuration, getProgressForKey, savePlaybackProgress } from '../lib/offlineDb';
import { resolveApiUrl } from '../lib/apiUrl';

interface VttCue {
  start: number;
  end: number;
  text: string;
}

function parseVttTime(raw: string): number {
  const parts = raw.trim().split(':');
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }
  return Number(raw) || 0;
}

function parseVtt(vtt: string): VttCue[] {
  const blocks = vtt.replace(/\r/g, '').split('\n\n');
  const cues: VttCue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    const arrowIdx = lines.findIndex((l) => l.includes('-->'));
    if (arrowIdx >= 0) {
      const [startStr, endStr] = lines[arrowIdx].split('-->').map((s) => s.trim().split(' ')[0]);
      const text = lines.slice(arrowIdx + 1).join('\n');
      cues.push({
        start: parseVttTime(startStr),
        end: parseVttTime(endStr),
        text,
      });
    }
  }
  return cues;
}

export function VideoPlayerModal({
  video,
  offlineMediaUrl,
  offlineSubtitleText,
  isLiked,
  isFavorite,
  isDownloaded,
  downloadProgress,
  isOffline,
  onClose,
  onToggleLike,
  onToggleFavorite,
  onDownload,
  onProgressSaved,
}: {
  video: DhammaVideo;
  offlineMediaUrl?: string;
  offlineSubtitleText?: string;
  isLiked: boolean;
  isFavorite: boolean;
  isDownloaded: boolean;
  downloadProgress?: number;
  isOffline: boolean;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
  onProgressSaved: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [subtitlesOn, setSubtitlesOn] = useState(true);
  const [screenLocked, setScreenLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cues, setCues] = useState<VttCue[]>([]);

  const activeSrc = useMemo(() => {
    if (offlineMediaUrl) return offlineMediaUrl;
    const variant = video.qualityVariants?.[selectedVariantIdx];
    return resolveApiUrl(variant?.url || video.mediaUrl);
  }, [offlineMediaUrl, video, selectedVariantIdx]);

  // Load VTT subtitles
  useEffect(() => {
    let active = true;
    if (offlineSubtitleText) {
      setCues(parseVtt(offlineSubtitleText));
      return;
    }
    if (video.subtitleVttUrl && !isOffline) {
      fetch(resolveApiUrl(video.subtitleVttUrl))
        .then((r) => (r.ok ? r.text() : ''))
        .then((txt) => {
          if (active && txt) setCues(parseVtt(txt));
        })
        .catch(() => {});
    } else {
      setCues([]);
    }
    return () => {
      active = false;
    };
  }, [video.subtitleVttUrl, offlineSubtitleText, isOffline]);

  // Restore last playback position
  useEffect(() => {
    const saved = getProgressForKey(contentKey('mp4', video.id));
    if (saved && videoRef.current && saved.positionSeconds > 1 && saved.positionSeconds < saved.durationSeconds - 1) {
      videoRef.current.currentTime = saved.positionSeconds;
    }
  }, [video.id]);

  // Apply playbackRate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, activeSrc]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const activeCue = useMemo(() => {
    if (!subtitlesOn || cues.length === 0) return null;
    return cues.find((c) => currentTime >= c.start && currentTime <= c.end) || null;
  }, [subtitlesOn, cues, currentTime]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleQualityChange = (idx: number) => {
    const t = videoRef.current?.currentTime || 0;
    const wasPlaying = videoRef.current ? !videoRef.current.paused : false;
    setSelectedVariantIdx(idx);
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = t;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const persistProgress = (pos: number, dur: number) => {
    savePlaybackProgress({
      key: contentKey('mp4', video.id),
      type: 'mp4',
      id: video.id,
      title: video.title,
      monkName: video.monkName,
      coverUrl: video.coverUrl,
      positionSeconds: pos,
      durationSeconds: dur,
    });
    onProgressSaved();
  };

  const isDownloading = typeof downloadProgress === 'number' && downloadProgress >= 0 && downloadProgress < 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/98 backdrop-blur-xl flex flex-col overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-[#E8C96A]">
              MP4 Dhamma Video {isDownloaded ? '· Offline Ready' : ''}
            </p>
            <h2 className="text-base sm:text-xl font-bold text-[#F7F5EE] font-myanmar truncate">
              {video.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close video player"
            className="min-h-[44px] min-w-[44px] rounded-full border border-[#C9A227]/35 bg-[#0B0E0C] flex items-center justify-center text-[#F7F5EE] hover:border-[#E8C96A]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Frame */}
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden border border-[#C9A227]/45 bg-black aspect-video shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
        >
          <video
            ref={videoRef}
            src={activeSrc}
            poster={resolveApiUrl(video.coverUrl)}
            playsInline
            onClick={() => {
              if (!screenLocked) togglePlay();
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (videoRef.current) {
                persistProgress(videoRef.current.currentTime, videoRef.current.duration || duration);
              }
            }}
            onLoadedMetadata={(e) => {
              const el = e.currentTarget;
              if (el.duration) setDuration(el.duration);
            }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              setCurrentTime(el.currentTime);
              if (Math.floor(el.currentTime) % 3 === 0) {
                persistProgress(el.currentTime, el.duration || duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              persistProgress(0, duration);
            }}
            className="w-full h-full object-contain bg-black"
          />

          {/* Live Subtitle Overlay */}
          {activeCue && (
            <div className="pointer-events-none absolute bottom-16 inset-x-4 flex justify-center">
              <div className="px-4 py-2 rounded-xl bg-black/80 border border-[#C9A227]/35 text-center text-xs sm:text-sm text-[#F7F5EE] font-myanmar whitespace-pre-line max-w-2xl">
                {activeCue.text}
              </div>
            </div>
          )}

          {/* Screen Lock Overlay */}
          {screenLocked ? (
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                onClick={() => setScreenLocked(false)}
                className="min-h-[44px] px-3.5 rounded-full bg-black/80 border border-[#E8C96A] text-xs text-[#E8C96A] inline-flex items-center gap-1.5"
              >
                <Unlock className="w-4 h-4" />
                <span>Unlock Screen</span>
              </button>
            </div>
          ) : (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/75 to-transparent p-3 sm:p-4 space-y-2">
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                step={0.1}
                value={Math.min(currentTime, duration || 1)}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (videoRef.current) videoRef.current.currentTime = val;
                }}
                aria-label="Seek video"
                className="w-full accent-[#E8C96A] cursor-pointer h-1.5"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="min-h-[40px] min-w-[40px] rounded-full bg-[#C9A227] text-[#050505] flex items-center justify-center"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>

                  <span className="text-xs text-[#F7F5EE] tabular-nums">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {cues.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSubtitlesOn((s) => !s)}
                      className={`min-h-[36px] px-2.5 rounded-lg text-xs inline-flex items-center gap-1 border ${
                        subtitlesOn
                          ? 'border-[#E8C96A] bg-[#C9A227]/20 text-[#E8C96A]'
                          : 'border-white/20 text-white/75'
                      }`}
                    >
                      <Captions className="w-3.5 h-3.5" />
                      <span>CC</span>
                    </button>
                  )}

                  {/* Quality selector */}
                  {!offlineMediaUrl && video.qualityVariants && video.qualityVariants.length > 1 && (
                    <select
                      value={selectedVariantIdx}
                      onChange={(e) => handleQualityChange(Number(e.target.value))}
                      aria-label="Video quality"
                      className="min-h-[36px] px-2 rounded-lg bg-black/80 border border-[#C9A227]/40 text-xs text-[#F7F5EE]"
                    >
                      {video.qualityVariants.map((v, i) => (
                        <option key={v.label} value={i}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Speed selector */}
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    aria-label="Playback speed"
                    className="min-h-[36px] px-2 rounded-lg bg-black/80 border border-[#C9A227]/40 text-xs text-[#F7F5EE] tabular-nums"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <option key={s} value={s}>
                        {s}x
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setScreenLocked(true)}
                    aria-label="Lock screen controls"
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-white/20 flex items-center justify-center text-white/85 hover:border-[#E8C96A]"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label="Toggle fullscreen"
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-white/20 flex items-center justify-center text-white/85 hover:border-[#E8C96A]"
                  >
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metadata & Actions */}
        <div className="dhamma-card rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-[#E8C96A] font-myanmar">{video.monkName}</p>
              <p className="mt-1 text-sm text-[#A8A393] font-myanmar leading-relaxed">
                {video.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#C9A227]/15">
            <button
              type="button"
              onClick={onToggleLike}
              disabled={isOffline}
              className={`min-h-[44px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs tabular-nums ${
                isLiked
                  ? 'border-rose-400/50 bg-rose-500/15 text-rose-300'
                  : 'border-[#C9A227]/30 text-[#F7F5EE]'
              } disabled:opacity-45`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
              <span>{video.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={onToggleFavorite}
              className={`min-h-[44px] px-4 rounded-xl border inline-flex items-center gap-2 text-xs ${
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
                <span>Downloaded</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onDownload}
                disabled={isOffline}
                className="min-h-[44px] px-4 rounded-xl border border-[#C9A227]/40 text-xs text-[#F7F5EE] hover:border-[#E8C96A] inline-flex items-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Download MP4</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
