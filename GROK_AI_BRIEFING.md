# DeepLog App - Complete Technical Briefing for AI Analysis

> 이 문서는 AI(Grok 등)가 DeepLog 앱을 100% 이해할 수 있도록 작성된 종합 브리핑입니다.

---

## 1. APP OVERVIEW

| 항목 | 내용 |
|------|------|
| **앱 이름** | DeepLog (속마음 노트) |
| **버전** | 1.3.8 |
| **플랫폼** | iOS / Android (React Native + Expo) |
| **번들 ID** | `com.wodnjs3418.TestApp` |
| **주요 기능** | AI 기반 감정 추적 & 멘탈 케어 |
| **타겟 사용자** | 감정 일기를 쓰고 싶은 한국/영어권 사용자 |
| **수익 모델** | 프리미엄 (미구현, `isPremium: false` stub) |

---

## 2. TECH STACK

```
Framework:     React Native 0.79.5 + Expo SDK 53
UI:            React 19.0.0
Language:      JavaScript (TypeScript 설정 있으나 미사용)
AI:            OpenAI GPT-4o-mini
Storage:       AsyncStorage (로컬) + XOR 암호화
Auth:          expo-local-authentication (생체인증)
Notifications: expo-notifications
Animation:     Lottie, Animated API
```

### 주요 Dependencies
```json
{
  "expo": "^53.0.22",
  "react": "19.0.0",
  "react-native": "0.79.5",
  "openai": "^5.16.0",
  "crypto-js": "^4.2.0",
  "@react-native-async-storage/async-storage": "^2.1.2",
  "expo-secure-store": "~14.2.4",
  "expo-local-authentication": "~16.0.5",
  "expo-notifications": "~0.31.4",
  "lottie-react-native": "7.2.2",
  "expo-linear-gradient": "~14.1.5"
}
```

---

## 3. FILE STRUCTURE

```
C:\Users\dhwod\a\
├── App.js                              # 앱 진입점 (스플래시 3초)
├── src/
│   ├── HealingEmotionApp.jsx           # 메인 컴포넌트 (7,586줄 - 모놀리식)
│   ├── components/
│   │   ├── Card.jsx                    # 재사용 카드 UI
│   │   ├── CollapsibleText.jsx         # 접을 수 있는 텍스트
│   │   ├── ConsentScreen.jsx           # 개인정보 동의 화면
│   │   ├── EmotionWheel.jsx            # 원형 감정 선택기
│   │   ├── FloatingActions.jsx         # 플로팅 액션 버튼
│   │   ├── PromptChips.jsx             # 빠른 감정 버튼
│   │   ├── RemainingBadge.jsx          # 사용량 배지
│   │   ├── SparseSample.jsx            # 미니멀 UI
│   │   ├── StreakCalendar.jsx          # 스트릭 캘린더
│   │   ├── WeeklyReport.jsx            # 주간 리포트 v1
│   │   ├── WeeklyReport2.jsx           # 주간 리포트 v2 (사용 중)
│   │   └── WidgetPreview.jsx           # 위젯 미리보기
│   ├── services/
│   │   ├── openai.js                   # OpenAI API 통합 (⚠️ API 키 하드코딩)
│   │   └── notifications.js            # 푸시 알림 서비스
│   ├── utils/
│   │   ├── analytics.js                # 이벤트 로깅
│   │   ├── cryptoExport.js             # AES-CTR+HMAC 백업 암호화
│   │   ├── emotions.js                 # 위기 감지 & 명언
│   │   ├── rateLimiter.js              # API 제한 (시간/일/주)
│   │   ├── safeHaptics.js              # 햅틱 피드백
│   │   ├── safeIntl.js                 # 국제화 헬퍼
│   │   ├── secureStorage.js            # XOR 암호화 스토리지
│   │   └── storage.js                  # AsyncStorage 래퍼
│   ├── styles/
│   │   └── styles.js                   # 디자인 시스템
│   └── constants/
│       ├── helplines.js                # 위기 상담 전화번호
│       └── translations.js             # 한국어/영어 번역
├── locales/
│   ├── ko.json                         # 한국어 로케일
│   └── en.json                         # 영어 로케일
├── assets/
│   ├── icon.png, splash.png            # 앱 아이콘/스플래시
│   ├── animations/otro_oso_cropped.json # 곰 캐릭터 Lottie
│   └── fonts/시네마M.ttf                # 한글 폰트
├── app.config.js                       # Expo 설정
├── eas.json                            # EAS Build 설정
└── package.json                        # 의존성
```

