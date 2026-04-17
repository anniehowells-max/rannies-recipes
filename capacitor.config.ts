import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yourname.ranniesrecipes',
  appName: 'Rannies Recipes',
  webDir: 'dist',
  ios: {
    packageClassList: ['RemindersPlugin']
  } as any
};

export default config;
