# 광고 통합 구현 가이드

## 개요
이 문서는 INNER NOTE 앱에 Google Mobile Ads (AdMob)를 통합한 내용을 설명합니다.

## 구현된 광고 위치

### 1. 설정 화면 하단 - 배너 광고
**위치**: `src/HealingEmotionApp.jsx:2556`
- **광고 종류**: 배너 광고 (Banner Ad)
- **합리적 이유**: 사용자가 일기를 쓰지 않고 부가 기능을 조정할 때만 노출되므로, 주 사용 흐름을 방해하지 않습니다.
- **구현**: Settings 탭 ScrollView 하단에 `<AdBanner />` 컴포넌트 추가

### 2. 기록 목록 하단 - 배너 광고
**위치**: `src/HealingEmotionApp.jsx:1946-1948`
- **광고 종류**: 배너 광고 (Banner Ad)
- **합리적 이유**: 과거 기록을 모두 스크롤한 '휴식 지점'에 노출됩니다. 일기에 대한 집중이 끝난 지점이므로 이탈 위험이 낮습니다.
- **구현**: History 탭의 기록이 있을 때만 목록 하단에 표시

### 3. 휴지통 닫기 - 전면 광고
**위치**: `src/HealingEmotionApp.jsx:3099-3103`
- **광고 종류**: 전면 광고 (Interstitial Ad)
- **빈도**: 4회에 한 번씩 표시 (3-5회 권장 범위 내)
- **합리적 이유**: 쓰레기를 비우고 앱을 떠나는 등의 행동 간 전환 시점에만 삽입하여 광고 노출 빈도를 낮춥니다.
- **구현**:
  - AsyncStorage에 'trashCloseCount' 키로 카운트 저장
  - `showInterstitialAdWithFrequency()` 함수로 빈도 제어

### 4. 앱 잠금 해제 - 리워드 광고
**위치**: `src/HealingEmotionApp.jsx:2647-2672`
- **광고 종류**: 리워드 광고 (Rewarded Ad)
- **합리적 이유**: 광고 시청 시 생체 인증 도움말을 제공하여, 광고를 '불편함'이 아닌 '도움'으로 인식하게 만듭니다.
- **구현**:
  - "광고 시청하고 도움받기" 버튼 추가
  - 광고 시청 후 생체 인증 관련 도움말 제공

## 파일 구조

```
src/
├── components/
│   └── AdBanner.jsx          # 재사용 가능한 배너 광고 컴포넌트
├── utils/
│   ├── adInterstitial.js     # 전면 광고 유틸리티
│   └── adRewarded.js         # 리워드 광고 유틸리티
└── HealingEmotionApp.jsx     # 광고 통합된 메인 앱
```

## 설정 파일

### app.config.js
```javascript
plugins: [
  "expo-secure-store",
  [
    "react-native-google-mobile-ads",
    {
      android_app_id: "ca-app-pub-XXXXXXXX~YYYYYY",  // 실제 AdMob App ID로 교체
      ios_app_id: "ca-app-pub-XXXXXXXX~YYYYYY",      // 실제 AdMob App ID로 교체
      user_tracking_usage_description: "이 식별자는 광고를 제공하고 광고 성과를 측정하는 데 사용됩니다."
    }
  ]
]
```

## AdMob 설정 단계