---

## 4. ARCHITECTURE

### 4.1 Navigation (탭 기반)
```
┌─────────────────────────────────────┐
│           HealingEmotionApp         │
├─────────────────────────────────────┤
│  [Home]  [History]  [Insights]  [Settings]
│    │         │          │           │
│   감정입력   기록검색    주간분석    설정관리
│   AI채팅    휴지통      스트릭      백업/잠금
└─────────────────────────────────────┘
```

### 4.2 State Management
**50개 이상의 useState 훅** (Redux/Context 미사용)

```javascript
// 핵심 상태 (src/HealingEmotionApp.jsx)
const [currentTab, setCurrentTab] = useState('home');
const [emotionText, setEmotionText] = useState('');
const [emotionHistory, setEmotionHistory] = useState([]);
const [isAppLocked, setIsAppLocked] = useState(true);
const [language, setLanguage] = useState('ko');
const [dailyDiaryCount, setDailyDiaryCount] = useState(0);
const [dailyChatTurns, setDailyChatTurns] = useState(0);
const [streak, setStreak] = useState(0);
const [recoveryTokens, setRecoveryTokens] = useState(2);
const [chatHistory, setChatHistory] = useState([]);
const [isPremium, setIsPremium] = useState(false); // 미구현
const [userName, setUserName] = useState('');
// ... 40개 이상 추가 상태
```

### 4.3 Data Flow
```
User Input → OpenAI API → Emotion Analysis (JSON)
                ↓
        Local AsyncStorage (XOR 암호화)
                ↓
        History / Analytics Display
```

---

## 5. CORE FEATURES

### 5.1 감정 기록 (Daily Journaling)
- **제한**: 하루 1회, 500자
- **입력**: 자유 텍스트 + 빠른 감정 선택 (6개)
- **저장**: 로컬 AsyncStorage (암호화)

### 5.2 AI 감정 분석
```javascript
// src/services/openai.js - analyzeEmotion()
// 반환 스키마:
{
  emotionKey: "JOY|CALM|OK|LONELY|ANXIOUS|SAD",
  emotion_ko: "기쁨|평온|무난|외로움|불안|슬픔",
  emotion_en: "Good|Calm|Okay|Lonely|Anxious|Sad",
  intensity: 1-5,
  comfort_ko: "위로 메시지 (반말)",
  comfort_en: "Comfort message",
  solution_ko: "증거 기반 해결책 (CBT, 호흡법 등)",
  solution_en: "Evidence-based solution",
  isCrisis: true|false
}
```

### 5.3 AI 채팅
- **제한**: 하루 5턴
- **히스토리**: 세션별 저장
- **요약**: 3-5단어 자동 제목 생성

### 5.4 스트릭 시스템
- 연속 기록 카운터
- 월 2회 복구 토큰
- 빼먹은 날 토큰으로 복구 가능

### 5.5 주간 리포트
- 7일 감정 분포 분석
- 가장 많은 감정 식별
- 이미지로 공유 (view-shot)

### 5.6 위기 감지
```javascript
// src/utils/emotions.js
const CRISIS_PATTERNS = [
  /죽고\s*싶|자살|극단적\s*선택|세상\s*떠나/i,  // 한국어
  /suicide|kill myself|end my life|self-harm/i   // 영어
];
// 감지 시 → 긴급연락처 모달 표시 (1393, 988 등)
```

