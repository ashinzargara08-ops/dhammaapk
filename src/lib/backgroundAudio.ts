import { Capacitor, registerPlugin } from '@capacitor/core';

interface BackgroundAudioPluginInterface {
  startService(options: { title: string; artist: string; isPlaying: boolean }): Promise<void>;
  updateState(options: { title: string; artist: string; isPlaying: boolean }): Promise<void>;
  stopService(): Promise<void>;
}

const BackgroundAudioPlugin = registerPlugin<BackgroundAudioPluginInterface>('BackgroundAudio');

export async function syncNativeBackgroundAudio(
  active: boolean,
  title = '',
  artist = '',
  isPlaying = false
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (!active) {
      await BackgroundAudioPlugin.stopService();
    } else {
      await BackgroundAudioPlugin.updateState({ title, artist, isPlaying });
    }
  } catch {
    // Graceful no-op when native bridge is unavailable
  }
}
