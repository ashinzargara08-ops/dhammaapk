package com.dhammaywaygyi.app;

import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        updateForegroundService(call);
    }

    @PluginMethod
    public void updateState(PluginCall call) {
        updateForegroundService(call);
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        try {
            Context context = getContext();
            Intent stopIntent = new Intent(context, MediaPlaybackService.class);
            stopIntent.setAction(MediaPlaybackService.ACTION_STOP);
            context.stopService(stopIntent);
        } catch (Exception ignored) {
        }
        call.resolve();
    }

    private void updateForegroundService(PluginCall call) {
        String title = call.getString("title", "ဓမ္မရောင်ခြည်");
        String artist = call.getString("artist", "Dhamma Yway Gyi");
        boolean isPlaying = Boolean.TRUE.equals(call.getBoolean("isPlaying", true));

        try {
            Context context = getContext();
            Intent intent = new Intent(context, MediaPlaybackService.class);
            intent.setAction(MediaPlaybackService.ACTION_UPDATE);
            intent.putExtra(MediaPlaybackService.EXTRA_TITLE, title);
            intent.putExtra(MediaPlaybackService.EXTRA_ARTIST, artist);
            intent.putExtra(MediaPlaybackService.EXTRA_PLAYING, isPlaying);
            ContextCompat.startForegroundService(context, intent);
        } catch (Exception ignored) {
        }
        call.resolve();
    }
}