### 5.7 보안
- **앱 잠금**: Face ID / 지문 (expo-local-authentication)
- **데이터 암호화**: XOR (취약) + AES-CTR+HMAC (백업)
- **동의 관리**: GDPR 스타일 동의 화면

---

## 6. OPENAI INTEGRATION

### 6.1 API 설정
```javascript
// src/services/openai.js
const OPENAI_API_KEY = "sk-proj-rA86j..."; // ⚠️ 하드코딩됨 - 보안 위험!
const MODEL = "gpt-4o-mini";
```

### 6.2 시스템 프롬프트 (감정 분석)
```
너는 감정 코치다. 출력 규칙을 절대 어기지 마라.

[핵심 규칙]
1) 한국어 출력은 무조건 반말. 해요체/하십시오체/존댓말 절대 금지.
2) 영어 출력은 친한 친구가 진심으로 위로할 때의 톤.
3) 형식은 JSON "한 줄"만. 그 외 텍스트/설명 금지.
4) 감정 라벨: JOY, CALM, OK, LONELY, ANXIOUS, SAD 중 택1
5) intensity는 1~5 정수
6) 위기신호(isCrisis)는 자/타해, 자살 표현이면 true

[응답 깊이 조절]
- intensity 1-2: comfort 2-3문장, solution 1문단
- intensity 3+: comfort 4-5문장, solution 3문단 (지금→오늘→장기)
- isCrisis=true: 깊이 있는 응답 + 전문가 상담 권유

[해결방안 원칙]
- 증거 기반 심리치료 기법만: CBT, 행동활성화, 그라운딩, 호흡법
- 추상적 조언("긍정적으로 생각해") 절대 금지
- 구체적 실행 방법(시간, 횟수) 명시
```

### 6.3 채팅 시스템 프롬프트
```
너는 친구처럼 편하게 대화하는 감정 코치야.
반말로 대화하고, 공감하며 구체적인 조언을 해줘.
2-3문장으로 간결하게 답해줘.
```

---

## 7. DESIGN SYSTEM

### 7.1 Color Palette
```javascript
const DESIGN = {
  colors: {
    bgGradient: ['#0D1117', '#0D1117', '#0D1117'],  // Deep Navy
    cardBg: 'rgba(255, 255, 255, 0.03)',
    primary: '#C9A962',                              // Gold accent
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',

    emotions: {
      great: '#4ADE80',   // JOY/CALM - Green
      good: '#60D4AE',    // Teal
      meh: '#FBBF24',     // OK/LONELY - Yellow
      bad: '#F97316',     // ANXIOUS - Orange
      sad: '#8B5CF6',     // SAD - Purple
    }
  }
};
```

### 7.2 Typography
```javascript
typography: {
  title: { size: 26, weight: '200', letterSpacing: 1 },
  subtitle: { size: 15, weight: '300', letterSpacing: 0.5 },
  body: { size: 15, weight: '400', lineHeight: 24 },
  caption: { size: 12, weight: '400', letterSpacing: 0.8 },
}
```

### 7.3 Design Philosophy
- **Premium Minimal Dark**: 깊은 다크 배경 + 골드 액센트
- **Glass Morphism**: 반투명 카드 + 서브틀 그라데이션
- **4px Base Unit**: spacing.xs=4, sm=8, md=16, lg=24

---

## 8. LOCALIZATION

### 8.1 지원 언어
- 한국어 (기본)
- 영어

### 8.2 주요 번역 키
```javascript
// src/constants/translations.js
translations = {
  ko: {
    appTitle: '속마음 노트',
    greetings: ['오늘 어땠어?', '많이 힘들었지?', '오늘도 버텼네', ...],
    emotionPlaceholder: '지금 느끼는 감정을 자유롭게 표현해봐...',
    dailyLimitReached: '오늘은 이미 감정일기를 작성했어. 내일 다시 작성해봐!',
    crisisTitle: '당신의 안전이 가장 소중해요',
    quickEmotions: [
      { emoji: '😊', text: '기쁨' },
      { emoji: '😌', text: '평온' },
      { emoji: '😢', text: '슬픔' },
      { emoji: '😰', text: '불안' },
      { emoji: '😔', text: '외로움' },
      { emoji: '😫', text: '피곤' },
    ],
    // ... 200+ 키
  },
  en: { ... }
}
```

