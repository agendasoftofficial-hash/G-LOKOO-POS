import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.agendasoft.glokoo.pos',
  appName: 'G-LOKOO POS',
  webDir: 'dist',

  server: {
    androidScheme: 'https',
  },

  plugins: {
    LiveUpdate: {
      autoUpdateStrategy: 'none',
      readyTimeout: 10000,
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
    },
  },
};

export default config;