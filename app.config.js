import 'dotenv/config';

export default {
  expo: {
    name: "DeepLog",
    slug: "TestApp",
    version: "1.3.9",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "cover",
      backgroundColor: "#1a1a1a"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wodnjs3418.TestApp",
      buildNumber: "38",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleDevelopmentRegion: "ko",
        CFBundleLocalizations: ["ko", "en"],
        NSFaceIDUsageDescription: "감정 기록에 안전하게 접근하기 위해 Face ID를 사용합니다.",
        NSBiometricUsageDescription: "감정 기록에 안전하게 접근하기 위해 생체 인증을 사용합니다.",
        NSUserTrackingUsageDescription: "맞춤형 광고 및 앱 사용 분석을 위해 추적 권한이 필요합니다.",
        NSPhotoLibraryUsageDescription: "감정 기록과 함께 사진을 저장하거나 공유하기 위해 사진 라이브러리 접근이 필요합니다."
      }
    },
    android: {
      package: "com.wodnjs3418.TestApp",
      versionCode: 34,
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
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    },
    owner: "wodnjs3418",
    plugins: [
      "expo-secure-store",
      ["react-native-fbsdk-next", {
        appID: "1812569692767941",
        clientToken: "160a79ac37494dc6841afce16c184044",
        displayName: "DeepLog",
        scheme: "fb1812569692767941"
      }],
      [
        "expo-tracking-transparency",
        {
          userTrackingPermission: "맞춤형 광고 및 앱 사용 분석을 위해 추적 권한이 필요합니다."
        }
      ]
    ],
    locales: {
      ko: "./locales/ko.json",
      en: "./locales/en.json"
    }
  }
};