---

## 9. RATE LIMITING

```javascript
// src/utils/rateLimiter.js
HOURLY_LIMIT = 2
DAILY_LIMIT = 5
WEEKLY_LIMIT = 20
MIN_INTERVAL = 30 seconds

// 이상 행동 감지 시 24시간 블록
```

---

## 10. ENCRYPTION

### 10.1 로컬 스토리지 (XOR - 취약)
```javascript
// src/utils/secureStorage.js
function simpleEncrypt(data, key) {
  for (let i = 0; i < dataBytes.length; i++) {
    encryptedBytes[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }
}
// ⚠️ XOR은 암호학적으로 안전하지 않음
```

### 10.2 백업 암호화 (AES-CTR+HMAC - 양호)
```javascript
// src/utils/cryptoExport.js
// PBKDF2: 100,000 iterations
// AES-CTR + HMAC-SHA256 (인증된 암호화)
```

---

## 11. CRITICAL ISSUES

### 11.1 보안 취약점 (CRITICAL)
| 심각도 | 문제 | 위치 |
|--------|------|------|
| **CRITICAL** | OpenAI API 키 하드코딩 | `src/services/openai.js:4` |
| **HIGH** | XOR 암호화 (쉽게 깨짐) | `src/utils/secureStorage.js` |
| **MEDIUM** | Base64 폴백 (암호화 아님) | `secureStorage.js:61` |

### 11.2 아키텍처 문제 (HIGH)
- **7,586줄 모놀리식 컴포넌트** (`HealingEmotionApp.jsx`)
- **50+ useState** (상태 관리 복잡)
- **테스트 코드 없음**
- **Error Boundary 없음**

### 11.3 기능 제한
- 하루 1회 감정 기록
- AI 채팅 5턴/일
- 클라우드 동기화 없음
- HealthKit/Google Fit 연동 없음
- 프리미엄 기능 미구현

---

## 12. CODE SAMPLES

### 12.1 감정 분석 호출
```javascript
// src/services/openai.js - analyzeEmotion()
export async function analyzeEmotion(text, isAnonymous = false, userName = null) {
  const detectedLang = detectMainLanguage(text);
  const messages = buildMessages(text, userName);
  const jsonLine = await chat(messages);
  const raw = safeParse(jsonLine);

  // 필수 필드 보정
  const emotionKey = normalizeEmotionKey(raw.emotionKey);
  const result = {
    emotionKey,
    emotion_ko: raw.emotion_ko || mapKo[emotionKey],
    comfort_ko: raw.comfort_ko || "힘든 시간이구나. 내가 옆에 있어.",
    solution_ko: raw.solution_ko || "4-7-8 호흡법을 해봐...",
    intensity: Math.min(5, Math.max(1, parseInt(raw.intensity || 3))),
    isCrisis: !!raw.isCrisis,
  };

  // 반말 강제 (요/입니다 제거)
  const dePolite = s => s.replace(/요\b/g, "").replace(/입니다/g, "야");
  result.comfort_ko = dePolite(result.comfort_ko);

  return result;
}
```

### 12.2 스트릭 캘린더 로직
```javascript
// src/components/StreakCalendar.jsx
const recordedDates = useMemo(() => {
  const dates = new Set();
  emotionHistory.forEach(entry => {
    if (!entry.deletedAt && entry.date) {
      dates.add(getLocalDateKey(new Date(entry.date)));
    }
  });
  return dates;
}, [emotionHistory]);
```

### 12.3 위기 감지
```javascript
// src/utils/emotions.js
export const isCrisis = (text) => {
  return CRISIS_PATTERNS.some(pattern => pattern.test(text));
};
// 한국어: 죽고싶, 자살, 극단적선택
// 영어: suicide, kill myself, self-harm
```

---

## 13. EMOTION DATA STRUCTURE

