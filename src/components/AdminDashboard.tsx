import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bell,
  Edit3,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Trash2,
  Upload,
  WifiOff,
  X,
} from 'lucide-react';
import type {
  AdminStats,
  AnyDhammaItem,
  AppNotification,
  AppSettings,
  ContentKind,
  DhammaAudio,
  DhammaPodcast,
  DhammaText,
  DhammaVideo,
  Monk,
} from '../types';
import { SafeArtwork } from './KanoteOrnaments';
import { adminFetch, setAdminToken } from '../lib/adminAuth';
import { resolveApiUrl } from '../lib/apiUrl';

export function AdminLoginModal({
  isOffline,
  onClose,
  onSuccess,
}: {
  isOffline: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      setError('No Internet Connection. Admin login requires an active connection.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(resolveApiUrl('/api/admin/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { authenticated?: boolean; token?: string; error?: string };
      if (!res.ok || !data.authenticated || !data.token) {
        setError(data.error || 'Authentication failed.');
      } else {
        setAdminToken(data.token);
        onSuccess();
      }
    } catch {
      setError('Network error while connecting to authentication server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl emerald-sanctuary-surface p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#C9A227]/15 border border-[#C9A227]/40 flex items-center justify-center text-[#E8C96A]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F7F5EE]">Owner Admin Login</h2>
              <p className="text-xs text-[#A8A393]">Single authorized owner access only</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-h-[40px] min-w-[40px] rounded-xl border border-[#C9A227]/30 flex items-center justify-center text-[#F7F5EE]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isOffline && (
          <div className="rounded-xl border border-amber-400/50 bg-amber-950/50 p-3 flex items-center gap-2.5 text-xs text-amber-200">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>No Internet Connection. Connect to sign in as Owner Admin.</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-rose-400/50 bg-rose-950/50 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#E8C96A] mb-1.5">Owner Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@domain.com"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#050505] border border-[#C9A227]/35 text-sm text-[#F7F5EE] focus:outline-none focus:border-[#E8C96A]"
            />
          </div>
          <div>
            <label className="block text-xs text-[#E8C96A] mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#050505] border border-[#C9A227]/35 text-sm text-[#F7F5EE] focus:outline-none focus:border-[#E8C96A]"
            />
          </div>

          <button
            type="submit"
            disabled={loading || isOffline}
            className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#E8C96A] to-[#C9A227] text-[#050505] font-semibold text-sm hover:brightness-110 transition disabled:opacity-45"
          >
            {loading ? 'Verifying...' : 'Sign In as Owner'}
          </button>
        </form>
      </div>
    </div>
  );
}

export function AdminDashboard({
  monks,
  mp3,
  mp4,
  podcasts,
  texts,
  notifications,
  settings,
  isOffline,
  onRetryConnection,
  onRefreshData,
  onBack,
  onLogout,
  onSessionExpired,
}: {
  monks: Monk[];
  mp3: DhammaAudio[];
  mp4: DhammaVideo[];
  podcasts: DhammaPodcast[];
  texts: DhammaText[];
  notifications: AppNotification[];
  settings: AppSettings;
  isOffline: boolean;
  onRetryConnection: () => Promise<boolean>;
  onRefreshData: () => Promise<void>;
  onBack: () => void;
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
}) {
  const [tab, setTab] = useState<'content' | 'monks' | 'order' | 'notifications' | 'settings'>('content');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [checkingConn, setCheckingConn] = useState(false);

  // Content upload/edit form state
  const [contentType, setContentType] = useState<ContentKind>('mp3');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cMonkId, setCMonkId] = useState(monks[0]?.id || '');
  const [cCoverUrl, setCCoverUrl] = useState('/src/assets/images/dhamma_cover_pagoda_1794792759959.jpg');
  const [cMediaUrl, setCMediaUrl] = useState('');
  const [cSdUrl, setCSdUrl] = useState('');
  const [cVttUrl, setCVttUrl] = useState('');
  const [cDuration, setCDuration] = useState('25');
  const [cEpisode, setCEpisode] = useState('1');
  const [cBody, setCBody] = useState('');

  // Monk form state
  const [editingMonkId, setEditingMonkId] = useState<string | null>(null);
  const [mName, setMName] = useState('');
  const [mTitle, setMTitle] = useState('');
  const [mMonastery, setMMonastery] = useState('');
  const [mBio, setMBio] = useState('');
  const [mPortrait, setMPortrait] = useState('/src/assets/images/monk_portrait_1_1794792759602.jpg');

  // Ordering state
  const [orderTarget, setOrderTarget] = useState<'monks' | 'mp3' | 'mp4' | 'podcast' | 'text'>('mp3');
  const [orderIds, setOrderIds] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // Notifications state
  const [nTitle, setNTitle] = useState('');
  const [nMessage, setNMessage] = useState('');
  const [nImage, setNImage] = useState('');

  // Settings state
  const [sAppName, setSAppName] = useState(settings.appName);
  const [sSubtitle, setSSubtitle] = useState(settings.subtitle);
  const [sLogoUrl, setSLogoUrl] = useState(settings.logoUrl);
  const [sSplashUrl, setSSplashUrl] = useState(settings.splashArtworkUrl);
  const [sAutoNotify, setSAutoNotify] = useState(settings.autoNotifyOnUpload);

  const authedFetch = async (url: string, init?: RequestInit): Promise<Response> => {
    const res = await adminFetch(url, init);
    if (res.status === 401) {
      setAdminToken(null);
      onSessionExpired();
      throw new Error('Owner Admin session expired. Please sign in again.');
    }
    return res;
  };

  const loadStats = async () => {
    if (isOffline) return;
    try {
      const res = await authedFetch('/api/admin/stats');
      if (res.ok) setStats((await res.json()) as AdminStats);
    } catch {
      // handled by authedFetch or offline state
    }
  };

  useEffect(() => {
    loadStats();
  }, [isOffline, monks.length, mp3.length, mp4.length, podcasts.length, texts.length]);

  useEffect(() => {
    if (!cMonkId && monks[0]) setCMonkId(monks[0].id);
  }, [monks, cMonkId]);

  useEffect(() => {
    const map = {
      monks: monks.map((i) => i.id),
      mp3: mp3.map((i) => i.id),
      mp4: mp4.map((i) => i.id),
      podcast: podcasts.map((i) => i.id),
      text: texts.map((i) => i.id),
    };
    setOrderIds(map[orderTarget]);
  }, [orderTarget, monks, mp3, mp4, podcasts, texts]);

  const guardOnline = (): boolean => {
    if (isOffline) {
      setFeedback({
        kind: 'err',
        text: 'No Internet Connection. Upload, edit, delete, and publishing actions are disabled until connectivity is restored.',
      });
      return false;
    }
    return true;
  };

  const detectMediaDuration = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) return;
    const objUrl = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setCDuration(String(Math.round(el.duration)));
      }
      URL.revokeObjectURL(objUrl);
    };
    el.onerror = () => URL.revokeObjectURL(objUrl);
    el.src = objUrl;
  };

  const handleFileUpload = async (file: File, onUrl: (url: string) => void) => {
    if (!guardOnline()) return;
    detectMediaDuration(file);
    setBusy(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authedFetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
      onUrl(data.url);
      setFeedback({ kind: 'ok', text: `Uploaded ${file.name}` });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Upload failed' });
    } finally {
      setBusy(false);
    }
  };

  const resetContentForm = () => {
    setEditingId(null);
    setCTitle('');
    setCDesc('');
    setCMediaUrl('');
    setCSdUrl('');
    setCVttUrl('');
    setCBody('');
  };

  const startEditItem = (item: AnyDhammaItem) => {
    setContentType(item.type);
    setEditingId(item.id);
    setCTitle(item.title);
    setCDesc(item.description);
    setCMonkId(item.monkId);
    setCCoverUrl(item.coverUrl);
    if (item.type === 'mp3') {
      setCMediaUrl(item.mediaUrl);
      setCDuration(String(item.durationSeconds));
    } else if (item.type === 'mp4') {
      setCMediaUrl(item.mediaUrl);
      setCVttUrl(item.subtitleVttUrl || '');
      setCDuration(String(item.durationSeconds));
    } else if (item.type === 'podcast') {
      setCMediaUrl(item.mediaUrl);
      setCEpisode(String(item.episodeNumber));
      setCDuration(String(item.durationSeconds));
    } else if (item.type === 'text') {
      setCBody(item.body);
    }
  };

  const handleSaveContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardOnline()) return;
    if (contentType !== 'text' && !cMediaUrl.trim()) {
      setFeedback({
        kind: 'err',
        text: `Please upload a real ${contentType.toUpperCase()} file or enter its URL before publishing.`,
      });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = {
        title: cTitle,
        description: cDesc,
        monkId: cMonkId,
        coverUrl: cCoverUrl,
        mediaUrl: cMediaUrl,
        sdUrl: cSdUrl,
        subtitleVttUrl: cVttUrl,
        durationSeconds: Number(cDuration) || 24,
        episodeNumber: Number(cEpisode) || 1,
        body: cBody,
      };
      const url = editingId
        ? `/api/admin/content/${contentType}/${editingId}`
        : `/api/admin/content/${contentType}`;
      const res = await authedFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to save content.');
      resetContentForm();
      await onRefreshData();
      await loadStats();
      setFeedback({ kind: 'ok', text: editingId ? 'Content updated and synced.' : 'Published to all users.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Save failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteContent = async (type: ContentKind, id: string) => {
    if (!guardOnline()) return;
    setBusy(true);
    try {
      const res = await authedFetch(`/api/admin/content/${type}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      await onRefreshData();
      await loadStats();
      setFeedback({ kind: 'ok', text: 'Content deleted.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Delete failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveMonk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardOnline()) return;
    setBusy(true);
    try {
      const url = editingMonkId ? `/api/admin/monks/${editingMonkId}` : '/api/admin/monks';
      const res = await authedFetch(url, {
        method: editingMonkId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: mName,
          title: mTitle,
          monastery: mMonastery,
          bio: mBio,
          portraitUrl: mPortrait,
        }),
      });
      if (!res.ok) throw new Error('Failed to save monk profile.');
      setEditingMonkId(null);
      setMName('');
      setMTitle('');
      setMMonastery('');
      setMBio('');
      await onRefreshData();
      await loadStats();
      setFeedback({ kind: 'ok', text: 'Monk profile saved.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Error saving monk.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMonk = async (id: string) => {
    if (!guardOnline()) return;
    setBusy(true);
    try {
      const res = await authedFetch(`/api/admin/monks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete monk.');
      await onRefreshData();
      await loadStats();
      setFeedback({ kind: 'ok', text: 'Monk profile deleted.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Delete error.' });
    } finally {
      setBusy(false);
    }
  };

  const moveOrder = (from: number, to: number) => {
    if (to < 0 || to >= orderIds.length) return;
    const copy = [...orderIds];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    setOrderIds(copy);
  };

  const handlePublishOrder = async () => {
    if (!guardOnline()) return;
    setBusy(true);
    try {
      const res = await authedFetch('/api/admin/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: orderTarget, orderedIds: orderIds }),
      });
      if (!res.ok) throw new Error('Failed to publish order.');
      await onRefreshData();
      setFeedback({ kind: 'ok', text: 'Display order saved and published to all users.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Order publish failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardOnline()) return;
    setBusy(true);
    try {
      const res = await authedFetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nTitle, message: nMessage, imageUrl: nImage }),
      });
      if (!res.ok) throw new Error('Failed to send notification.');
      setNTitle('');
      setNMessage('');
      setNImage('');
      await onRefreshData();
      setFeedback({ kind: 'ok', text: 'Notification broadcast sent.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Send failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardOnline()) return;
    setBusy(true);
    try {
      const res = await authedFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: sAppName,
          subtitle: sSubtitle,
          logoUrl: sLogoUrl,
          splashArtworkUrl: sSplashUrl,
          autoNotifyOnUpload: sAutoNotify,
        }),
      });
      if (!res.ok) throw new Error('Failed to update settings.');
      await onRefreshData();
      setFeedback({ kind: 'ok', text: 'App settings & branding updated for all users.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Settings failed.' });
    } finally {
      setBusy(false);
    }
  };

  const activeList =
    contentType === 'mp3'
      ? mp3
      : contentType === 'mp4'
      ? mp4
      : contentType === 'podcast'
      ? podcasts
      : texts;

  const orderLookup = new Map<string, { title: string; subtitle: string }>();
  if (orderTarget === 'monks') monks.forEach((m) => orderLookup.set(m.id, { title: m.name, subtitle: m.title }));
  if (orderTarget === 'mp3') mp3.forEach((i) => orderLookup.set(i.id, { title: i.title, subtitle: i.monkName }));
  if (orderTarget === 'mp4') mp4.forEach((i) => orderLookup.set(i.id, { title: i.title, subtitle: i.monkName }));
  if (orderTarget === 'podcast') podcasts.forEach((i) => orderLookup.set(i.id, { title: i.title, subtitle: i.monkName }));
  if (orderTarget === 'text') texts.forEach((i) => orderLookup.set(i.id, { title: i.title, subtitle: i.monkName }));

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[44px] px-3.5 rounded-xl border border-[#C9A227]/35 bg-[#0B0E0C] text-sm text-[#F7F5EE] inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 text-[#E8C96A]" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-xl font-bold text-[#F7F5EE]">Premium Admin Dashboard</h1>
            <p className="text-xs text-[#A8A393]">Single-Owner Content & Sanctuary Control</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-4 rounded-xl border border-rose-500/35 text-xs text-rose-300 hover:bg-rose-500/15 inline-flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* STRICT INTERNET REQUIREMENT BANNER */}
      {isOffline && (
        <div className="rounded-2xl border-2 border-amber-400/70 bg-amber-950/60 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <WifiOff className="w-6 h-6 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-bold text-amber-200">No Internet Connection</h2>
              <p className="text-xs sm:text-sm text-amber-100/85 mt-0.5">
                Admin uploads, edits, deletions, content ordering, notifications, and settings are strictly disabled while offline so no unverified changes occur.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              setCheckingConn(true);
              await onRetryConnection();
              setCheckingConn(false);
            }}
            className="min-h-[44px] px-4 rounded-xl bg-amber-400 text-[#050505] font-semibold text-xs inline-flex items-center gap-2 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${checkingConn ? 'animate-spin' : ''}`} />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-2xl p-3.5 text-xs sm:text-sm border ${
            feedback.kind === 'ok'
              ? 'border-emerald-400/45 bg-emerald-950/45 text-emerald-200'
              : 'border-rose-400/45 bg-rose-950/45 text-rose-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Live Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {[
          ['Monks', stats?.totalMonks ?? monks.length],
          ['MP3', stats?.totalMp3 ?? mp3.length],
          ['MP4', stats?.totalMp4 ?? mp4.length],
          ['Podcasts', stats?.totalPodcasts ?? podcasts.length],
          ['Texts', stats?.totalTexts ?? texts.length],
          ['Users', stats?.totalUsers ?? 1],
          ['Total Likes', stats?.totalLikes ?? 0],
        ].map(([label, val]) => (
          <div key={String(label)} className="dhamma-card rounded-2xl p-3.5">
            <p className="text-[11px] text-[#A8A393]">{label}</p>
            <p className="mt-1 text-xl font-bold text-[#E8C96A] tabular-nums">{val}</p>
          </div>
        ))}
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        {(
          [
            ['content', 'Upload & Edit Content'],
            ['monks', 'Monk Profiles'],
            ['order', 'Display Order'],
            ['notifications', 'Notifications'],
            ['settings', 'App & Images'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
              tab === id
                ? 'bg-[#C9A227] text-[#050505]'
                : 'bg-[#0B0E0C] border border-[#C9A227]/25 text-[#F7F5EE]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: CONTENT UPLOAD & EDIT */}
      {tab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveContent} className="lg:col-span-6 dhamma-card rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#F7F5EE]">
                {editingId ? 'Edit Content' : 'Upload New Dhamma Content'}
              </h3>
              {editingId && (
                <button type="button" onClick={resetContentForm} className="text-xs text-[#E8C96A]">
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(['mp3', 'mp4', 'podcast', 'text'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={Boolean(editingId) || isOffline}
                  onClick={() => setContentType(t)}
                  className={`py-2 rounded-xl text-xs uppercase font-semibold border ${
                    contentType === t
                      ? 'bg-[#063B2B] border-[#E8C96A] text-[#E8C96A]'
                      : 'border-[#C9A227]/20 text-[#A8A393]'
                  } disabled:opacity-50`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-[#E8C96A] mb-1">Title (Myanmar / English)</label>
              <input
                type="text"
                required
                disabled={isOffline}
                value={cTitle}
                onChange={(e) => setCTitle(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
              />
            </div>

            <div>
              <label className="block text-xs text-[#E8C96A] mb-1">Assign Monk Profile</label>
              <select
                disabled={isOffline}
                value={cMonkId}
                onChange={(e) => setCMonkId(e.target.value)}
                className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
              >
                {monks.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#E8C96A] mb-1">Description</label>
              <textarea
                rows={2}
                disabled={isOffline}
                value={cDesc}
                onChange={(e) => setCDesc(e.target.value)}
                className="w-full p-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
              />
            </div>

            <div>
              <label className="block text-xs text-[#E8C96A] mb-1">Cover Image URL or Upload</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled={isOffline}
                  value={cCoverUrl}
                  onChange={(e) => setCCoverUrl(e.target.value)}
                  className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
                />
                <label className={`min-h-[42px] px-3 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center gap-1.5 cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isOffline}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileUpload(f, setCCoverUrl);
                    }}
                  />
                </label>
              </div>
            </div>

            {contentType !== 'text' ? (
              <>
                <div>
                  <label className="block text-xs text-[#E8C96A] mb-1">
                    {contentType === 'mp4' ? 'Video File (MP4) or URL' : 'Audio File (MP3/WAV) or URL'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      disabled={isOffline}
                      value={cMediaUrl}
                      onChange={(e) => setCMediaUrl(e.target.value)}
                      placeholder="Upload file or paste media URL"
                      className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
                    />
                    <label className={`min-h-[42px] px-3 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center gap-1.5 cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept={contentType === 'mp4' ? 'video/*,.mp4,.webm' : 'audio/*,.mp3,.wav,.m4a'}
                        disabled={isOffline}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f, setCMediaUrl);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {contentType === 'mp4' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[#E8C96A] mb-1">480p SD URL (Optional)</label>
                      <input
                        type="text"
                        disabled={isOffline}
                        value={cSdUrl}
                        onChange={(e) => setCSdUrl(e.target.value)}
                        className="w-full min-h-[40px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#E8C96A] mb-1">Subtitle .VTT (Optional)</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          disabled={isOffline}
                          value={cVttUrl}
                          onChange={(e) => setCVttUrl(e.target.value)}
                          className="flex-1 min-h-[40px] px-2.5 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
                        />
                        <label className={`min-h-[40px] px-2.5 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                          <span>VTT</span>
                          <input
                            type="file"
                            accept=".vtt,text/vtt"
                            disabled={isOffline}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f, setCVttUrl);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#E8C96A] mb-1">Duration (seconds)</label>
                    <input
                      type="number"
                      min={1}
                      disabled={isOffline}
                      value={cDuration}
                      onChange={(e) => setCDuration(e.target.value)}
                      className="w-full min-h-[40px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] tabular-nums disabled:opacity-45"
                    />
                  </div>
                  {contentType === 'podcast' && (
                    <div>
                      <label className="block text-xs text-[#E8C96A] mb-1">Episode #</label>
                      <input
                        type="number"
                        min={1}
                        disabled={isOffline}
                        value={cEpisode}
                        onChange={(e) => setCEpisode(e.target.value)}
                        className="w-full min-h-[40px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] tabular-nums disabled:opacity-45"
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs text-[#E8C96A] mb-1">Dhamma Article Body</label>
                <textarea
                  rows={6}
                  required
                  disabled={isOffline}
                  value={cBody}
                  onChange={(e) => setCBody(e.target.value)}
                  className="w-full p-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={busy || isOffline}
              className="w-full min-h-[46px] rounded-xl bg-gradient-to-r from-[#E8C96A] to-[#C9A227] text-[#050505] font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>{editingId ? 'Save Changes' : 'Publish Content'}</span>
            </button>
          </form>

          {/* Existing items list */}
          <div className="lg:col-span-6 space-y-2.5">
            <h3 className="text-sm font-semibold text-[#E8C96A] uppercase tracking-wider">
              Published {contentType} ({activeList.length})
            </h3>
            {activeList.map((item) => (
              <div key={item.id} className="dhamma-card rounded-2xl p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl overflow-hidden border border-[#C9A227]/30 shrink-0">
                  <SafeArtwork src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">{item.title}</p>
                  <p className="text-xs text-[#A8A393] font-myanmar truncate">
                    {item.monkName} · <span className="tabular-nums">{item.likesCount} likes</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isOffline || busy}
                  onClick={() => startEditItem(item)}
                  aria-label="Edit item"
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-[#C9A227]/30 text-[#E8C96A] flex items-center justify-center disabled:opacity-40"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isOffline || busy}
                  onClick={() => handleDeleteContent(item.type, item.id)}
                  aria-label="Delete item"
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-rose-500/30 text-rose-400 flex items-center justify-center disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: MONK PROFILES */}
      {tab === 'monks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSaveMonk} className="lg:col-span-5 dhamma-card rounded-3xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[#F7F5EE]">
              {editingMonkId ? 'Edit Monk Profile' : 'Add Monk Profile'}
            </h3>
            <input
              type="text"
              required
              disabled={isOffline}
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              placeholder="Sayadaw Name"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
            <input
              type="text"
              disabled={isOffline}
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              placeholder="Ecclesiastical Title"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
            <input
              type="text"
              disabled={isOffline}
              value={mMonastery}
              onChange={(e) => setMMonastery(e.target.value)}
              placeholder="Monastery / Location"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isOffline}
                value={mPortrait}
                onChange={(e) => setMPortrait(e.target.value)}
                placeholder="Portrait URL"
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
              />
              <label className={`min-h-[42px] px-3 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center gap-1.5 cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                <Upload className="w-3.5 h-3.5" />
                <span>Portrait</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isOffline}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, setMPortrait);
                  }}
                />
              </label>
            </div>
            <textarea
              rows={3}
              disabled={isOffline}
              value={mBio}
              onChange={(e) => setMBio(e.target.value)}
              placeholder="Biography"
              className="w-full p-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
            <button
              type="submit"
              disabled={busy || isOffline}
              className="w-full min-h-[44px] rounded-xl bg-[#C9A227] text-[#050505] font-semibold text-sm disabled:opacity-40"
            >
              {editingMonkId ? 'Update Monk Profile' : 'Add Monk Profile'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-2.5">
            {monks.map((m) => (
              <div key={m.id} className="dhamma-card rounded-2xl p-3.5 flex items-center gap-3.5">
                <div className="w-14 h-16 rounded-xl overflow-hidden border border-[#C9A227]/40 shrink-0">
                  <SafeArtwork src={m.portraitUrl} alt={m.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#F7F5EE] font-myanmar truncate">{m.name}</p>
                  <p className="text-xs text-[#E8C96A] truncate">{m.title}</p>
                  <p className="text-xs text-[#A8A393] truncate">{m.monastery}</p>
                </div>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => {
                    setEditingMonkId(m.id);
                    setMName(m.name);
                    setMTitle(m.title);
                    setMMonastery(m.monastery);
                    setMBio(m.bio);
                    setMPortrait(m.portraitUrl);
                  }}
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-[#C9A227]/30 text-[#E8C96A] flex items-center justify-center disabled:opacity-40"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => handleDeleteMonk(m.id)}
                  className="min-h-[40px] min-w-[40px] rounded-xl border border-rose-500/30 text-rose-400 flex items-center justify-center disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: CONTENT ORDERING (Drag & Drop + Buttons) */}
      {tab === 'order' && (
        <div className="dhamma-card rounded-3xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['mp3', 'mp4', 'podcast', 'text', 'monks'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setOrderTarget(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs uppercase font-semibold ${
                    orderTarget === t ? 'bg-[#C9A227] text-[#050505]' : 'bg-white/5 text-[#A8A393]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={isOffline || busy}
              onClick={handlePublishOrder}
              className="min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-[#E8C96A] to-[#C9A227] text-[#050505] font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-40"
            >
              <Save className="w-4 h-4" />
              <span>Save & Publish Order</span>
            </button>
          </div>

          <div className="space-y-2">
            {orderIds.map((id, idx) => {
              const info = orderLookup.get(id);
              if (!info) return null;
              return (
                <div
                  key={id}
                  draggable={!isOffline}
                  onDragStart={() => setDragIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== idx) moveOrder(dragIdx, idx);
                    setDragIdx(null);
                  }}
                  className="rounded-2xl bg-[#050505]/75 border border-[#C9A227]/25 p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing"
                >
                  <span className="w-7 h-7 rounded-lg bg-[#C9A227]/15 text-[#E8C96A] text-xs font-bold flex items-center justify-center tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#F7F5EE] font-myanmar truncate">{info.title}</p>
                    <p className="text-xs text-[#A8A393] font-myanmar truncate">{info.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    disabled={isOffline || idx === 0}
                    onClick={() => moveOrder(idx, idx - 1)}
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-white/15 flex items-center justify-center text-[#F7F5EE] disabled:opacity-30"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={isOffline || idx === orderIds.length - 1}
                    onClick={() => moveOrder(idx, idx + 1)}
                    className="min-h-[36px] min-w-[36px] rounded-lg border border-white/15 flex items-center justify-center text-[#F7F5EE] disabled:opacity-30"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleSendNotification} className="lg:col-span-5 dhamma-card rounded-3xl p-5 space-y-4">
            <h3 className="text-base font-semibold text-[#F7F5EE] inline-flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#E8C96A]" />
              <span>Send Manual Notification</span>
            </h3>
            <input
              type="text"
              required
              disabled={isOffline}
              value={nTitle}
              onChange={(e) => setNTitle(e.target.value)}
              placeholder="Notification Title"
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
            <textarea
              rows={3}
              required
              disabled={isOffline}
              value={nMessage}
              onChange={(e) => setNMessage(e.target.value)}
              placeholder="Notification Message"
              className="w-full p-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isOffline}
                value={nImage}
                onChange={(e) => setNImage(e.target.value)}
                placeholder="Optional Image URL"
                className="flex-1 min-h-[40px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
              />
              <label className={`min-h-[40px] px-3 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                <span>Image</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isOffline}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, setNImage);
                  }}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isOffline || busy}
              className="w-full min-h-[44px] rounded-xl bg-[#C9A227] text-[#050505] font-semibold text-sm disabled:opacity-40"
            >
              Send Notification to Users
            </button>
          </form>

          <div className="lg:col-span-7 space-y-2.5">
            {notifications.map((n) => (
              <div key={n.id} className="dhamma-card rounded-2xl p-3.5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] text-[#E8C96A] uppercase">{n.kind}</p>
                  <p className="text-sm font-semibold text-[#F7F5EE] font-myanmar">{n.title}</p>
                  <p className="text-xs text-[#A8A393] font-myanmar mt-0.5">{n.message}</p>
                </div>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={async () => {
                    if (!guardOnline()) return;
                    try {
                      const res = await authedFetch(`/api/admin/notifications/${n.id}`, { method: 'DELETE' });
                      if (res.ok) await onRefreshData();
                    } catch (err) {
                      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Delete failed.' });
                    }
                  }}
                  className="min-h-[38px] min-w-[38px] rounded-xl border border-rose-500/30 text-rose-400 flex items-center justify-center disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: APP SETTINGS & BRAND IMAGES */}
      {tab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="dhamma-card rounded-3xl p-5 sm:p-6 max-w-2xl space-y-4">
          <h3 className="text-base font-semibold text-[#F7F5EE] inline-flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#E8C96A]" />
            <span>App Branding & Settings</span>
          </h3>

          <div>
            <label className="block text-xs text-[#E8C96A] mb-1">App Display Name</label>
            <input
              type="text"
              disabled={isOffline}
              value={sAppName}
              onChange={(e) => setSAppName(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] font-myanmar disabled:opacity-45"
            />
          </div>

          <div>
            <label className="block text-xs text-[#E8C96A] mb-1">Subtitle</label>
            <input
              type="text"
              disabled={isOffline}
              value={sSubtitle}
              onChange={(e) => setSSubtitle(e.target.value)}
              className="w-full min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-sm text-[#F7F5EE] disabled:opacity-45"
            />
          </div>

          <div>
            <label className="block text-xs text-[#E8C96A] mb-1">App Logo URL / Upload</label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isOffline}
                value={sLogoUrl}
                onChange={(e) => setSLogoUrl(e.target.value)}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
              />
              <label className={`min-h-[42px] px-3 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isOffline}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, setSLogoUrl);
                  }}
                />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#E8C96A] mb-1">Splash Artwork URL / Upload</label>
            <div className="flex gap-2">
              <input
                type="text"
                disabled={isOffline}
                value={sSplashUrl}
                onChange={(e) => setSSplashUrl(e.target.value)}
                className="flex-1 min-h-[42px] px-3 rounded-xl bg-[#050505] border border-[#C9A227]/30 text-xs text-[#F7F5EE] disabled:opacity-45"
              />
              <label className={`min-h-[42px] px-3 rounded-xl border border-[#C9A227]/40 text-xs text-[#E8C96A] inline-flex items-center cursor-pointer ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
                <span>Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isOffline}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, setSSplashUrl);
                  }}
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-3 text-sm text-[#F7F5EE] cursor-pointer">
            <input
              type="checkbox"
              disabled={isOffline}
              checked={sAutoNotify}
              onChange={(e) => setSAutoNotify(e.target.checked)}
              className="w-4 h-4 accent-[#C9A227]"
            />
            <span>Automatically notify users when new MP3, MP4, Podcast, or Dhamma Text is published</span>
          </label>

          <button
            type="submit"
            disabled={isOffline || busy}
            className="min-h-[44px] px-6 rounded-xl bg-[#C9A227] text-[#050505] font-semibold text-sm disabled:opacity-40"
          >
            Save App Settings
          </button>
        </form>
      )}
    </div>
  );
}
