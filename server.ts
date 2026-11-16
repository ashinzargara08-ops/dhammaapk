import express, { type NextFunction, type Request, type Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const execFileAsync = promisify(execFile);
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'dhamma-db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(MEDIA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const PORT = Number(process.env.PORT || 3000);
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'ashinzargara08@gmail.com')
  .trim()
  .replace(/^["']|["']$/g, '')
  .toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || 'DhammaOwner@2026')
  .replace(/\r?\n$/, '')
  .replace(/^["']|["']$/g, '');
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`${ADMIN_EMAIL}:dhamma_secret_key_2026`).digest('hex');
const ADMIN_COOKIE_NAME = 'dhamma_admin_session';

interface LikeRecord {
  key: string; // `${type}:${id}`
  anonUid: string;
  createdAt: string;
}

interface DatabaseSchema {
  monks: Array<{
    id: string;
    name: string;
    title: string;
    monastery: string;
    bio: string;
    portraitUrl: string;
    orderIndex: number;
    createdAt: string;
  }>;
  mp3: Array<{
    id: string;
    type: 'mp3';
    title: string;
    description: string;
    monkId: string;
    monkName: string;
    coverUrl: string;
    mediaUrl: string;
    durationSeconds: number;
    likesCount: number;
    orderIndex: number;
    createdAt: string;
  }>;
  mp4: Array<{
    id: string;
    type: 'mp4';
    title: string;
    description: string;
    monkId: string;
    monkName: string;
    coverUrl: string;
    mediaUrl: string;
    qualityVariants: Array<{ label: string; url: string }>;
    subtitleVttUrl?: string;
    durationSeconds: number;
    likesCount: number;
    orderIndex: number;
    createdAt: string;
  }>;
  podcasts: Array<{
    id: string;
    type: 'podcast';
    title: string;
    description: string;
    monkId: string;
    monkName: string;
    episodeNumber: number;
    coverUrl: string;
    mediaUrl: string;
    durationSeconds: number;
    likesCount: number;
    orderIndex: number;
    createdAt: string;
  }>;
  texts: Array<{
    id: string;
    type: 'text';
    title: string;
    description: string;
    body: string;
    monkId: string;
    monkName: string;
    coverUrl: string;
    readMinutes: number;
    likesCount: number;
    orderIndex: number;
    createdAt: string;
  }>;
  likes: LikeRecord[];
  users: string[]; // anonymous user IDs tracked cleanly
  notifications: Array<{
    id: string;
    kind: 'auto' | 'manual';
    title: string;
    message: string;
    imageUrl?: string;
    contentType?: 'mp3' | 'mp4' | 'podcast' | 'text';
    contentId?: string;
    createdAt: string;
  }>;
  settings: {
    appName: string;
    subtitle: string;
    logoUrl: string;
    splashArtworkUrl: string;
    autoNotifyOnUpload: boolean;
    updatedAt: string;
  };
}

async function generateSampleMediaFiles(): Promise<void> {
  const audioSpecs = [
    { file: 'dhamma-metta.mp3', freq1: 432, freq2: 648, duration: 22 },
    { file: 'dhamma-vipassana.mp3', freq1: 396, freq2: 594, duration: 24 },
    { file: 'dhamma-mangala.mp3', freq1: 528, freq2: 792, duration: 20 },
    { file: 'podcast-abhidhamma-ep1.mp3', freq1: 360, freq2: 540, duration: 25 },
    { file: 'podcast-sati-ep2.mp3', freq1: 417, freq2: 625, duration: 22 },
  ];

  for (const spec of audioSpecs) {
    const outPath = path.join(MEDIA_DIR, spec.file);
    if (!fs.existsSync(outPath)) {
      try {
        await execFileAsync('ffmpeg', [
          '-y',
          '-f', 'lavfi',
          '-i', `sine=frequency=${spec.freq1}:duration=${spec.duration}`,
          '-f', 'lavfi',
          '-i', `sine=frequency=${spec.freq2}:duration=${spec.duration}`,
          '-filter_complex',
          `[0:a]volume=0.28[a0];[1:a]volume=0.14[a1];[a0][a1]amix=inputs=2:duration=first,tremolo=f=0.35:d=0.45,aecho=0.8:0.88:120:0.35,afade=t=in:st=0:d=1.5,afade=t=out:st=${spec.duration - 2}:d=2[out]`,
          '-map', '[out]',
          '-c:a', 'libmp3lame',
          '-b:a', '128k',
          outPath,
        ]);
      } catch (err) {
        console.warn(`Could not generate sample audio ${spec.file}:`, err);
      }
    }
  }

  const lotusImg = path.join(ROOT_DIR, 'src/assets/images/dhamma_cover_lotus_1794792761897.jpg');
  const pagodaImg = path.join(ROOT_DIR, 'src/assets/images/dhamma_cover_pagoda_1794792759959.jpg');

  const videoSpecs = [
    { file: 'video-shwedagon-720p.mp4', img: pagodaImg, freq: 432, scale: '1280:720', duration: 14 },
    { file: 'video-shwedagon-480p.mp4', img: pagodaImg, freq: 432, scale: '854:480', duration: 14 },
    { file: 'video-lotus-720p.mp4', img: lotusImg, freq: 528, scale: '1280:720', duration: 14 },
    { file: 'video-lotus-480p.mp4', img: lotusImg, freq: 528, scale: '854:480', duration: 14 },
  ];

  for (const v of videoSpecs) {
    const outPath = path.join(MEDIA_DIR, v.file);
    if (!fs.existsSync(outPath) && fs.existsSync(v.img)) {
      try {
        await execFileAsync('ffmpeg', [
          '-y',
          '-loop', '1',
          '-i', v.img,
          '-f', 'lavfi',
          '-i', `sine=frequency=${v.freq}:duration=${v.duration}`,
          '-filter_complex',
          `[0:v]scale=${v.scale}:force_original_aspect_ratio=decrease,pad=${v.scale}:(ow-iw)/2:(oh-ih)/2:color=#050505,format=yuv420p[v];[1:a]volume=0.22,tremolo=f=0.4:d=0.4,afade=t=in:st=0:d=1.2,afade=t=out:st=${v.duration - 1.5}:d=1.5[a]`,
          '-map', '[v]',
          '-map', '[a]',
          '-t', String(v.duration),
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          outPath,
        ]);
      } catch (err) {
        console.warn(`Could not generate sample video ${v.file}:`, err);
      }
    }
  }

  const vtt1Path = path.join(MEDIA_DIR, 'subtitles-metta.vtt');
  if (!fs.existsSync(vtt1Path)) {
    fs.writeFileSync(
      vtt1Path,
      `WEBVTT

00:00.500 --> 00:04.500
နမော တဿ ဘဂဝတော အရဟတော သမ္မာသမ္ဗုဒ္ဓဿ
Homage to the Blessed One, the Worthy One, the Fully Enlightened Buddha.

00:04.800 --> 00:09.500
သတ္တဝါအပေါင်း ဘေးရန်ကင်းကွာ ချမ်းသာကြပါစေ။
May all beings be free from danger and abide in peace.

00:09.800 --> 00:13.800
မေတ္တာတရားသည် စိတ်နှလုံးကို အေးချမ်းစေသော ဓမ္မရောင်ခြည်ဖြစ်ပါသည်။
Loving-kindness is the Dhamma radiance that cools the heart.
`,
      'utf-8'
    );
  }

  const vtt2Path = path.join(MEDIA_DIR, 'subtitles-lotus.vtt');
  if (!fs.existsSync(vtt2Path)) {
    fs.writeFileSync(
      vtt2Path,
      `WEBVTT

00:00.500 --> 00:04.500
သတိပဋ္ဌာန်တရားတော်သည် နိဗ္ဗာန်သို့ သွားရာ တစ်ကြောင်းတည်းသော လမ်းဖြစ်၏။
The Four Foundations of Mindfulness are the direct path to liberation.

00:04.800 --> 00:09.500
ဝင်လေ ထွက်လေကို သတိဖြင့် ရှုမှတ်ခြင်းဖြင့် ပစ္စုပ္ပန်တည့်တည့်၌ တည်နေပါ။
Rest in the present moment by mindfully observing each in-breath and out-breath.

00:09.800 --> 00:13.800
သမာဓိမှ ပညာသို့ ကူးပြောင်း၍ ငြိမ်းအေးမှုကို ခံစားရပါမည်။
From concentration arises wisdom, revealing true inner stillness.
`,
      'utf-8'
    );
  }
}

function createInitialDatabase(): DatabaseSchema {
  const now = new Date().toISOString();
  return {
    monks: [
      {
        id: 'monk-1',
        name: 'ဘဒ္ဒန္တ ဉာဏိဿရ (သီတဂူ)',
        title: 'အဘိဓဇမဟာရဋ္ဌဂုရု',
        monastery: 'သီတဂူကမ္ဘာ့ဗုဒ္ဓတက္ကသိုလ်၊ စစ်ကိုင်း',
        bio: 'မြန်မာနိုင်ငံနှင့် ကမ္ဘာတစ်ဝှမ်းသို့ ဗုဒ္ဓဓမ္မရောင်ခြည်ကို ဖြန့်ဝေတော်မူသော ဝိပဿနာနှင့် ပိဋကတ်ကျမ်းတတ် ဆရာတော်ကြီး ဖြစ်ပါသည်။ မေတ္တာ၊ ကရုဏာနှင့် ငြိမ်းချမ်းရေး တရားတော်များကို ဟောကြားတော်မူသည်။',
        portraitUrl: '/src/assets/images/monk_portrait_1_1794792759602.jpg',
        orderIndex: 0,
        createdAt: now,
      },
      {
        id: 'monk-2',
        name: 'ဘဒ္ဒန္တ သုမင်္ဂလ (မဟာစည်)',
        title: 'ကမ္မဋ္ဌာနာစရိယ မဟာထေရ်',
        monastery: 'မဟာစည်သာသနာ့ရိပ်သာ၊ ရန်ကုန်',
        bio: 'သတိပဋ္ဌာန် ဝိပဿနာ ရှုမှတ်နည်း တရားတော်များကို လက်တွေ့ကျကျ လမ်းညွှန်ဟောကြားတော်မူသော ကမ္မဋ္ဌာန်းနည်းပြ ဆရာတော် ဖြစ်ပါသည်။',
        portraitUrl: '/src/assets/images/monk_portrait_2_1794792757099.jpg',
        orderIndex: 1,
        createdAt: now,
      },
      {
        id: 'monk-3',
        name: 'ဒေါက်တာ ဘဒ္ဒန္တ နန္ဒမာလာဘိဝံသ',
        title: 'အဂ္ဂမဟာပဏ္ဍိတ · ပါမောက္ခချုပ်',
        monastery: 'မဟာသုဗောဓာရုံကျောင်းတိုက်၊ စစ်ကိုင်း',
        bio: 'အဘိဓမ္မာတရားတော်များနှင့် သုတ္တန်ဒေသနာတော်များကို ခေတ်ပညာနှင့် ယှဉ်တွဲ၍ နက်နဲရှင်းလင်းစွာ ဟောကြားတော်မူသော ဆရာတော် ဖြစ်ပါသည်။',
        portraitUrl: '/src/assets/images/monk_portrait_3_1794792762058.jpg',
        orderIndex: 2,
        createdAt: now,
      },
    ],
    mp3: [
      {
        id: 'mp3-1',
        type: 'mp3',
        title: 'မေတ္တာသုတ် အနှစ်သာရနှင့် နေ့စဉ်ကျင့်စဉ်',
        description: 'မေတ္တာဘာဝနာပွားများခြင်းဖြင့် စိတ်နှလုံးအေးချမ်းမှု ရရှိပုံနှင့် နေ့စဉ်လူနေမှုဘဝတွင် ကျင့်သုံးနည်း တရားတော်။',
        monkId: 'monk-1',
        monkName: 'ဘဒ္ဒန္တ ဉာဏိဿရ (သီတဂူ)',
        coverUrl: '/src/assets/images/dhamma_cover_pagoda_1794792759959.jpg',
        mediaUrl: '/api/media/dhamma-metta.mp3',
        durationSeconds: 22,
        likesCount: 142,
        orderIndex: 0,
        createdAt: now,
      },
      {
        id: 'mp3-2',
        type: 'mp3',
        title: 'သတိပဋ္ဌာန် ဝိပဿနာ ရှုမှတ်နည်း',
        description: 'ဝင်လေထွက်လေ အာနာပါနသတိမှသည် ရုပ်နာမ်ဖြစ်ပျက် ဉာဏ်အမြင်သို့ တက်လှမ်းပုံ တရားတော်။',
        monkId: 'monk-2',
        monkName: 'ဘဒ္ဒန္တ သုမင်္ဂလ (မဟာစည်)',
        coverUrl: '/src/assets/images/dhamma_cover_lotus_1794792761897.jpg',
        mediaUrl: '/api/media/dhamma-vipassana.mp3',
        durationSeconds: 24,
        likesCount: 198,
        orderIndex: 1,
        createdAt: now,
      },
      {
        id: 'mp3-3',
        type: 'mp3',
        title: 'မင်္ဂလသုတ်တော်လာ ၃၈ ဖြာ မင်္ဂလာ',
        description: 'လူမှုရေး၊ မိသားစုရေးနှင့် ဓမ္မရေးရာ တိုးတက်စေသော မြတ်ဗုဒ္ဓ၏ မင်္ဂလာတရားတော် အဖွင့်။',
        monkId: 'monk-3',
        monkName: 'ဒေါက်တာ ဘဒ္ဒန္တ နန္ဒမာလာဘိဝံသ',
        coverUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
        mediaUrl: '/api/media/dhamma-mangala.mp3',
        durationSeconds: 20,
        likesCount: 115,
        orderIndex: 2,
        createdAt: now,
      },
    ],
    mp4: [
      {
        id: 'mp4-1',
        type: 'mp4',
        title: 'ရွှေတိဂုံစေတီတော်မြတ် ဓမ္မသဘင်နှင့် မေတ္တာပို့',
        description: 'ညချမ်းအချိန် ငြိမ်းချမ်းစွာ တရားနာယူ ဖူးမြော်နိုင်ရန် စီစဉ်ထားသော ဗီဒီယိုတရားတော် (စာတန်းထိုးပါဝင်သည်)။',
        monkId: 'monk-1',
        monkName: 'ဘဒ္ဒန္တ ဉာဏိဿရ (သီတဂူ)',
        coverUrl: '/src/assets/images/dhamma_cover_pagoda_1794792759959.jpg',
        mediaUrl: '/api/media/video-shwedagon-720p.mp4',
        qualityVariants: [
          { label: '720p HD', url: '/api/media/video-shwedagon-720p.mp4' },
          { label: '480p SD', url: '/api/media/video-shwedagon-480p.mp4' },
        ],
        subtitleVttUrl: '/api/media/subtitles-metta.vtt',
        durationSeconds: 14,
        likesCount: 234,
        orderIndex: 0,
        createdAt: now,
      },
      {
        id: 'mp4-2',
        type: 'mp4',
        title: 'ပဒုမ္မာကြာပန်း ဥပမာနှင့် စိတ်တည်ငြိမ်မှု',
        description: 'လောကဓံကြားမှ မညစ်နွမ်းဘဲ ပွင့်လန်းသော ကြာပန်းကဲ့သို့ စိတ်ထားတတ်စေရန် ဟောကြားတော်မူသော တရားဗီဒီယို။',
        monkId: 'monk-2',
        monkName: 'ဘဒ္ဒန္တ သုမင်္ဂလ (မဟာစည်)',
        coverUrl: '/src/assets/images/dhamma_cover_lotus_1794792761897.jpg',
        mediaUrl: '/api/media/video-lotus-720p.mp4',
        qualityVariants: [
          { label: '720p HD', url: '/api/media/video-lotus-720p.mp4' },
          { label: '480p SD', url: '/api/media/video-lotus-480p.mp4' },
        ],
        subtitleVttUrl: '/api/media/subtitles-lotus.vtt',
        durationSeconds: 14,
        likesCount: 176,
        orderIndex: 1,
        createdAt: now,
      },
    ],
    podcasts: [
      {
        id: 'pod-1',
        type: 'podcast',
        title: 'အဘိဓမ္မာ အခြေခံ — စိတ်၊ စေတသိက်နှင့် နေ့စဉ်သတိ',
        description: 'အဘိဓမ္မာတရားတော်ကို လူငယ်များနှင့် စတင်လေ့လာသူများ နားလည်လွယ်စေရန် အပိုင်းလိုက် ဆွေးနွေးတင်ဆက်မှု။',
        monkId: 'monk-3',
        monkName: 'ဒေါက်တာ ဘဒ္ဒန္တ နန္ဒမာလာဘိဝံသ',
        episodeNumber: 1,
        coverUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
        mediaUrl: '/api/media/podcast-abhidhamma-ep1.mp3',
        durationSeconds: 25,
        likesCount: 94,
        orderIndex: 0,
        createdAt: now,
      },
      {
        id: 'pod-2',
        type: 'podcast',
        title: 'စိတ်ဖိစီးမှု ကင်းဝေးစေမည့် အာနာပါန ၁၀ မိနစ်',
        description: 'အလုပ်ခွင်နှင့် နေ့စဉ်ဘဝကြားတွင် ၁၀ မိနစ်ခန့် အသက်ရှူမှတ်၍ စိတ်ကို ပြန်လည်တည်ဆောက်ခြင်း Podcast။',
        monkId: 'monk-2',
        monkName: 'ဘဒ္ဒန္တ သုမင်္ဂလ (မဟာစည်)',
        episodeNumber: 2,
        coverUrl: '/src/assets/images/dhamma_cover_lotus_1794792761897.jpg',
        mediaUrl: '/api/media/podcast-sati-ep2.mp3',
        durationSeconds: 22,
        likesCount: 163,
        orderIndex: 1,
        createdAt: now,
      },
    ],
    texts: [
      {
        id: 'txt-1',
        type: 'text',
        title: 'မေတ္တာဘာဝနာ၏ အကျိုးကျေးဇူး (၁၁) ပါး',
        description: 'မြတ်စွာဘုရားရှင် ဟောကြားတော်မူခဲ့သော မေတ္တာသုတ်နှင့် အင်္ဂုတ္တရနိကာယ်လာ မေတ္တာအကျိုးတရားများ။',
        body: `နမော တဿ ဘဂဝတော အရဟတော သမ္မာသမ္ဗုဒ္ဓဿ။

မေတ္တာတရားသည် သတ္တဝါအားလုံး၏ ချမ်းသာခြင်းကို လိုလားသော စိတ်ထားဖြစ်ပါသည်။ မြတ်စွာဘုရားရှင်သည် မေတ္တာစေတောဝိမုတ္တိကို ပွားများအားထုတ်သော ပုဂ္ဂိုလ်တို့ ရရှိခံစားရမည့် အကျိုးကျေးဇူး (၁၁) ပါးကို ဟောကြားတော်မူခဲ့ပါသည်။

၁။ ချမ်းသာစွာ အိပ်စက်ရခြင်း (သုခံ သုပတိ) — အိပ်မက်ဆိုးများ မမက်ဘဲ စိတ်ငြိမ်းချမ်းစွာ အိပ်စက်နိုင်ခြင်း။
၂။ ချမ်းသာစွာ နိုးထရခြင်း (သုခံ ပဋိဗုဇ္ဈတိ) — နံနက်ခင်းတိုင်း ကြည်လင်လန်းဆန်းစွာ နိုးထနိုင်ခြင်း။
၃။ မကောင်းသော အိပ်မက်ကို မမြင်မက်ခြင်း။
၄။ လူတို့၏ ချစ်ခင်မြတ်နိုးမှုကို ခံရခြင်း။
၅။ နတ်ဗြဟ္မာတို့၏ ချစ်ခင်စောင့်ရှောက်မှုကို ခံရခြင်း။
၆။ မီး၊ အဆိပ်၊ လက်နက်ဘေးတို့မှ ကင်းဝေးစေခြင်း။
၇။ စိတ်တည်ကြည်မှု သမာဓိ လျင်မြန်စွာ ဖြစ်ထွန်းခြင်း။
၈။ မျက်နှာအဆင်း ကြည်လင်ရွှင်ပြခြင်း။
၉။ မတွေဝေဘဲ သတိမြဲစွာ ကွယ်လွန်ရခြင်း။
၁၀။ အထက်မဂ်ဖိုလ် မရသေးလျှင် ဗြဟ္မာ့ပြည်သို့ လားရခြင်း။

နေ့စဉ် အိပ်ရာဝင်ခါနီးနှင့် နံနက်နိုးထချိန်တိုင်း "အရပ်ဆယ်မျက်နှာရှိ သတ္တဝါအပေါင်း ဘေးရန်ကင်းကွာ ချမ်းသာကြပါစေ" ဟု စိတ်ပါလက်ပါ မေတ္တာပို့သခြင်းဖြင့် မိမိ၏ နှလုံးသားထဲတွင် ဓမ္မရောင်ခြည် အလင်းတန်းများ ထွန်းလင်းလာမည် ဖြစ်ပါသည်။`,
        monkId: 'monk-1',
        monkName: 'ဘဒ္ဒန္တ ဉာဏိဿရ (သီတဂူ)',
        coverUrl: '/src/assets/images/dhamma_cover_pagoda_1794792759959.jpg',
        readMinutes: 4,
        likesCount: 128,
        orderIndex: 0,
        createdAt: now,
      },
      {
        id: 'txt-2',
        type: 'text',
        title: 'ပစ္စုပ္ပန်တည့်တည့်၌ နေထိုင်ခြင်း အနုပညာ',
        description: 'အတိတ်၏ နောင်တနှင့် အနာဂတ်၏ စိုးရိမ်မှုများကို လွှတ်ချ၍ ယခုပစ္စုပ္ပန်ခဏတွင် သတိမြဲစွာ နေထိုင်နည်း။',
        body: `ဘဒ္ဒေကရတ္တသုတ်တော်၌ မြတ်စွာဘုရားရှင် ဟောကြားတော်မူခဲ့သည့်အတိုင်း "အတိတ်ကိုလည်း မလိုက်နှင့်၊ အနာဂတ်ကိုလည်း မတောင့်တနှင့်" ဟူသော ဆုံးမစကားသည် ခေတ်သစ်လူသားတို့အတွက် အထူးအရေးကြီးလှပါသည်။

အတိတ်က ဖြစ်ပျက်ခဲ့ပြီးသော အကြောင်းအရာများသည် ပြန်လည်ပြင်ဆင်၍ မရတော့သကဲ့သို့၊ အနာဂတ်သည်လည်း မရောက်ရှိသေးသော အရာသာ ဖြစ်ပါသည်။ အမှန်တကယ် တည်ရှိနေသည်မှာ ယခု ဝင်လေ ထွက်လေ ဖြစ်ပေါ်နေသော ပစ္စုပ္ပန်ခဏတစ်ခုတည်းသာ ဖြစ်၏။

သတိပဋ္ဌာန် ကျင့်စဉ်ဖြင့် ခြေလှမ်းတိုင်း၊ အသက်ရှူတိုင်း၊ စကားပြောတိုင်း၌ "သိနေခြင်း" (သတိ) ကို တည်ဆောက်နိုင်ပါက စိတ်ဖိစီးမှုများ လျော့ပါးပြီး ဉာဏ်ပညာ အမြင် ကြည်လင်လာမည် ဖြစ်ပါသည်။`,
        monkId: 'monk-2',
        monkName: 'ဘဒ္ဒန္တ သုမင်္ဂလ (မဟာစည်)',
        coverUrl: '/src/assets/images/dhamma_cover_lotus_1794792761897.jpg',
        readMinutes: 3,
        likesCount: 91,
        orderIndex: 1,
        createdAt: now,
      },
    ],
    likes: [],
    users: [],
    notifications: [
      {
        id: 'notif-1',
        kind: 'manual',
        title: 'ဓမ္မရောင်ခြည် အက်ပ်မှ ကြိုဆိုပါသည်',
        message: 'တရားတော် MP3 များ၊ ဗီဒီယို MP4 များ၊ Podcast နှင့် ဓမ္မစာပေများကို အင်တာနက်မရှိချိန်တွင်ပါ ဒေါင်းလုဒ်ဆွဲ၍ နာယူဖတ်ရှုနိုင်ပါပြီ။',
        imageUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
        createdAt: now,
      },
    ],
    settings: {
      appName: 'ဓမ္မရောင်ခြည်',
      subtitle: 'Dhamma Yway Gyi · Sacred Multimedia Sanctuary',
      logoUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
      splashArtworkUrl: '/src/assets/images/app_logo_emblem_1794792760606.jpg',
      autoNotifyOnUpload: true,
      updatedAt: now,
    },
  };
}

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    const fallback = createInitialDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

let db: DatabaseSchema = loadDatabase();

function saveDatabase(): void {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      result[k] = decodeURIComponent(v);
    }
  }
  return result;
}