```javascript
// emotionHistory 배열의 각 항목
{
  id: "uuid-v4",
  date: "2025-01-21T10:30:00.000Z",
  text: "오늘 많이 힘들었어...",
  emotionKey: "SAD",
  emotion: "슬픔",
  emotion_ko: "슬픔",
  emotion_en: "Sad",
  intensity: 4,
  comfort: "힘든 시간이구나...",
  comfort_ko: "...",
  comfort_en: "...",
  solution: "4-7-8 호흡법을...",
  solution_ko: "...",
  solution_en: "...",
  isCrisis: false,
  deletedAt: null  // 삭제 시 timestamp
}
```

---

## 14. APP CONFIG

```javascript
// app.config.js
export default {
  expo: {
    name: "DeepLog",
    slug: "TestApp",
    version: "1.3.8",
    ios: {
      bundleIdentifier: "com.wodnjs3418.TestApp",
      buildNumber: "36",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        CFBundleLocalizations: ["ko", "en"]
      }
    },
    android: {
      package: "com.wodnjs3418.TestApp",
      versionCode: 33,
      edgeToEdgeEnabled: true
    },
    scheme: "deeplogquickwrite"  // 딥링크
  }
}
```

---

## 15. QUALITY SCORES

| 항목 | 점수 | 비고 |
|------|------|------|
| 아키텍처 | 3/10 | 모놀리식, 리팩토링 필요 |
| 보안 | 2/10 | API 키 노출, 약한 암호화 |
| 테스트 | 0/10 | 테스트 없음 |
| UI/UX | 8/10 | 프리미엄 다크 테마, 잘 됨 |
| 기능 완성도 | 7/10 | 핵심 기능 OK, 고급 기능 부족 |
| **종합** | **4.2/10** | |

---

## 16. RECOMMENDED IMPROVEMENTS

### 즉시 (1-2주)
1. OpenAI API 키 → 백엔드 프록시로 이동
2. XOR → AES-GCM (expo-crypto)
3. Error Boundary 추가

### 단기 (1개월)
1. HealingEmotionApp.jsx 분리 (탭별 컴포넌트)
2. Context API 또는 Zustand 도입
3. TypeScript 마이그레이션
4. 유닛 테스트 추가

### 중기 (2-3개월)
1. 클라우드 백업 (Firebase/Supabase)
2. HealthKit/Google Fit 연동
3. 프리미엄 기능 구현 (IAP)
4. 오프라인 AI (TensorFlow Lite)

---

## 17. COMPETITOR COMPARISON

| 기능 | DeepLog | Calm | Headspace |
|------|---------|------|-----------|
| AI 감정 분석 | ✅ GPT-4o-mini | ❌ | ❌ |
| AI 채팅 | ✅ 5턴/일 | ❌ | ❌ |
| 오디오 명상 | ❌ | ✅ | ✅ |
| 수면 추적 | ❌ | ✅ | ✅ |
| 웨어러블 연동 | ❌ | ✅ | ✅ |
| 한국어 특화 | ✅ | △ | △ |
| 가격 | 무료 (프리미엄 미구현) | $70/년 | $70/년 |

---

## 18. SUMMARY FOR AI ANALYSIS

**DeepLog**는:
- React Native + Expo 기반 감정 추적 앱
- OpenAI GPT-4o-mini로 감정 분석 및 위로 메시지 생성
- 한국어 반말 톤에 최적화된 프롬프트
- 프리미엄 다크 테마 UI (골드 액센트)
- 7,586줄 모놀리식 구조 (리팩토링 필요)
- **핵심 보안 문제**: API 키 하드코딩, XOR 암호화
- **경쟁력**: AI 감정 분석 + 한국어 특화 (Calm/Headspace에 없음)
- **약점**: 오디오 콘텐츠 없음, 클라우드 동기화 없음, 테스트 없음

---

*이 문서는 2025-01-21 기준으로 작성되었습니다.*
*버전: 1.3.8 (iOS build 36, Android versionCode 33)*
