import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Disc3,
  Headphones,
  Home,
  Play,
  Search,
  Shield,
  User,
  Video,
  WifiOff,
} from 'lucide-react';
import type {
  AnyDhammaItem,
  AppNotification,
  AppSettings,
  BootstrapPayload,
  DhammaAudio,
  DhammaPodcast,
  DhammaText,
  DhammaVideo,
  Monk,
  OfflineRecord,
  PlaybackProgress,
} from './types';
import {
  contentKey,
  deleteDownloadByKey,
  downloadContentItem,
  formatDuration,
  getAllDownloads,
  getAllProgress,
  getAnonUid,
  getBookmarks,
  getFavorites,
  getNotificationsEnabled,
  getProgressForKey,
  getReadNotificationIds,
  loadBootstrapSnapshot,
  markAllNotificationsRead,
  saveBootstrapSnapshot,
  savePlaybackProgress,
  setNotificationsEnabled,
  toggleBookmarkId,
  toggleFavoriteKey,
} from './lib/offlineDb';
import { KanoteDivider, SafeArtwork } from './components/KanoteOrnaments';
import { SplashScreen } from './components/SplashScreen';
import { MonkCarousel, MonkProfileView } from './components/MonkCarousel';
import { DhammaContentCard } from './components/MediaCards';
import { AudioFullPlayerModal, AudioMiniPlayer, type PlayableAudio } from './components/AudioPlayerSheet';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { TextReaderModal } from './components/TextReaderModal';
import { GlobalSearchModal, NotificationsDrawer } from './components/SearchAndNotifications';
import { MyLibraryView } from './components/MyLibraryView';
import { AdminDashboard, AdminLoginModal } from './components/AdminDashboard';
import { adminFetch, setAdminToken } from './lib/adminAuth';
import { resolveApiUrl } from './lib/apiUrl';
import { syncNativeBackgroundAudio } from './lib/backgroundAudio';