function createAdminToken(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ email, role: 'owner_admin', exp: Date.now() + 1000 * 60 * 60 * 24 * 7 })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyAdminToken(token: string | undefined): { email: string } | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      email?: string;
      role?: string;
      exp?: number;
    };
    if (
      parsed.role === 'owner_admin' &&
      parsed.email?.toLowerCase() === ADMIN_EMAIL &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    ) {
      return { email: parsed.email };
    }
  } catch {
    return null;
  }
  return null;
}

function extractAdminToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req);
  return cookies[ADMIN_COOKIE_NAME];
}

function getAdminSession(req: Request): { email: string } | null {
  return verifyAdminToken(extractAdminToken(req));
}

function isAdminRequest(req: Request): boolean {
  return getAdminSession(req) !== null;
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdminRequest(req)) {
    res.status(401).json({ error: 'Unauthorized: Owner Admin authentication required.' });
    return;
  }
  next();
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
});

function sortByOrder<T extends { orderIndex: number; createdAt: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => a.orderIndex - b.orderIndex || b.createdAt.localeCompare(a.createdAt));
}

function computeStats() {
  const totalLikes =
    db.mp3.reduce((s, i) => s + i.likesCount, 0) +
    db.mp4.reduce((s, i) => s + i.likesCount, 0) +
    db.podcasts.reduce((s, i) => s + i.likesCount, 0) +
    db.texts.reduce((s, i) => s + i.likesCount, 0);

  return {
    totalMonks: db.monks.length,
    totalMp3: db.mp3.length,
    totalMp4: db.mp4.length,
    totalPodcasts: db.podcasts.length,
    totalTexts: db.texts.length,
    totalUsers: Math.max(db.users.length, 1),
    totalLikes,
  };
}

