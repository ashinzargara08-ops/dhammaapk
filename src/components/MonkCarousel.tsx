import React, { useRef, useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Disc3, Headphones, Video, BookOpen } from 'lucide-react';
import type { AnyDhammaItem, DhammaAudio, DhammaPodcast, DhammaText, DhammaVideo, Monk } from '../types';
import { KanoteCorner, KanoteDivider, SafeArtwork } from './KanoteOrnaments';

export function MonkCarousel({
  monks,
  onSelectMonk,
}: {
  monks: Monk[];
  onSelectMonk: (monk: Monk) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  if (monks.length === 0) return null;

  const safeIndex = Math.min(activeIndex, monks.length - 1);

  const prev = () => setActiveIndex((i) => (i - 1 + monks.length) % monks.length);
  const next = () => setActiveIndex((i) => (i + 1) % monks.length);

  const getRelativeOffset = (idx: number) => {
    const total = monks.length;
    let diff = idx - safeIndex;
    if (diff > total / 2) diff -= total;
    if (diff < -total / 2) diff += total;
    return diff;
  };

  return (
    <section className="relative py-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#F7F5EE] font-myanmar">
            ဆရာတော်ဘုရားကြီးများ
          </h2>
          <p className="text-xs text-[#A8A393]">
            Venerable Dhamma Teachers · Tap portrait to explore discourses
          </p>
        </div>
        {monks.length > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous monk"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[#C9A227]/35 bg-[#0B0E0C] text-[#F7F5EE] hover:border-[#E8C96A] hover:text-[#E8C96A] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next monk"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border border-[#C9A227]/35 bg-[#0B0E0C] text-[#F7F5EE] hover:border-[#E8C96A] hover:text-[#E8C96A] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Centered 3D-style swipeable portrait stage */}
      <div
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          touchStartX.current = null;
          if (Math.abs(dx) > 38) {
            if (dx < 0) next();
            else prev();
          }
        }}
        className="relative flex items-center justify-center min-h-[290px] sm:min-h-[340px] overflow-hidden rounded-3xl emerald-sanctuary-surface px-4 py-6"
      >
        <KanoteCorner position="tl" className="absolute top-2.5 left-2.5 w-11 h-11 opacity-75" />
        <KanoteCorner position="tr" className="absolute top-2.5 right-2.5 w-11 h-11 opacity-75" />
        <KanoteCorner position="bl" className="absolute bottom-2.5 left-2.5 w-11 h-11 opacity-75" />
        <KanoteCorner position="br" className="absolute bottom-2.5 right-2.5 w-11 h-11 opacity-75" />

        <div className="relative flex items-center justify-center w-full max-w-3xl h-[245px] sm:h-[285px]">
          {monks.map((monk, idx) => {
            const offset = getRelativeOffset(idx);
            const isCenter = offset === 0;
            const isVisible = Math.abs(offset) <= 1 || monks.length <= 3;

            if (!isVisible) return null;

            const translateX = offset * 150;
            const scale = isCenter ? 1 : 0.76;
            const zIndex = isCenter ? 20 : 10 - Math.abs(offset);
            const opacity = isCenter ? 1 : 0.58;

            return (
              <button
                key={monk.id}
                type="button"
                onClick={() => {
                  if (isCenter) {
                    onSelectMonk(monk);
                  } else {
                    setActiveIndex(idx);
                  }
                }}
                style={{
                  transform: `translateX(${translateX}px) scale(${scale})`,
                  zIndex,
                  opacity,
                }}
                className="absolute flex flex-col items-center transition-all duration-300 ease-out focus:outline-none group"
              >
                <div
                  className={`relative rounded-[26px] p-[3px] transition-all duration-300 ${
                    isCenter
                      ? 'w-40 h-52 sm:w-48 sm:h-60 bg-gradient-to-b from-[#E8C96A] via-[#C9A227] to-[#7B5D10] shadow-[0_18px_45px_rgba(201,162,39,0.28)]'
                      : 'w-36 h-48 sm:w-44 sm:h-56 bg-gradient-to-b from-[#C9A227]/60 to-[#063B2B] border border-[#C9A227]/30'
                  }`}
                >
                  <div className="relative w-full h-full rounded-[23px] overflow-hidden bg-[#050505]">
                    <SafeArtwork
                      src={monk.portraitUrl}
                      alt={monk.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      fallbackTitle={monk.name}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />
                  </div>
                </div>

                <div className={`mt-2.5 text-center max-w-[200px] sm:max-w-[240px] ${isCenter ? 'opacity-100' : 'opacity-70'}`}>
                  <p className="text-sm sm:text-base font-semibold text-[#F7F5EE] font-myanmar truncate">
                    {monk.name}
                  </p>
                  {isCenter && (
                    <p className="text-[11px] text-[#E8C96A]/90 truncate mt-0.5">
                      {monk.title}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pagination dots */}
      {monks.length > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {monks.map((m, idx) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Select ${m.name}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === safeIndex ? 'w-7 bg-[#E8C96A]' : 'w-2 bg-[#C9A227]/30 hover:bg-[#C9A227]/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function MonkProfileView({
  monk,
  mp3,
  mp4,
  podcasts,
  texts,
  onBack,
  onOpenItem,
}: {
  monk: Monk;
  mp3: DhammaAudio[];
  mp4: DhammaVideo[];
  podcasts: DhammaPodcast[];
  texts: DhammaText[];
  onBack: () => void;
  onOpenItem: (item: AnyDhammaItem) => void;
}) {
  const monkMp3 = mp3.filter((i) => i.monkId === monk.id);
  const monkMp4 = mp4.filter((i) => i.monkId === monk.id);
  const monkPod = podcasts.filter((i) => i.monkId === monk.id);
  const monkTexts = texts.filter((i) => i.monkId === monk.id);
  const allItems: AnyDhammaItem[] = [...monkMp3, ...monkMp4, ...monkPod, ...monkTexts];

  return (
    <div className="space-y-6 pb-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-[#C9A227]/30 bg-[#0B0E0C] text-sm text-[#F7F5EE] hover:border-[#E8C96A] transition-colors"
      >
        <ArrowLeft className="w-4 h-4 text-[#E8C96A]" />
        <span>နောက်သို့ (Back)</span>
      </button>

      <div className="relative rounded-3xl emerald-sanctuary-surface p-6 sm:p-8 overflow-hidden">
        <KanoteCorner position="tl" className="absolute top-3 left-3 w-12 h-12 opacity-75" />
        <KanoteCorner position="tr" className="absolute top-3 right-3 w-12 h-12 opacity-75" />

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-36 h-48 sm:w-44 sm:h-56 shrink-0 rounded-2xl p-[3px] bg-gradient-to-b from-[#E8C96A] via-[#C9A227] to-[#7B5D10] shadow-[0_14px_35px_rgba(201,162,39,0.22)]">
            <div className="w-full h-full rounded-[13px] overflow-hidden bg-[#050505]">
              <SafeArtwork
                src={monk.portraitUrl}
                alt={monk.name}
                className="w-full h-full object-cover"
                fallbackTitle={monk.name}
              />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <p className="text-xs text-[#E8C96A] tracking-wide font-myanmar">{monk.title}</p>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#F7F5EE] font-myanmar">
              {monk.name}
            </h1>
            {monk.monastery && (
              <p className="mt-1 text-sm text-[#A8A393] font-myanmar">{monk.monastery}</p>
            )}
            <KanoteDivider className="my-4 max-w-sm mx-auto sm:mx-0" />
            <p className="text-sm sm:text-base text-[#F7F5EE]/90 leading-relaxed font-myanmar">
              {monk.bio}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#A8A393] tabular-nums">
              <span>{monkMp3.length} MP3</span>
              <span aria-hidden="true">·</span>
              <span>{monkMp4.length} MP4</span>
              <span aria-hidden="true">·</span>
              <span>{monkPod.length} Podcasts</span>
              <span aria-hidden="true">·</span>
              <span>{monkTexts.length} Dhamma Texts</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar mb-3">
          ဟောကြားရေးသားတော်မူသော တရားတော်များ
        </h2>
        {allItems.length === 0 ? (
          <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
            No published teachings assigned to this Sayadaw yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {allItems.map((item) => {
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
                  onClick={() => onOpenItem(item)}
                  className="dhamma-card rounded-2xl p-3.5 flex items-center gap-3.5 text-left transition-colors"
                >
                  <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden border border-[#C9A227]/30">
                    <SafeArtwork src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-[#E8C96A] uppercase tracking-wider">
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.type}</span>
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#A8A393] line-clamp-1 font-myanmar">
                      {item.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
