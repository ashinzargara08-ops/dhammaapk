import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dhammaywaygyi.app',
  appName: 'ဓမ္မရောင်ခြည်',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['*'],
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#050505',
  },
};

export default config;
