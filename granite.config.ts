import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: "innernote",
  brand: {
    displayName: 'InnerNote',
    primaryColor: '#3182F6',
    icon: null,
    bridgeColorMode: 'basic',
  },
  web: {
    host: 'localhost',
    port: 8081,
    commands: {
      dev: "npx expo start --web",
      build: "npx expo export:web"
    },
  },
  permissions: [],
});