function createAutoNotification(contentType: 'mp3' | 'mp4' | 'podcast' | 'text', contentId: string, title: string, monkName: string, imageUrl?: string) {
  if (!db.settings.autoNotifyOnUpload) return;
  const labelMap = {
    mp3: 'MP3 တရားတော်အသစ်',
    mp4: 'MP4 ဗီဒီယိုတရားတော်အသစ်',
    podcast: 'Podcast အပိုင်းသစ်',
    text: 'ဓမ္မစာပေအသစ်',
  };
  db.notifications.unshift({
    id: `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    kind: 'auto',
    title: `${labelMap[contentType]}: ${title}`,
    message: `${monkName} ဟောကြားရေးသားတော်မူသော တရားတော်အသစ်ကို ယခုပင် နာယူဖတ်ရှုနိုင်ပါပြီ။`,
    imageUrl,
    contentType,
    contentId,
    createdAt: new Date().toISOString(),
  });
  if (db.notifications.length > 60) {
    db.notifications = db.notifications.slice(0, 60);
  }
}

async function startServer() {
  const app = express();

  // CORS for Capacitor Android (https://localhost, capacitor://localhost) and web previews
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-anon-uid');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Serve generated media, uploaded files, and bundled image assets with Range support
  app.use('/api/media', express.static(MEDIA_DIR, { acceptRanges: true }));
  app.use('/uploads', express.static(UPLOADS_DIR, { acceptRanges: true }));
  app.use('/src/assets/images', express.static(path.join(ROOT_DIR, 'src/assets/images')));

  // Health check for connectivity verification
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Public bootstrap data + anonymous user tracking
  app.get('/api/bootstrap', (req, res) => {
    const anonUid = typeof req.headers['x-anon-uid'] === 'string' ? req.headers['x-anon-uid'].trim() : '';
    if (anonUid && /^[a-zA-Z0-9_-]{8,64}$/.test(anonUid) && !db.users.includes(anonUid)) {
      db.users.push(anonUid);
      saveDatabase();
    }
    const likedKeys = anonUid
      ? db.likes.filter((l) => l.anonUid === anonUid).map((l) => l.key)
      : [];

    res.json({
      monks: sortByOrder(db.monks),
      mp3: sortByOrder(db.mp3),
      mp4: sortByOrder(db.mp4),
      podcasts: sortByOrder(db.podcasts),
      texts: sortByOrder(db.texts),
      notifications: db.notifications,
      settings: db.settings,
      likedKeys,
    });
  });

  // Anonymous duplicate-safe Like toggle
  app.post('/api/likes/toggle', (req, res) => {
    const { contentType, contentId, anonUid } = req.body as {
      contentType?: 'mp3' | 'mp4' | 'podcast' | 'text';
      contentId?: string;
      anonUid?: string;
    };

    if (!contentType || !contentId || !anonUid || !/^[a-zA-Z0-9_-]{8,64}$/.test(anonUid)) {
      res.status(400).json({ error: 'Invalid like payload or anonymous identity.' });
      return;
    }

    if (!db.users.includes(anonUid)) {
      db.users.push(anonUid);
    }

    const collectionMap = {
      mp3: db.mp3,
      mp4: db.mp4,
      podcast: db.podcasts,
      text: db.texts,
    };
    const list = collectionMap[contentType];
    if (!list) {
      res.status(400).json({ error: 'Unknown content type.' });
      return;
    }
    const target = list.find((item) => item.id === contentId);
    if (!target) {
      res.status(404).json({ error: 'Content not found.' });
      return;
    }

    const key = `${contentType}:${contentId}`;
    const existingIdx = db.likes.findIndex((l) => l.key === key && l.anonUid === anonUid);
    let liked = false;

    if (existingIdx >= 0) {
      db.likes.splice(existingIdx, 1);
      target.likesCount = Math.max(0, target.likesCount - 1);
      liked = false;
    } else {
      db.likes.push({ key, anonUid, createdAt: new Date().toISOString() });
      target.likesCount += 1;
      liked = true;
    }

    saveDatabase();
    res.json({ liked, likesCount: target.likesCount, key });
  });

  // Admin auth status
  app.get('/api/admin/session', (req, res) => {
    const verified = getAdminSession(req);
    if (!verified) {
      res.json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, email: verified.email });
  });

  // Single-owner Admin login (no public registration)
  app.post('/api/admin/login', (req, res) => {
    const { email, password } = req.body as { email?: string; password?: string };
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = password || '';

    if (!cleanEmail || !cleanPass) {
      res.status(400).json({ error: 'Please enter both Owner Email and Password.' });
      return;
    }

    const emailMatch = cleanEmail === ADMIN_EMAIL;
    const expectedHash = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
    const actualHash = crypto.createHash('sha256').update(cleanPass).digest();
    const passMatch = crypto.timingSafeEqual(expectedHash, actualHash);

    if (!emailMatch) {
      res.status(401).json({ error: 'Access denied: Email does not match the authorized Owner Admin (ADMIN_EMAIL).' });
      return;
    }

    if (!passMatch) {
      res.status(401).json({ error: 'Incorrect password for the Owner Admin account (ADMIN_PASSWORD).' });
      return;
    }

    const token = createAdminToken(ADMIN_EMAIL);
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieFlags = isHttps
      ? 'HttpOnly; Path=/; SameSite=None; Secure'
      : 'HttpOnly; Path=/; SameSite=Lax';
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}; ${cookieFlags}; Max-Age=${60 * 60 * 24 * 7}`
    );
    res.json({ authenticated: true, email: ADMIN_EMAIL, token });
  });

  app.post('/api/admin/logout', (req, res) => {
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const cookieFlags = isHttps
      ? 'HttpOnly; Path=/; SameSite=None; Secure'
      : 'HttpOnly; Path=/; SameSite=Lax';
    res.setHeader(
      'Set-Cookie',
      `${ADMIN_COOKIE_NAME}=; ${cookieFlags}; Max-Age=0`
    );
    res.json({ authenticated: false });
  });

  // Admin stats
  app.get('/api/admin/stats', requireAdmin, (_req, res) => {
    res.json(computeStats());
  });

  // Admin file upload (MP3, MP4, images, VTT subtitles)
  app.post('/api/admin/upload', requireAdmin, (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'File upload failed.';
        res.status(400).json({ error: msg });
        return;
      }
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded.' });
        return;
      }
      res.json({
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      });
    });
  });

  // Admin Monks CRUD
  app.post('/api/admin/monks', requireAdmin, (req, res) => {
    const { name, title, monastery, bio, portraitUrl } = req.body as Record<string, string>;
    if (!name?.trim()) {
      res.status(400).json({ error: 'Monk name is required.' });
      return;
    }
    const newMonk = {
      id: `monk-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: name.trim(),
      title: (title || 'ဆရာတော်').trim(),
      monastery: (monastery || '').trim(),
      bio: (bio || '').trim(),
      portraitUrl: portraitUrl?.trim() || '/src/assets/images/monk_portrait_1_1794792759602.jpg',
      orderIndex: db.monks.length,
      createdAt: new Date().toISOString(),
    };
    db.monks.push(newMonk);
    saveDatabase();
    res.json(newMonk);
  });

  app.put('/api/admin/monks/:id', requireAdmin, (req, res) => {
    const monk = db.monks.find((m) => m.id === req.params.id);
    if (!monk) {
      res.status(404).json({ error: 'Monk not found.' });
      return;
    }
    const { name, title, monastery, bio, portraitUrl } = req.body as Record<string, string>;
    if (name !== undefined) monk.name = name.trim();
    if (title !== undefined) monk.title = title.trim();
    if (monastery !== undefined) monk.monastery = monastery.trim();
    if (bio !== undefined) monk.bio = bio.trim();
    if (portraitUrl !== undefined && portraitUrl.trim()) monk.portraitUrl = portraitUrl.trim();

    // Cascade monk name updates to content
    for (const item of [...db.mp3, ...db.mp4, ...db.podcasts, ...db.texts]) {
      if (item.monkId === monk.id) {
        item.monkName = monk.name;
      }
    }
    saveDatabase();
    res.json(monk);
  });

  app.delete('/api/admin/monks/:id', requireAdmin, (req, res) => {
    const idx = db.monks.findIndex((m) => m.id === req.params.id);
    if (idx < 0) {
      res.status(404).json({ error: 'Monk not found.' });
      return;
    }
    db.monks.splice(idx, 1);
    saveDatabase();
    res.json({ deleted: true });
  });

  // Admin Content CRUD (mp3, mp4, podcast, text)
  app.post('/api/admin/content/:type', requireAdmin, (req, res) => {
    const type = req.params.type as 'mp3' | 'mp4' | 'podcast' | 'text';
    const body = req.body as Record<string, unknown>;
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const monkId = String(body.monkId || '').trim();
    const monk = db.monks.find((m) => m.id === monkId) || db.monks[0];

    if (!title || !monk) {
      res.status(400).json({ error: 'Title and valid monk profile are required.' });
      return;
    }

    const id = `${type}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const createdAt = new Date().toISOString();
    const coverUrl = String(body.coverUrl || '').trim() || '/src/assets/images/dhamma_cover_pagoda_1794792759959.jpg';

    if (type === 'mp3') {
      const mediaUrl = String(body.mediaUrl || '').trim();
      if (!mediaUrl) {
        res.status(400).json({ error: 'Please upload an MP3 audio file or enter a valid audio URL.' });
        return;
      }
      const item = {
        id,
        type: 'mp3' as const,
        title,
        description,
        monkId: monk.id,
        monkName: monk.name,
        coverUrl,
        mediaUrl,
        durationSeconds: Number(body.durationSeconds) || 24,
        likesCount: 0,
        orderIndex: 0,
        createdAt,
      };
      db.mp3.forEach((x) => x.orderIndex++);
      db.mp3.unshift(item);
      createAutoNotification('mp3', id, title, monk.name, coverUrl);
      saveDatabase();
      res.json(item);
      return;
    }

    if (type === 'mp4') {
      const mediaUrl = String(body.mediaUrl || '').trim();
      if (!mediaUrl) {
        res.status(400).json({ error: 'Please upload an MP4 video file or enter a valid video URL.' });
        return;
      }
      const sdUrl = String(body.sdUrl || '').trim();
      const variants = [{ label: '720p HD', url: mediaUrl }];
      if (sdUrl) variants.push({ label: '480p SD', url: sdUrl });
      const item = {
        id,
        type: 'mp4' as const,
        title,
        description,
        monkId: monk.id,
        monkName: monk.name,
        coverUrl,
        mediaUrl,
        qualityVariants: variants,
        subtitleVttUrl: String(body.subtitleVttUrl || '').trim() || undefined,
        durationSeconds: Number(body.durationSeconds) || 14,
        likesCount: 0,
        orderIndex: 0,
        createdAt,
      };
      db.mp4.forEach((x) => x.orderIndex++);
      db.mp4.unshift(item);
      createAutoNotification('mp4', id, title, monk.name, coverUrl);
      saveDatabase();
      res.json(item);
      return;
    }

    if (type === 'podcast') {
      const mediaUrl = String(body.mediaUrl || '').trim();
      if (!mediaUrl) {
        res.status(400).json({ error: 'Please upload a Podcast audio file or enter a valid audio URL.' });
        return;
      }
      const item = {
        id,
        type: 'podcast' as const,
        title,
        description,
        monkId: monk.id,
        monkName: monk.name,
        episodeNumber: Number(body.episodeNumber) || db.podcasts.length + 1,
        coverUrl,
        mediaUrl,
        durationSeconds: Number(body.durationSeconds) || 25,
        likesCount: 0,
        orderIndex: 0,
        createdAt,
      };
      db.podcasts.forEach((x) => x.orderIndex++);
      db.podcasts.unshift(item);
      createAutoNotification('podcast', id, title, monk.name, coverUrl);
      saveDatabase();
      res.json(item);
      return;
    }

    if (type === 'text') {
      const articleBody = String(body.body || '').trim();
      if (!articleBody) {
        res.status(400).json({ error: 'Article text body is required.' });
        return;
      }
      const item = {
        id,
        type: 'text' as const,
        title,
        description,
        body: articleBody,
        monkId: monk.id,
        monkName: monk.name,
        coverUrl,
        readMinutes: Number(body.readMinutes) || Math.max(2, Math.ceil(articleBody.length / 400)),
        likesCount: 0,
        orderIndex: 0,
        createdAt,
      };
      db.texts.forEach((x) => x.orderIndex++);
      db.texts.unshift(item);
      createAutoNotification('text', id, title, monk.name, coverUrl);
      saveDatabase();
      res.json(item);
      return;
    }

    res.status(400).json({ error: 'Unsupported content type.' });
  });

  app.put('/api/admin/content/:type/:id', requireAdmin, (req, res) => {
    const type = req.params.type as 'mp3' | 'mp4' | 'podcast' | 'text';
    const id = req.params.id;
    const body = req.body as Record<string, unknown>;
    const collectionMap = {
      mp3: db.mp3,
      mp4: db.mp4,
      podcast: db.podcasts,
      text: db.texts,
    };
    const list = collectionMap[type];
    if (!list) {
      res.status(400).json({ error: 'Invalid content type.' });
      return;
    }
    const item = list.find((i) => i.id === id);
    if (!item) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }

    if (typeof body.title === 'string' && body.title.trim()) item.title = body.title.trim();
    if (typeof body.description === 'string') item.description = body.description.trim();
    if (typeof body.coverUrl === 'string' && body.coverUrl.trim()) item.coverUrl = body.coverUrl.trim();
    if (typeof body.monkId === 'string') {
      const monk = db.monks.find((m) => m.id === body.monkId);
      if (monk) {
        item.monkId = monk.id;
        item.monkName = monk.name;
      }
    }
    if (type === 'text' && typeof body.body === 'string' && item.type === 'text') {
      item.body = body.body.trim();
      item.readMinutes = Number(body.readMinutes) || Math.max(2, Math.ceil(item.body.length / 400));
    }
    if (type === 'podcast' && body.episodeNumber !== undefined && item.type === 'podcast') {
      item.episodeNumber = Number(body.episodeNumber) || item.episodeNumber;
    }
    if ((type === 'mp3' || type === 'podcast') && typeof body.mediaUrl === 'string' && body.mediaUrl.trim() && (item.type === 'mp3' || item.type === 'podcast')) {
      item.mediaUrl = body.mediaUrl.trim();
    }
    if (type === 'mp4' && item.type === 'mp4') {
      if (typeof body.mediaUrl === 'string' && body.mediaUrl.trim()) {
        item.mediaUrl = body.mediaUrl.trim();
        item.qualityVariants = [{ label: '720p HD', url: item.mediaUrl }];
      }
      if (typeof body.subtitleVttUrl === 'string') {
        item.subtitleVttUrl = body.subtitleVttUrl.trim() || undefined;
      }
    }

    saveDatabase();
    res.json(item);
  });

  app.delete('/api/admin/content/:type/:id', requireAdmin, (req, res) => {
    const type = req.params.type as 'mp3' | 'mp4' | 'podcast' | 'text';
    const id = req.params.id;
    const collectionMap = {
      mp3: db.mp3,
      mp4: db.mp4,
      podcast: db.podcasts,
      text: db.texts,
    };
    const list = collectionMap[type];
    if (!list) {
      res.status(400).json({ error: 'Invalid content type.' });
      return;
    }
    const idx = list.findIndex((i) => i.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Item not found.' });
      return;
    }
    list.splice(idx, 1);
    db.likes = db.likes.filter((l) => l.key !== `${type}:${id}`);
    saveDatabase();
    res.json({ deleted: true });
  });

  // Admin Content Ordering
  app.put('/api/admin/order', requireAdmin, (req, res) => {
    const { target, orderedIds } = req.body as {
      target?: 'monks' | 'mp3' | 'mp4' | 'podcast' | 'text';
      orderedIds?: string[];
    };
    if (!target || !Array.isArray(orderedIds)) {
      res.status(400).json({ error: 'Target and orderedIds array are required.' });
      return;
    }
    const map = {
      monks: db.monks,
      mp3: db.mp3,
      mp4: db.mp4,
      podcast: db.podcasts,
      text: db.texts,
    };
    const list = map[target] as Array<{ id: string; orderIndex: number; createdAt: string }>;
    if (!list) {
      res.status(400).json({ error: 'Unknown target.' });
      return;
    }
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    list.forEach((item) => {
      const idx = rank.get(item.id);
      if (idx !== undefined) item.orderIndex = idx;
    });
    saveDatabase();
    res.json({ saved: true, items: sortByOrder(list) });
  });

  // Admin Manual Notifications
  app.post('/api/admin/notifications', requireAdmin, (req, res) => {
    const { title, message, imageUrl } = req.body as {
      title?: string;
      message?: string;
      imageUrl?: string;
    };
    if (!title?.trim() || !message?.trim()) {
      res.status(400).json({ error: 'Notification title and message are required.' });
      return;
    }
    const notif = {
      id: `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      kind: 'manual' as const,
      title: title.trim(),
      message: message.trim(),
      imageUrl: imageUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notif);
    saveDatabase();
    res.json(notif);
  });

  app.delete('/api/admin/notifications/:id', requireAdmin, (req, res) => {
    db.notifications = db.notifications.filter((n) => n.id !== req.params.id);
    saveDatabase();
    res.json({ deleted: true });
  });

  // Admin App Settings & Brand Images
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const body = req.body as Partial<DatabaseSchema['settings']>;
    if (typeof body.appName === 'string' && body.appName.trim()) db.settings.appName = body.appName.trim();
    if (typeof body.subtitle === 'string') db.settings.subtitle = body.subtitle.trim();
    if (typeof body.logoUrl === 'string' && body.logoUrl.trim()) db.settings.logoUrl = body.logoUrl.trim();
    if (typeof body.splashArtworkUrl === 'string' && body.splashArtworkUrl.trim()) db.settings.splashArtworkUrl = body.splashArtworkUrl.trim();
    if (typeof body.autoNotifyOnUpload === 'boolean') db.settings.autoNotifyOnUpload = body.autoNotifyOnUpload;
    db.settings.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json(db.settings);
  });

  // Vite or static dist serving
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dhamma Yway Gyi server listening on http://0.0.0.0:${PORT}`);
    generateSampleMediaFiles().catch((err) => {
      console.warn('Background sample media generation error:', err);
    });
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
