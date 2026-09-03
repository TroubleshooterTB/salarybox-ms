import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.salarybox.ms',
  appName: 'SalaryBoxMS',
  webDir: 'out',
  server: {
    url: 'https://salarybox-ms.vercel.app/',
    cleartext: true
  }
};

export default config;
