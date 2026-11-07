import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marknatdev.projectedu',
  appName: 'Project Edu',
  webDir: 'public',
  server: {
    url: 'https://project-edu-orcin.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#F6F6F3',
  },
  ios: {
    preferredContentMode: 'mobile',
    backgroundColor: '#F6F6F3',
  },
};

export default config;
