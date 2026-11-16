export type ContentKind = 'mp3' | 'mp4' | 'podcast' | 'text';

export interface Monk {
  id: string;
  name: string;
  title: string;
  monastery: string;
  bio: string;
  portraitUrl: string;
  orderIndex: number;
  createdAt: string;
}

export interface VideoQualityVariant {
  label: string; // e.g. '720p HD', '480p SD'
  url: string;
}

export interface DhammaContentBase {
  id: string;
  type: ContentKind;
  title: string;
  description: string;
  monkId: string;
  monkName: string;
  coverUrl: string;
  likesCount: number;
  orderIndex: number;
  createdAt: string;
}

export interface DhammaAudio extends DhammaContentBase {
  type: 'mp3';
  mediaUrl: string;
  durationSeconds: number;
}

export interface DhammaVideo extends DhammaContentBase {
  type: 'mp4';
  mediaUrl: string;
  qualityVariants: VideoQualityVariant[];
  subtitleVttUrl?: string;
  durationSeconds: number;
}

export interface DhammaPodcast extends DhammaContentBase {
  type: 'podcast';
  episodeNumber: number;
  mediaUrl: string;
  durationSeconds: number;
}

export interface DhammaText extends DhammaContentBase {
  type: 'text';
  body: string;
  readMinutes: number;
}

export type AnyDhammaItem = DhammaAudio | DhammaVideo | DhammaPodcast | DhammaText;

export interface AppNotification {
  id: string;
  kind: 'auto' | 'manual';
  title: string;
  message: string;
  imageUrl?: string;
  contentType?: ContentKind;
  contentId?: string;
  createdAt: string;
}

export interface AppSettings {
  appName: string;
  subtitle: string;
  logoUrl: string;
  splashArtworkUrl: string;
  autoNotifyOnUpload: boolean;
  updatedAt: string;
}

export interface AdminStats {
  totalMonks: number;
  totalMp3: number;
  totalMp4: number;
  totalPodcasts: number;
  totalTexts: number;
  totalUsers: number;
  totalLikes: number;
}

export interface BootstrapPayload {
  monks: Monk[];
  mp3: DhammaAudio[];
  mp4: DhammaVideo[];
  podcasts: DhammaPodcast[];
  texts: DhammaText[];
  notifications: AppNotification[];
  settings: AppSettings;
  likedKeys: string[]; // `${type}:${id}` for current anon user
}

export interface PlaybackProgress {
  key: string; // `${type}:${id}`
  type: ContentKind;
  id: string;
  title: string;
  monkName: string;
  coverUrl: string;
  positionSeconds: number;
  durationSeconds: number;
  updatedAt: number;
}

export interface OfflineRecord {
  key: string; // `${type}:${id}`
  type: ContentKind;
  id: string;
  item: AnyDhammaItem;
  mediaBlob?: Blob;
  coverBlob?: Blob;
  subtitleText?: string;
  sizeBytes: number;
  downloadedAt: number;
}