type NavTab = 'home' | 'mp3' | 'mp4' | 'podcast' | 'library';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'ဓမ္မရောင်ခြည်',
  subtitle: 'Dhamma Yway Gyi · Sacred Multimedia Sanctuary',
  logoUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
  splashArtworkUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
  autoNotifyOnUpload: true,
  updatedAt: '',
};

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedMonk, setSelectedMonk] = useState<Monk | null>(null);
  const [showAdminView, setShowAdminView] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  // Network & Offline state
  const [browserOffline, setBrowserOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [serverUnreachable, setServerUnreachable] = useState(false);
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const isOffline = browserOffline || serverUnreachable || simulatedOffline;

  // Core data
  const [loading, setLoading] = useState(true);
  const [monks, setMonks] = useState<Monk[]>([]);
  const [mp3List, setMp3List] = useState<DhammaAudio[]>([]);
  const [mp4List, setMp4List] = useState<DhammaVideo[]>([]);
  const [podcastList, setPodcastList] = useState<DhammaPodcast[]>([]);
  const [textList, setTextList] = useState<DhammaText[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // User local & anonymous state
  const [anonUid] = useState<string>(() => getAnonUid());
  const [likedKeys, setLikedKeys] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<string[]>(() => getFavorites());
  const [bookmarks, setBookmarks] = useState<string[]>(() => getBookmarks());
  const [progressList, setProgressList] = useState<PlaybackProgress[]>(() => getAllProgress());
  const [downloads, setDownloads] = useState<OfflineRecord[]>([]);
  const [downloadProgressMap, setDownloadProgressMap] = useState<Record<string, number>>({});
  const [blobUrls, setBlobUrls] = useState<Record<string, { media?: string; cover?: string }>>({});

  // Modals / Overlays
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationsEnabled, setNotifEnabledState] = useState<boolean>(() => getNotificationsEnabled());
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => getReadNotificationIds());
  const [activeVideo, setActiveVideo] = useState<DhammaVideo | null>(null);
  const [activeArticle, setActiveArticle] = useState<DhammaText | null>(null);
  const [articleFilter, setArticleFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrack, setCurrentTrack] = useState<PlayableAudio | null>(null);
  const [fullAudioOpen, setFullAudioOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [shuffle, setShuffle] = useState(false);
  const [sleepTimerSeconds, setSleepTimerSeconds] = useState<number | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const applyBootstrap = useCallback((data: BootstrapPayload) => {
    setMonks(data.monks || []);
    setMp3List(data.mp3 || []);
    setMp4List(data.mp4 || []);
    setPodcastList(data.podcasts || []);
    setTextList(data.texts || []);
    setNotifications(data.notifications || []);
    if (data.settings) setSettings(data.settings);
    if (Array.isArray(data.likedKeys)) setLikedKeys(new Set(data.likedKeys));
  }, []);

  const refreshDownloads = useCallback(async () => {
    const records = await getAllDownloads();
    setDownloads(records);
  }, []);

  // Build & clean up ObjectURLs for offline downloaded media & covers
  useEffect(() => {
    const created: string[] = [];
    const nextMap: Record<string, { media?: string; cover?: string }> = {};
    for (const rec of downloads) {
      const entry: { media?: string; cover?: string } = {};
      if (rec.mediaBlob) {
        const u = URL.createObjectURL(rec.mediaBlob);
        entry.media = u;
        created.push(u);
      }
      if (rec.coverBlob) {
        const c = URL.createObjectURL(rec.coverBlob);
        entry.cover = c;
        created.push(c);
      }
      nextMap[rec.key] = entry;
    }
    setBlobUrls(nextMap);
    return () => {
      created.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [downloads]);

  const fetchBootstrap = useCallback(async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setServerUnreachable(true);
      const snap = loadBootstrapSnapshot();
      if (snap) applyBootstrap(snap);
      setLoading(false);
      return false;
    }
    try {
      const res = await fetch(resolveApiUrl('/api/bootstrap'), {
        headers: { 'x-anon-uid': anonUid },
      });
      if (!res.ok) throw new Error('Bootstrap failed');
      const data = (await res.json()) as BootstrapPayload;
      applyBootstrap(data);
      saveBootstrapSnapshot(data);
      setServerUnreachable(false);

      const sessRes = await adminFetch('/api/admin/session');
      if (sessRes.ok) {
        const sess = (await sessRes.json()) as { authenticated?: boolean };
        setIsAdminAuth(Boolean(sess.authenticated));
        if (!sess.authenticated) setAdminToken(null);
      }
      setLoading(false);
      return true;
    } catch {
      setServerUnreachable(true);
      const snap = loadBootstrapSnapshot();
      if (snap) applyBootstrap(snap);
      setLoading(false);
      return false;
    }
  }, [anonUid, applyBootstrap]);

  // Initial load & online/offline listeners
  useEffect(() => {
    refreshDownloads();
    fetchBootstrap();

    const onOnline = () => {
      setBrowserOffline(false);
      fetchBootstrap();
    };
    const onOffline = () => {
      setBrowserOffline(true);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [fetchBootstrap, refreshDownloads]);

  const retryConnection = useCallback(async (): Promise<boolean> => {
    setSimulatedOffline(false);
    setBrowserOffline(typeof navigator !== 'undefined' ? !navigator.onLine : false);
    try {
      const res = await fetch(resolveApiUrl('/api/health'), { cache: 'no-store' });
      if (!res.ok) throw new Error('Offline');
      setServerUnreachable(false);
      await fetchBootstrap();
      return true;
    } catch {
      setServerUnreachable(true);
      return false;
    }
  }, [fetchBootstrap]);

  const downloadedMap = useMemo(() => new Map(downloads.map((d) => [d.key, d])), [downloads]);
  const downloadedKeys = useMemo(() => new Set(downloads.map((d) => d.key)), [downloads]);
  const allItems: AnyDhammaItem[] = useMemo(
    () => [...mp3List, ...mp4List, ...podcastList, ...textList],
    [mp3List, mp4List, podcastList, textList]
  );

  // Merge offline-only downloaded items in case snapshot was cleared
  const offlineFallbackItems = useMemo(() => {
    const known = new Set(allItems.map((i) => contentKey(i.type, i.id)));
    return downloads.filter((d) => !known.has(d.key)).map((d) => d.item);
  }, [allItems, downloads]);

  const combinedItems = useMemo(
    () => [...allItems, ...offlineFallbackItems],
    [allItems, offlineFallbackItems]
  );

  const mostLikedItems = useMemo(
    () => [...combinedItems].sort((a, b) => b.likesCount - a.likesCount).slice(0, 6),
    [combinedItems]
  );

  const audioQueue: PlayableAudio[] = useMemo(() => {
    if (!currentTrack) return [...mp3List, ...podcastList];
    return currentTrack.type === 'podcast' ? podcastList : mp3List;
  }, [currentTrack, mp3List, podcastList]);

  const playAudioTrack = useCallback(
    (track: PlayableAudio, openSheet = true) => {
      const key = contentKey(track.type, track.id);
      const isDown = downloadedKeys.has(key);
      if (isOffline && !isDown) {
        showToast('This audio requires Internet. Only downloaded items play offline.');
        return;
      }

      // Pause any active video
      setActiveVideo(null);
      setCurrentTrack(track);
      if (openSheet) setFullAudioOpen(true);

      const saved = getProgressForKey(key);
      requestAnimationFrame(() => {
        const el = audioRef.current;
        if (!el) return;
        const offlineSrc = blobUrls[key]?.media;
        const nextSrc = offlineSrc || resolveApiUrl(track.mediaUrl);
        if (el.src !== new URL(nextSrc, window.location.origin).href && !nextSrc.startsWith('blob:')) {
          el.src = nextSrc;
        } else if (nextSrc.startsWith('blob:') && el.src !== nextSrc) {
          el.src = nextSrc;
        }
        el.playbackRate = playbackRate;
        if (saved && saved.positionSeconds > 1 && saved.positionSeconds < (track.durationSeconds || 9999) - 1) {
          el.currentTime = saved.positionSeconds;
        }
        el.play().catch(() => {});
      });
    },
    [blobUrls, downloadedKeys, isOffline, playbackRate, showToast]
  );

  const handleOpenItem = useCallback(
    (item: AnyDhammaItem) => {
      const key = contentKey(item.type, item.id);
      const isDown = downloadedKeys.has(key);
      if (isOffline && !isDown) {
        showToast('Offline mode: Please download content while online to access without Internet.');
        return;
      }
      if (item.type === 'mp3' || item.type === 'podcast') {
        playAudioTrack(item, true);
      } else if (item.type === 'mp4') {
        audioRef.current?.pause();
        setActiveVideo(item);
      } else if (item.type === 'text') {
        setActiveArticle(item);
      }
    },
    [downloadedKeys, isOffline, playAudioTrack, showToast]
  );

  const handleTogglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    if (el.paused) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [currentTrack]);

  const handleNextTrack = useCallback(() => {
    if (!currentTrack || audioQueue.length === 0) return;
    if (shuffle && audioQueue.length > 1) {
      const others = audioQueue.filter((t) => t.id !== currentTrack.id);
      const pick = others[Math.floor(Math.random() * others.length)];
      if (pick) playAudioTrack(pick, false);
      return;
    }
    const idx = audioQueue.findIndex((t) => t.id === currentTrack.id);
    const nextIdx = (idx + 1) % audioQueue.length;
    playAudioTrack(audioQueue[nextIdx], false);
  }, [audioQueue, currentTrack, playAudioTrack, shuffle]);

  const handlePrevTrack = useCallback(() => {
    if (!currentTrack || audioQueue.length === 0) return;
    if (audioTime > 3 && audioRef.current) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = audioQueue.findIndex((t) => t.id === currentTrack.id);
    const prevIdx = (idx - 1 + audioQueue.length) % audioQueue.length;
    playAudioTrack(audioQueue[prevIdx], false);
  }, [audioQueue, audioTime, currentTrack, playAudioTrack]);

  // Keep audio playbackRate synced
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Sleep Timer countdown
  useEffect(() => {
    if (sleepTimerSeconds === null) return;
    if (sleepTimerSeconds <= 0) {
      audioRef.current?.pause();
      setSleepTimerSeconds(null);
      showToast('Sleep timer ended · Audio paused');
      return;
    }
    const id = setInterval(() => {
      setSleepTimerSeconds((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [sleepTimerSeconds, showToast]);

  // Background / Lockscreen Media Session API + Android Native Foreground Service
  useEffect(() => {
    if (!currentTrack) {
      void syncNativeBackgroundAudio(false);
      return;
    }
    void syncNativeBackgroundAudio(
      true,
      currentTrack.title,
      currentTrack.monkName,
      audioPlaying
    );

    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const key = contentKey(currentTrack.type, currentTrack.id);
    const art = blobUrls[key]?.cover || resolveApiUrl(currentTrack.coverUrl);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.monkName,
      album: settings.appName,
      artwork: art ? [{ src: art, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.playbackState = audioPlaying ? 'playing' : 'paused';
    navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
    navigator.mediaSession.setActionHandler('previoustrack', handlePrevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', handleNextTrack);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && audioRef.current) {
        audioRef.current.currentTime = details.seekTime;
      }
    });
  }, [audioPlaying, blobUrls, currentTrack, handleNextTrack, handlePrevTrack, settings.appName]);

  const handleToggleLike = async (item: AnyDhammaItem) => {
    if (isOffline) {
      showToast('Connect to Internet to send or update Likes.');
      return;
    }
    const key = contentKey(item.type, item.id);
    try {
      const res = await fetch(resolveApiUrl('/api/likes/toggle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: item.type,
          contentId: item.id,
          anonUid,
        }),
      });
      if (!res.ok) throw new Error('Like failed');
      const data = (await res.json()) as { liked: boolean; likesCount: number };
      setLikedKeys((prev) => {
        const next = new Set(prev);
        if (data.liked) next.add(key);
        else next.delete(key);
        return next;
      });
      const updateList = <T extends AnyDhammaItem>(arr: T[]) =>
        arr.map((x) => (x.id === item.id ? { ...x, likesCount: data.likesCount } : x));
      if (item.type === 'mp3') setMp3List((p) => updateList(p));
      if (item.type === 'mp4') setMp4List((p) => updateList(p));
      if (item.type === 'podcast') setPodcastList((p) => updateList(p));
      if (item.type === 'text') setTextList((p) => updateList(p));
      if (currentTrack && currentTrack.id === item.id && currentTrack.type === item.type) {
        setCurrentTrack((prev) => (prev ? { ...prev, likesCount: data.likesCount } : prev));
      }
      if (activeVideo && activeVideo.id === item.id) {
        setActiveVideo((prev) => (prev ? { ...prev, likesCount: data.likesCount } : prev));
      }
      if (activeArticle && activeArticle.id === item.id) {
        setActiveArticle((prev) => (prev ? { ...prev, likesCount: data.likesCount } : prev));
      }
    } catch {
      showToast('Unable to update Like right now.');
    }
  };

  const handleToggleFavorite = (item: AnyDhammaItem) => {
    const key = contentKey(item.type, item.id);
    const next = toggleFavoriteKey(key);
    setFavorites(next);
    showToast(next.includes(key) ? 'Saved to Favorites' : 'Removed from Favorites');
  };

  const handleDownload = async (item: AnyDhammaItem) => {
    if (isOffline) {
      showToast('Internet connection is required to download new files.');
      return;
    }
    const key = contentKey(item.type, item.id);
    setDownloadProgressMap((p) => ({ ...p, [key]: 1 }));
    try {
      await downloadContentItem(item, (pct) => {
        setDownloadProgressMap((p) => ({ ...p, [key]: pct }));
      });
      await refreshDownloads();
      showToast(`Saved "${item.title}" for Offline mode`);
    } catch {
      showToast('Download failed. Please check connection.');
    } finally {
      setDownloadProgressMap((p) => {
        const copy = { ...p };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleDeleteDownload = async (key: string) => {
    await deleteDownloadByKey(key);
    await refreshDownloads();
    showToast('Removed offline file');
  };

  const unreadNotifCount = useMemo(() => {
    if (!notificationsEnabled) return 0;
    return notifications.filter((n) => !readNotifIds.includes(n.id)).length;
  }, [notifications, notificationsEnabled, readNotifIds]);

  const openAdminEntry = () => {
    if (isAdminAuth) {
      setShowAdminView(true);
    } else {
      setShowAdminLogin(true);
    }
  };

  const renderContentGrid = (items: AnyDhammaItem[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {items.map((item) => {
        const key = contentKey(item.type, item.id);
        return (
          <DhammaContentCard
            key={key}
            item={item}
            isPlaying={
              audioPlaying &&
              currentTrack?.id === item.id &&
              currentTrack?.type === item.type
            }
            isLiked={likedKeys.has(key)}
            isFavorite={favorites.includes(key)}
            isDownloaded={downloadedKeys.has(key)}
            downloadProgress={downloadProgressMap[key]}
            isOffline={isOffline}
            coverOverrideUrl={blobUrls[key]?.cover}
            onPlayOrOpen={handleOpenItem}
            onToggleLike={handleToggleLike}
            onToggleFavorite={handleToggleFavorite}
            onDownload={handleDownload}
          />
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#F7F5EE] flex flex-col">
      {showSplash && (
        <SplashScreen
          appName={settings.appName}
          subtitle={settings.subtitle}
          artworkUrl={settings.splashArtworkUrl}
          onDone={() => setShowSplash(false)}
        />
      )}

      {/* Hidden Persistent HTML5 Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onPlay={() => setAudioPlaying(true)}
        onPause={() => {
          setAudioPlaying(false);
          if (currentTrack && audioRef.current) {
            setProgressList(
              savePlaybackProgress({
                key: contentKey(currentTrack.type, currentTrack.id),
                type: currentTrack.type,
                id: currentTrack.id,
                title: currentTrack.title,
                monkName: currentTrack.monkName,
                coverUrl: currentTrack.coverUrl,
                positionSeconds: audioRef.current.currentTime,
                durationSeconds: audioRef.current.duration || currentTrack.durationSeconds,
              })
            );
          }
        }}
        onLoadedMetadata={(e) => {
          setAudioDuration(e.currentTarget.duration || currentTrack?.durationSeconds || 0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          setAudioTime(el.currentTime);
          if (currentTrack && Math.floor(el.currentTime) % 2 === 0) {
            setProgressList(
              savePlaybackProgress({
                key: contentKey(currentTrack.type, currentTrack.id),
                type: currentTrack.type,
                id: currentTrack.id,
                title: currentTrack.title,
                monkName: currentTrack.monkName,
                coverUrl: currentTrack.coverUrl,
                positionSeconds: el.currentTime,
                durationSeconds: el.duration || currentTrack.durationSeconds,
              })
            );
          }
        }}
        onEnded={() => {
          if (repeatMode === 'one' && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
            return;
          }
          if (repeatMode === 'all' || audioQueue.length > 1) {
            handleNextTrack();
          } else {
            setAudioPlaying(false);
          }
        }}
      />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 bg-[#050505]/90 backdrop-blur-xl border-b border-[#C9A227]/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Brand Zone */}
          <button
            type="button"
            onClick={() => {
              setSelectedMonk(null);
              setShowAdminView(false);
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl p-[1.5px] bg-gradient-to-br from-[#E8C96A] to-[#8C6D16]">
              <div className="w-full h-full rounded-[10px] overflow-hidden bg-[#050505]">
                <SafeArtwork src={settings.logoUrl} alt={settings.appName} className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-base sm:text-lg font-bold text-[#F7F5EE] font-myanmar whitespace-nowrap">
              {settings.appName}
            </span>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
            {(
              [
                ['home', 'ပင်မ'],
                ['mp3', 'MP3'],
                ['mp4', 'MP4'],
                ['podcast', 'Podcast'],
                ['library', 'ကျွန်ုပ်'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelectedMonk(null);
                  setShowAdminView(false);
                  setActiveTab(id);
                }}
                className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors font-myanmar ${
                  !showAdminView && !selectedMonk && activeTab === id
                    ? 'border-[#E8C96A] text-[#E8C96A]'
                    : 'border-transparent text-[#A8A393] hover:text-[#F7F5EE]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {/* Right Action Icons: Search, Notification, Admin */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              aria-label="Global Search"
              className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#F7F5EE] hover:text-[#E8C96A] transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowNotifications(true);
                setReadNotifIds(markAllNotificationsRead(notifications.map((n) => n.id)));
              }}
              aria-label="Notifications"
              className="relative min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-[#F7F5EE] hover:text-[#E8C96A] transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#E8C96A]" />
              )}
            </button>

            <button
              type="button"
              onClick={openAdminEntry}
              aria-label="Admin Login or Dashboard"
              title={isAdminAuth ? 'Admin Dashboard' : 'Owner Admin Login'}
              className={`min-h-[44px] px-2.5 sm:px-3 rounded-xl border inline-flex items-center gap-1.5 text-xs transition-colors ${
                showAdminView || isAdminAuth
                  ? 'border-[#E8C96A] bg-[#C9A227]/15 text-[#E8C96A]'
                  : 'border-[#C9A227]/30 text-[#F7F5EE] hover:border-[#E8C96A]'
              }`}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{isAdminAuth ? 'Admin' : 'Owner'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* OFFLINE STATUS BANNER (Non-blocking for user offline playback!) */}
      {isOffline && !showAdminView && (
        <div className="bg-amber-950/55 border-b border-amber-400/35 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                Offline Mode · Downloaded MP3, MP4, Podcasts, Dhamma Texts & Favorites remain available without Internet.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('library')}
              className="text-[#E8C96A] underline underline-offset-2 font-medium"
            >
              Open Downloads ({downloads.length})
            </button>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 pb-36 lg:pb-24">
        {loading && monks.length === 0 ? (
          <div className="py-20 text-center text-sm text-[#A8A393]">
            Loading Dhamma Sanctuary...
          </div>
        ) : showAdminView && isAdminAuth ? (
          <AdminDashboard
            monks={monks}
            mp3={mp3List}
            mp4={mp4List}
            podcasts={podcastList}
            texts={textList}
            notifications={notifications}
            settings={settings}
            isOffline={isOffline}
            onRetryConnection={retryConnection}
            onRefreshData={async () => {
              await fetchBootstrap();
            }}
            onBack={() => setShowAdminView(false)}
            onSessionExpired={() => {
              setIsAdminAuth(false);
              setShowAdminView(false);
              setShowAdminLogin(true);
              showToast('Session expired. Please sign in as Owner Admin.');
            }}
            onLogout={async () => {
              await adminFetch('/api/admin/logout', { method: 'POST' });
              setAdminToken(null);
              setIsAdminAuth(false);
              setShowAdminView(false);
              showToast('Admin signed out');
            }}
          />
        ) : selectedMonk ? (
          <MonkProfileView
            monk={selectedMonk}
            mp3={mp3List}
            mp4={mp4List}
            podcasts={podcastList}
            texts={textList}
            onBack={() => setSelectedMonk(null)}
            onOpenItem={handleOpenItem}
          />
        ) : activeTab === 'home' ? (
          <div className="space-y-9">
            {/* 1. Monk Portrait Carousel */}
            <MonkCarousel monks={monks} onSelectMonk={setSelectedMonk} />

            {/* 7/2. Continue Listening / Watching */}
            {progressList.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar">
                    ဆက်လက်နာယူရန် (Continue)
                  </h2>
                </div>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                  {progressList.slice(0, 6).map((p) => {
                    const match =
                      combinedItems.find((i) => contentKey(i.type, i.id) === p.key);
                    if (!match) return null;
                    const pct =
                      p.durationSeconds > 0
                        ? Math.min(100, Math.round((p.positionSeconds / p.durationSeconds) * 100))
                        : 0;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handleOpenItem(match)}
                        className="w-72 shrink-0 dhamma-card rounded-2xl p-3 flex items-center gap-3 text-left"
                      >
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#C9A227]/35 shrink-0">
                          <SafeArtwork src={blobUrls[p.key]?.cover || p.coverUrl} alt={p.title} className="w-full h-full object-cover" />
                          <span className="absolute inset-0 bg-black/35 flex items-center justify-center">
                            <Play className="w-4 h-4 text-[#E8C96A] fill-[#E8C96A]" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-[#E8C96A] uppercase tabular-nums">
                            {p.type} · {formatDuration(p.positionSeconds)}
                          </p>
                          <p className="text-xs sm:text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">
                            {p.title}
                          </p>
                          <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                            <div className="h-full bg-[#E8C96A]" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <KanoteDivider />

            {/* 2. Latest MP3 Dhamma Talks */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar">
                    နောက်ဆုံးရ MP3 တရားတော်များ
                  </h2>
                  <p className="text-xs text-[#A8A393]">Latest Audio Dhamma Discourses</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('mp3')}
                  className="text-xs text-[#E8C96A] hover:underline whitespace-nowrap"
                >
                  View all
                </button>
              </div>
              {renderContentGrid(mp3List.slice(0, 3))}
            </section>

            {/* 3. Latest MP4 Videos */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar">
                    MP4 ဗီဒီယို တရားတော်များ
                  </h2>
                  <p className="text-xs text-[#A8A393]">Latest Video Discourses</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('mp4')}
                  className="text-xs text-[#E8C96A] hover:underline whitespace-nowrap"
                >
                  View all
                </button>
              </div>
              {renderContentGrid(mp4List.slice(0, 3))}
            </section>

            {/* 4. Most-Liked Dhamma Talks */}
            <section className="space-y-3.5">
              <div>
                <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar">
                  နှစ်သက်မှုအများဆုံး တရားတော်များ
                </h2>
                <p className="text-xs text-[#A8A393]">Most-Liked Dhamma Teachings</p>
              </div>
              {renderContentGrid(mostLikedItems.slice(0, 3))}
            </section>

            {/* 5. Podcasts */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar">
                    ဓမ္မ Podcast အစီအစဉ်များ
                  </h2>
                  <p className="text-xs text-[#A8A393]">Audio Reflections & Study Episodes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('podcast')}
                  className="text-xs text-[#E8C96A] hover:underline whitespace-nowrap"
                >
                  View all
                </button>
              </div>
              {renderContentGrid(podcastList.slice(0, 3))}
            </section>

            {/* 6. Dhamma Articles */}
            <section className="space-y-3.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-[#F7F5EE] font-myanmar">
                    ဓမ္မစာပေနှင့် ဆောင်းပါးများ
                  </h2>
                  <p className="text-xs text-[#A8A393]">Written Dhamma Texts & Reflections</p>
                </div>
                <input
                  type="text"
                  value={articleFilter}
                  onChange={(e) => setArticleFilter(e.target.value)}
                  placeholder="စာပေခေါင်းစဉ် ရှာရန်..."
                  className="min-h-[38px] px-3 rounded-xl bg-[#0B0E0C] border border-[#C9A227]/30 text-xs text-[#F7F5EE] placeholder:text-[#A8A393] font-myanmar focus:outline-none focus:border-[#E8C96A]"
                />
              </div>
              {renderContentGrid(
                textList.filter(
                  (t) =>
                    !articleFilter.trim() ||
                    t.title.toLowerCase().includes(articleFilter.trim().toLowerCase()) ||
                    t.monkName.toLowerCase().includes(articleFilter.trim().toLowerCase())
                )
              )}
            </section>
          </div>
        ) : activeTab === 'mp3' ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-[#F7F5EE] font-myanmar">MP3 တရားတော်များ</h1>
              <p className="text-xs text-[#A8A393] mt-0.5">
                Unified Audio Library · Background & Lockscreen Playback Ready
              </p>
            </div>
            {mp3List.length === 0 ? (
              <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
                No MP3 talks published yet.
              </div>
            ) : (
              renderContentGrid(mp3List)
            )}
          </div>
        ) : activeTab === 'mp4' ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-[#F7F5EE] font-myanmar">MP4 ဗီဒီယို တရားတော်များ</h1>
              <p className="text-xs text-[#A8A393] mt-0.5">
                High-Definition Video Discourses with Subtitles & Offline Save
              </p>
            </div>
            {mp4List.length === 0 ? (
              <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
                No MP4 videos published yet.
              </div>
            ) : (
              renderContentGrid(mp4List)
            )}
          </div>
        ) : activeTab === 'podcast' ? (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-[#F7F5EE] font-myanmar">ဓမ္မ Podcast များ</h1>
              <p className="text-xs text-[#A8A393] mt-0.5">
                Guided Meditation & Abhidhamma Discussions
              </p>
            </div>
            {podcastList.length === 0 ? (
              <div className="dhamma-card rounded-2xl p-8 text-center text-sm text-[#A8A393]">
                No Podcast episodes published yet.
              </div>
            ) : (
              renderContentGrid(podcastList)
            )}
          </div>
        ) : (
          <MyLibraryView
            downloads={downloads}
            favorites={favorites}
            allItems={allItems}
            progressList={progressList}
            isOffline={isOffline}
            simulatedOffline={simulatedOffline}
            notificationsEnabled={notificationsEnabled}
            isAdminAuthenticated={isAdminAuth}
            onToggleSimulatedOffline={() => setSimulatedOffline((s) => !s)}
            onToggleNotifications={() => {
              const next = !notificationsEnabled;
              setNotifEnabledState(next);
              setNotificationsEnabled(next);
            }}
            onOpenItem={handleOpenItem}
            onDeleteDownload={handleDeleteDownload}
            onRemoveFavorite={(key) => {
              const next = toggleFavoriteKey(key);
              setFavorites(next);
            }}
            onOpenAdmin={openAdminEntry}
          />
        )}
      </main>

      {/* PERSISTENT MINI PLAYER */}
      {currentTrack && !fullAudioOpen && (
        <AudioMiniPlayer
          track={currentTrack}
          coverUrl={blobUrls[contentKey(currentTrack.type, currentTrack.id)]?.cover}
          isPlaying={audioPlaying}
          currentTime={audioTime}
          duration={audioDuration || currentTrack.durationSeconds}
          onTogglePlay={handleTogglePlay}
          onOpenFull={() => setFullAudioOpen(true)}
          onClose={() => {
            audioRef.current?.pause();
            setCurrentTrack(null);
          }}
        />
      )}

      {/* FULL SCREEN AUDIO PLAYER */}
      {currentTrack && fullAudioOpen && (
        <AudioFullPlayerModal
          track={currentTrack}
          coverUrl={blobUrls[contentKey(currentTrack.type, currentTrack.id)]?.cover}
          isPlaying={audioPlaying}
          currentTime={audioTime}
          duration={audioDuration || currentTrack.durationSeconds}
          playbackRate={playbackRate}
          repeatMode={repeatMode}
          shuffle={shuffle}
          sleepTimerSeconds={sleepTimerSeconds}
          isLiked={likedKeys.has(contentKey(currentTrack.type, currentTrack.id))}
          isFavorite={favorites.includes(contentKey(currentTrack.type, currentTrack.id))}
          isDownloaded={downloadedKeys.has(contentKey(currentTrack.type, currentTrack.id))}
          downloadProgress={downloadProgressMap[contentKey(currentTrack.type, currentTrack.id)]}
          isOffline={isOffline}
          onClose={() => setFullAudioOpen(false)}
          onTogglePlay={handleTogglePlay}
          onSeek={(sec) => {
            setAudioTime(sec);
            if (audioRef.current) audioRef.current.currentTime = sec;
          }}
          onPrev={handlePrevTrack}
          onNext={handleNextTrack}
          onChangeRate={setPlaybackRate}
          onCycleRepeat={() =>
            setRepeatMode((m) => (m === 'off' ? 'all' : m === 'all' ? 'one' : 'off'))
          }
          onToggleShuffle={() => setShuffle((s) => !s)}
          onSetSleepTimer={(min) => setSleepTimerSeconds(min ? min * 60 : null)}
          onToggleLike={() => handleToggleLike(currentTrack)}
          onToggleFavorite={() => handleToggleFavorite(currentTrack)}
          onDownload={() => handleDownload(currentTrack)}
        />
      )}

      {/* MP4 VIDEO PLAYER MODAL */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          offlineMediaUrl={blobUrls[contentKey('mp4', activeVideo.id)]?.media}
          offlineSubtitleText={downloadedMap.get(contentKey('mp4', activeVideo.id))?.subtitleText}
          isLiked={likedKeys.has(contentKey('mp4', activeVideo.id))}
          isFavorite={favorites.includes(contentKey('mp4', activeVideo.id))}
          isDownloaded={downloadedKeys.has(contentKey('mp4', activeVideo.id))}
          downloadProgress={downloadProgressMap[contentKey('mp4', activeVideo.id)]}
          isOffline={isOffline}
          onClose={() => setActiveVideo(null)}
          onToggleLike={() => handleToggleLike(activeVideo)}
          onToggleFavorite={() => handleToggleFavorite(activeVideo)}
          onDownload={() => handleDownload(activeVideo)}
          onProgressSaved={() => setProgressList(getAllProgress())}
        />
      )}

      {/* DHAMMA TEXT READER MODAL */}
      {activeArticle && (
        <TextReaderModal
          article={activeArticle}
          coverUrl={blobUrls[contentKey('text', activeArticle.id)]?.cover}
          isLiked={likedKeys.has(contentKey('text', activeArticle.id))}
          isFavorite={favorites.includes(contentKey('text', activeArticle.id))}
          isBookmarked={bookmarks.includes(activeArticle.id)}
          isDownloaded={downloadedKeys.has(contentKey('text', activeArticle.id))}
          downloadProgress={downloadProgressMap[contentKey('text', activeArticle.id)]}
          isOffline={isOffline}
          onClose={() => setActiveArticle(null)}
          onToggleLike={() => handleToggleLike(activeArticle)}
          onToggleFavorite={() => handleToggleFavorite(activeArticle)}
          onToggleBookmark={() => setBookmarks(toggleBookmarkId(activeArticle.id))}
          onDownload={() => handleDownload(activeArticle)}
        />
      )}

      {/* GLOBAL SEARCH MODAL */}
      {showSearch && (
        <GlobalSearchModal
          monks={monks}
          mp3={mp3List}
          mp4={mp4List}
          podcasts={podcastList}
          texts={textList}
          downloadedKeys={downloadedKeys}
          onClose={() => setShowSearch(false)}
          onSelectMonk={(m) => {
            setShowAdminView(false);
            setSelectedMonk(m);
          }}
          onOpenItem={handleOpenItem}
        />
      )}

      {/* NOTIFICATIONS DRAWER */}
      {showNotifications && (
        <NotificationsDrawer
          notifications={notifications}
          enabled={notificationsEnabled}
          onToggleEnabled={(next) => {
            setNotifEnabledState(next);
            setNotificationsEnabled(next);
          }}
          onClose={() => setShowNotifications(false)}
          onSelectNotification={(n) => {
            if (n.contentType && n.contentId) {
              const target = combinedItems.find(
                (i) => i.type === n.contentType && i.id === n.contentId
              );
              if (target) {
                setShowNotifications(false);
                handleOpenItem(target);
              }
            }
          }}
        />
      )}

      {/* SINGLE OWNER ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <AdminLoginModal
          isOffline={isOffline}
          onClose={() => setShowAdminLogin(false)}
          onSuccess={() => {
            setIsAdminAuth(true);
            setShowAdminLogin(false);
            setShowAdminView(true);
            showToast('Signed in as Owner Admin');
          }}
        />
      )}

      {/* TOAST FEEDBACK */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-[#0B1410]/95 border border-[#E8C96A]/60 text-xs sm:text-sm text-[#F7F5EE] shadow-2xl whitespace-nowrap max-w-[90vw] truncate">
          {toast}
        </div>
      )}

      {/* BOTTOM 5-TAB NAVIGATION BAR (Mobile/Tablet) */}
      <nav
        aria-label="Primary Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#050505]/95 backdrop-blur-xl border-t border-[#C9A227]/30 grid grid-cols-5 items-center"
      >
        {(
          [
            ['home', 'ပင်မ', Home],
            ['mp3', 'MP3', Disc3],
            ['mp4', 'MP4', Video],
            ['podcast', 'Podcast', Headphones],
            ['library', 'ကျွန်ုပ်', User],
          ] as const
        ).map(([id, label, Icon]) => {
          const active = !showAdminView && !selectedMonk && activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSelectedMonk(null);
                setShowAdminView(false);
                setActiveTab(id);
              }}
              className={`h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-[#E8C96A]' : 'text-[#F7F5EE]/75 hover:text-[#F7F5EE]'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.7} />
              <span className="text-[10px] font-medium font-myanmar leading-tight">{label}</span>
              {active && <span className="w-5 h-0.5 rounded-full bg-[#E8C96A] mt-0.5" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
