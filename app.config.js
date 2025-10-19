export default {
  expo: {
    name: "INNER NOTE",
    slug: "TestApp",
    version: "1.3.1",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wodnjs3418.TestApp",
      buildNumber: "27",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDevelopmentRegion: "ko",
        CFBundleLocalizations: ["ko", "en"],
        NSFaceIDUsageDescription: "감정 기록에 안전하게 접근하기 위해 Face ID를 사용합니다.",
        NSBiometricUsageDescription: "감정 기록에 안전하게 접근하기 위해 생체 인증을 사용합니다."
      }
    },
    android: {
      package: "com.wodnjs3418.TestApp",
      versionCode: 23,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "64620a51-3d11-47e9-ad8b-69a389b18f59"
      },
      openaiApiKey: process.env.OPENAI_API_KEY
    },
    owner: "wodnjs3418",
    plugins: [
      "expo-secure-store"
    ],
    locales: {
      ko: "./locales/ko.json",
      en: "./locales/en.json"
    }
  }
};