### 1. AdMob 계정 생성 및 앱 등록
1. [Google AdMob](https://admob.google.com/)에 로그인
2. "앱" → "앱 추가" 클릭
3. 플랫폼 선택 (Android/iOS)
4. 앱 이름 입력: "INNER NOTE"
5. App ID 복사 (예: `ca-app-pub-1234567890123456~1234567890`)

### 2. 광고 단위 생성
각 광고 유형별로 광고 단위를 생성해야 합니다:

#### 배너 광고 (2개 필요)
1. AdMob 대시보드 → "광고 단위" → "광고 단위 추가"
2. "배너" 선택
3. 광고 단위 이름:
   - "Settings Banner" (설정 화면용)
   - "History Banner" (기록 목록용)
4. Ad Unit ID 복사 (예: `ca-app-pub-1234567890123456/1234567890`)

#### 전면 광고 (1개 필요)
1. "전면 광고" 선택
2. 광고 단위 이름: "Trash Close Interstitial"
3. Ad Unit ID 복사

#### 리워드 광고 (1개 필요)
1. "리워드 광고" 선택
2. 광고 단위 이름: "Lock Screen Rewarded"
3. Ad Unit ID 복사

### 3. 코드에 Ad Unit ID 적용

#### AdBanner.jsx
```javascript
const BANNER_AD_UNIT_ID = __DEV__
  ? TestIds.ADAPTIVE_BANNER
  : Platform.select({
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',     // iOS 배너 Ad Unit ID
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Android 배너 Ad Unit ID
    });
```

#### adInterstitial.js
```javascript
const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.select({
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',     // iOS 전면 Ad Unit ID
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Android 전면 Ad Unit ID
    });
```

#### adRewarded.js
```javascript
const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : Platform.select({
      ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',     // iOS 리워드 Ad Unit ID
      android: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY', // Android 리워드 Ad Unit ID
    });
```

### 4. app.config.js 업데이트
```javascript
[
  "react-native-google-mobile-ads",
  {
    android_app_id: "ca-app-pub-XXXXXXXX~YYYYYY",  // 1단계에서 복사한 Android App ID
    ios_app_id: "ca-app-pub-XXXXXXXX~YYYYYY",      // 1단계에서 복사한 iOS App ID
    user_tracking_usage_description: "이 식별자는 광고를 제공하고 광고 성과를 측정하는 데 사용됩니다."
  }
]
```

## 빌드 및 배포

### 개발 환경 테스트
```bash
# 개발 모드에서는 자동으로 테스트 광고가 표시됩니다
npx expo start
```

### 프로덕션 빌드
```bash
# Android
npx eas build --platform android

# iOS
npx eas build --platform ios
```

### 주의사항
1. **개발 중에는 테스트 광고만 사용**: `__DEV__` 플래그로 자동 전환됩니다
2. **실제 광고 클릭 금지**: 개발 중 실제 광고를 클릭하면 계정이 정지될 수 있습니다
3. **광고 승인 대기**: 실제 광고가 표시되려면 AdMob 심사가 필요합니다 (보통 몇 시간~1일)
4. **GDPR 준수**: `requestNonPersonalizedAdsOnly: true` 옵션으로 개인화되지 않은 광고 요청

## 수익 최적화 팁

### 1. 광고 로딩 전략
- 전면 광고와 리워드 광고는 미리 로드되어 있습니다
- 앱 시작 시 자동으로 광고를 미리 로드합니다
- 광고 표시 후 다음 광고를 자동으로 로드합니다

### 2. 사용자 경험 우선
- 배너 광고는 콘텐츠와 자연스럽게 분리
- 전면 광고는 최소 빈도로 표시 (4회에 1번)
- 리워드 광고는 사용자가 선택적으로 시청

### 3. A/B 테스트 권장사항
- 전면 광고 빈도 조정 (3, 4, 5회 테스트)
- 배너 광고 크기 및 위치 테스트
- 리워드 광고 제공 보상 개선

## 트러블슈팅

### 광고가 표시되지 않을 때
1. AdMob App ID가 올바르게 설정되었는지 확인
2. Ad Unit ID가 올바르게 설정되었는지 확인
3. 빌드 후 충분한 시간(1-2시간) 대기
4. 디바이스의 인터넷 연결 확인
5. 개발 모드에서는 테스트 광고 ID 사용 확인

### 오류 메시지 확인
```javascript
// 개발 모드에서 콘솔 로그 확인
if (__DEV__) console.log('광고 로드 실패:', error);
```

## 참고 자료
- [react-native-google-mobile-ads 공식 문서](https://docs.page/invertase/react-native-google-mobile-ads)
- [Google AdMob 공식 가이드](https://admob.google.com/home/resources/)
- [Expo 광고 통합 가이드](https://docs.expo.dev/guides/using-google-mobile-ads/)

## 연락처
문의사항이 있으시면 개발자에게 연락해주세요.
