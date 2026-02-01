import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    Pressable,
    ScrollView,
    Modal,
    Dimensions,
    Alert,
    Animated,
    Platform,
    KeyboardAvoidingView,
    StatusBar,
    ActivityIndicator,
    FlatList,
    Linking,
    Share,
    Image,
    ImageBackground,
    PanResponder,
    BackHandler,
    AppState,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { hapticSuccess, hapticError, safeHapticImpact, safeHapticNotification } from './utils/safeHaptics';
// Android 전용 모듈 - 조건부 로드
let NavigationBar = null;
if (Platform.OS === 'android') {
    NavigationBar = require('expo-navigation-bar');
}
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { translations, t } from './constants/translations';
import { HELPLINES, TRASH_TTL_DAYS } from './constants/helplines';
import { isCrisis, getContextualQuote } from './utils/emotions';
import { analyzeEmotion, chatWithAI, summarizeChat } from './services/openai';
import 'react-native-get-random-values';
import { loadData as loadStorageData, saveData as saveStorageData } from './utils/storage';
import { saveEncryptedData, loadEncryptedData, checkUserConsent, checkOpenAIConsent, exportUserData, revokeConsent, deleteAllEncryptedData } from './utils/secureStorage';
import { registerForPushNotificationsAsync, scheduleLocalNotification, scheduleDailyNotification, addNotificationResponseReceivedListener, removeNotificationListener } from './services/notifications';
import Constants from 'expo-constants';

// Expo Go 환경 체크
const isExpoGo = Constants.appOwnership === 'expo';
let Notifications = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('Notifications not available in Expo Go');
  }
}
import { encryptBackupData_CTR_HMAC, decryptBackupData_CTR_HMAC } from './utils/cryptoExport';
import Card from './components/Card';
import ConsentScreen from './components/ConsentScreen';
import PromptChips from './components/PromptChips';
import RemainingBadge from './components/RemainingBadge';
import SparseSample from './components/SparseSample';
import CollapsibleText from './components/CollapsibleText';
import EmotionWheel from './components/EmotionWheel';
import FloatingActions from './components/FloatingActions';
import StreakCalendar from './components/StreakCalendar';
import WeeklyReport from './components/WeeklyReport2';
import UpdatePrompt from './components/UpdatePrompt';
import analytics from './utils/analytics';
import * as StoreReview from 'expo-store-review';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
// import { Settings } from 'react-native-fbsdk-next';
import SettingsTab from './components/SettingsTab';


const { width, height } = Dimensions.get('window');

// 라인 단위로 '툭툭' 늘어나는 AutoGrow TextInput
const AutoGrowInput = ({
  value,
  onChangeText,
  minRows = 1,     // 최소 줄 수
  maxRows = 8,     // 최대 줄 수 (여기 넘으면 스크롤)
  lineHeight = 24, // 글자 라인 높이(스타일과 일치시켜야 "한 칸"이 맞음)
  style,
  ...props
}) => {
  // padding 합계(위+아래). 너 스타일에 맞춰 숫자만 바꿔주면 됨.
  const verticalPadding = 10; // emotionInputSimple.paddingVertical(5) * 2

  // 초기 높이: 최소 줄 수 기준
  const minH = minRows * lineHeight + verticalPadding;
  const maxH = maxRows * lineHeight + verticalPadding;
  const [height, setHeight] = useState(minH);

  const onSize = (e) => {
    const raw = e.nativeEvent.contentSize.height;        // 실제 텍스트 높이
    const snapped = Math.ceil(raw / lineHeight) * lineHeight; // 라인 단위 스냅
    const clamped = Math.max(minRows * lineHeight, Math.min(snapped, maxRows * lineHeight));
    setHeight(clamped + verticalPadding);
  };

  return (
    <TextInput
      multiline
      value={value}
      onChangeText={onChangeText}
      onContentSizeChange={onSize}
      // maxRows 이하면 스크롤 비활성 → 자연 확장, 초과하면 스크롤
      scrollEnabled={height >= maxH}
      style={[
        // 줄바꿈 기준이 되는 lineHeight를 반드시 스타일과 맞춰야 함
        { height, lineHeight, textAlignVertical: 'top' },
        style,
      ]}
      {...props}
    />
  );
};

// ============================================
// 🎨 DESIGN TOKENS - Premium Minimal Dark
// ============================================
const DESIGN = {
    colors: {
        // 배경 (깊은 다크)
        bgGradient: ['#0D1117', '#0D1117', '#0D1117'],
        bgCard: '#161B22',

        // 카드 (미묘한 구분)
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBgSolid: '#161B22',
        cardBorder: 'rgba(255, 255, 255, 0.06)',
        cardShadow: 'rgba(0, 0, 0, 0.5)',

        // 텍스트 (화이트 계층)
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.6)',
        textMuted: 'rgba(255, 255, 255, 0.35)',
        textOnDark: '#FFFFFF',

        // 액센트 (골드 - 고급스러움)
        primary: '#C9A962',
        primaryLight: '#D4BC7D',
        accent: '#B8985A',

        // CTA 버튼
        ctaGradient: ['#C9A962', '#B8985A'],
        ctaDisabled: 'rgba(255, 255, 255, 0.08)',

        // 감정 색상 (muted)
        emotions: {
            great: '#4ADE80',
            good: '#60D4AE',
            meh: '#FBBF24',
            bad: '#F97316',
            sad: '#8B5CF6',
        },
    },

    typography: {
        // 우아한 폰트
        title: { size: 26, weight: '200', letterSpacing: 1 },
        subtitle: { size: 15, weight: '300', letterSpacing: 0.5 },
        body: { size: 15, weight: '400', lineHeight: 24 },
        caption: { size: 12, weight: '400', letterSpacing: 0.8 },
        button: { size: 14, weight: '500', letterSpacing: 1 },
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 999,
    },

    shadows: {
        soft: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};

// 언어 독립적 감정 키 시스템
const EMOTIONS = {
    JOY:     { ko: '기쁨',   en: 'Good',   color: DESIGN.colors.emotions.great, order: 1 },
    CALM:    { ko: '평온',   en: 'Calm',   color: DESIGN.colors.emotions.good, order: 2 },
    OK:      { ko: '무난',   en: 'Okay',   color: DESIGN.colors.emotions.meh, order: 3 },
    LONELY:  { ko: '외로움', en: 'Lonely', color: DESIGN.colors.emotions.meh, order: 4 },
    ANXIOUS: { ko: '불안',   en: 'Anxious', color: DESIGN.colors.emotions.bad, order: 5 },
    SAD:     { ko: '슬픔',   en: 'Sad',    color: DESIGN.colors.emotions.sad, order: 6 },
};

const toEmotionKey = (label = '') => {
    const s = `${label}`.toLowerCase();
    if (['좋아','기쁨','행복','good','happy','great'].some(v=>s.includes(v))) return 'JOY';
    if (['평온','차분','calm','peaceful'].some(v=>s.includes(v))) return 'CALM';
    if (['괜찮','무난','ok','okay','fine'].some(v=>s.includes(v))) return 'OK';
    if (['외로','lonely'].some(v=>s.includes(v))) return 'LONELY';
    if (['불안','anxious','worried','stressed'].some(v=>s.includes(v))) return 'ANXIOUS';
    if (['슬픔','슬퍼','sad','depressed'].some(v=>s.includes(v))) return 'SAD';
    return 'OK'; // 기본값
};

// 감정 입력 컴포넌트 (App 밖으로 이동하여 재마운트 방지)
const EmotionInput = memo(function EmotionInput({ t, onSubmit, disabled, resetSeq, dailyCount, language, onTextChange, currentText }) {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const inputRef = useRef(null);

    // 회전형 플레이스홀더 - 직접 translations 객체 사용
    const placeholders = useMemo(() => {
        const lang = language || 'ko';
        return [
            translations[lang].emotionPlaceholder1,
            translations[lang].emotionPlaceholder2,
            translations[lang].emotionPlaceholder3,
            translations[lang].emotionPlaceholder4,
        ];
    }, [language]);

    // resetSeq 변경 시에만 초기화
    useEffect(() => { 
        if (resetSeq > 0) {
            onTextChange?.(''); // 리셋 시 부모 state도 초기화
        }
    }, [resetSeq, onTextChange]);

    // 플레이스홀더 로테이션은 별도 useEffect
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    const handleTextChange = (newText) => {
        onTextChange?.(newText);
    };


    return (
        <View style={styles.inputContainer}>
            {/* 외부 하얀 테두리 (디자인용) */}
            <View style={styles.inputBubbleOuter}>
                <AutoGrowInput
                    value={currentText}
                    onChangeText={handleTextChange}
                    minRows={1}
                    maxRows={8}
                    lineHeight={22}
                    placeholder=""
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.emotionInputSimple}
                    maxLength={500}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    autoCorrect={false}
                    keyboardType="default"
                />
            </View>

            {/* 카운터 별도 행 */}
            <View style={styles.inputCounterRow}>
                <Text style={styles.dailyUsage}>{translations[language || 'ko'].dailyDiaryUsage}: {dailyCount}/1</Text>
                {currentText.length > 0 && (
                    <Text style={styles.charCount}>{currentText.length}/500</Text>
                )}
            </View>
        </View>
    );
});

export default function App() {
    // 상태 관리
    const [currentTab, setCurrentTab] = useState('home');
    const [tabClickCount, setTabClickCount] = useState(0); // 강제 리렌더용
    const [emotionText, setEmotionText] = useState('');
    const [inputResetSeq, setInputResetSeq] = useState(0);
    const [selectedQuickEmotion, setSelectedQuickEmotion] = useState(null);
    const [emotionHistory, setEmotionHistory] = useState([]);
    const [isAppLocked, setIsAppLocked] = useState(true);
    const [appLockEnabled, setAppLockEnabled] = useState(false);
    const [language, setLanguage] = useState('ko');
    const [completedActivities, setCompletedActivities] = useState({}); // 완료된 활동들 {activityId: true/false}
    const [selectedEmotion, setSelectedEmotion] = useState(null);
    
    // 고정된 네이비 테마 색상 (별빛 효과와 함께)
    const themeColors = {
        primary: ['#1e293b', '#0f172a'],
        secondary: ['#334155', '#475569']
    };
    
    // 별빛 애니메이션
    const [stars, setStars] = useState([]);
    const starAnimations = useRef([]);
    const scrollViewRef = useRef(null);
    const chatScrollViewRef = useRef(null);
    const inputRef = useRef(null);
    const [showAnonymousModal, setShowAnonymousModal] = useState(false);
    const [anonymousText, setAnonymousText] = useState('');
    const [anonymousResult, setAnonymousResult] = useState(null);
    // AI 채팅 관련 state
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [dailyChatTurns, setDailyChatTurns] = useState(0);
    const [sessionChatTurns, setSessionChatTurns] = useState(0);
    const [isPremium, setIsPremium] = useState(false); // 나중에 IAP로 관리
    const [savedChatSessions, setSavedChatSessions] = useState([]); // 저장된 채팅 기록
    const [showChatHistory, setShowChatHistory] = useState(false); // 채팅 기록 모달
    const [currentSessionId, setCurrentSessionId] = useState(null); // 현재 활성 세션 ID
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showShortInputConfirm, setShowShortInputConfirm] = useState(false);
    const [showShortDiaryConfirm, setShowShortDiaryConfirm] = useState(false);
    const [showResultSheet, setShowResultSheet] = useState(false);
    const [dailyDiaryCount, setDailyDiaryCount] = useState(0);
    const [dailyAnonymousCount, setDailyAnonymousCount] = useState(0);
    const [lastDiaryDate, setLastDiaryDate] = useState('');
    const [currentResult, setCurrentResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showTrash, setShowTrash] = useState(false);
    const [showCrisisModal, setShowCrisisModal] = useState(false);
    const [showConsentScreen, setShowConsentScreen] = useState(false);
    const [hasUserConsent, setHasUserConsent] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteItemId, setDeleteItemId] = useState(null);
    const [showAnonymousConfirm, setShowAnonymousConfirm] = useState(false);
    const [streak, setStreak] = useState(0);
    const [recoveryTokens, setRecoveryTokens] = useState(2); // 월 2개 만회 토큰
    const [selectedFilter, setSelectedFilter] = useState('ALL'); // 내부적으로는 고정값 사용
    const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [backupPassword, setBackupPassword] = useState('');
    const [currentInputText, setCurrentInputText] = useState('');
    const [showImportPasswordModal, setShowImportPasswordModal] = useState(false);
    const [importPassword, setImportPassword] = useState('');
    const [importFileContent, setImportFileContent] = useState(null);
    const [userName, setUserName] = useState('');
    const [showNameInputModal, setShowNameInputModal] = useState(false);
    const [showNameChangeModal, setShowNameChangeModal] = useState(false);
    const [tempNameInput, setTempNameInput] = useState('');

    // 세션별 고정 인사말 (언어 변경 시 업데이트)
    const [greetingIndex] = useState(() => Math.floor(Math.random() * translations.ko.greetings.length));

    const [greetingSubIndex] = useState(() => Math.floor(Math.random() * translations.ko.greetingSubs.length));
    
    const sessionGreeting = translations[language || 'ko'].greetings[greetingIndex];
    const sessionGreetingSub = translations[language || 'ko'].greetingSubs[greetingSubIndex];

    // 입력 텍스트 변경 핸들러 - useCallback으로 안정화
    const handleInputTextChange = useCallback((text) => {
        setCurrentInputText(text);
    }, []);

    // 매일 바뀌는 추천 활동 (날짜 기반)
    const getDailyActivities = useMemo(() => {
        const today = new Date();
        const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
        const activities = translations[language || 'ko'].dailyActivities;
        
        // 날짜를 기준으로 시드 생성하여 매일 다른 조합이지만 같은 날엔 같은 결과
        const seed = dayOfYear;
        const shuffled = [...activities];
        
        // 간단한 시드 기반 셔플
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = (seed * (i + 1)) % shuffled.length;
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        // 매일 3개씩 선택
        return shuffled.slice(0, 3);
    }, [language]);

    // 애니메이션
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const sheetAnim = useRef(new Animated.Value(height)).current;
    const cardFadeAnim = useRef(new Animated.Value(0)).current;
    const toastAnim = useRef(new Animated.Value(-100)).current;

    // 바텀시트 드래그 제스처
    const DRAG_CLOSE_THRESHOLD = 120;
    const FLING_VELOCITY = 0.8;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (e) => {
                // 상단 32px 영역(grabber 구역)에서만 제스처 활성화
                const { locationY } = e.nativeEvent;
                return locationY <= 32;
            },
            onMoveShouldSetPanResponder: (e, g) => {
                const { locationY } = e.nativeEvent;
                return locationY <= 32 && g.dy > 4;
            },
            onPanResponderGrant: () => {
                sheetAnim.stopAnimation();
            },
            onPanResponderMove: (_, g) => {
                const y = Math.max(0, g.dy);
                sheetAnim.setValue(y);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > DRAG_CLOSE_THRESHOLD || g.vy > FLING_VELOCITY) {
                    closeResultSheet();
                } else {
                    Animated.spring(sheetAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 5,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true }).start();
            },
        })
    ).current;

    // 디바운스 저장
    const saveTimeoutRef = useRef(null);

    // 번역 함수 - useMemo로 안정화
    const translate = useMemo(() => t(translations, language), [language]);

    // 맥락적 명언
    const todayQuote = getContextualQuote(
        streak,
        emotionHistory.slice(0, 3).map(e => e.emotionKey || toEmotionKey(e.emotion)),
        language
    );

    // 토스트 메시지 표시
    const showToastMessage = useCallback((message, type = 'success') => {
        setShowToast({ show: true, message, type });
        Animated.sequence([
            Animated.timing(toastAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(2000),
            Animated.timing(toastAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start((finished) => {
            if (finished) {
                // requestAnimationFrame을 사용하여 다음 프레임에서 상태 업데이트
                requestAnimationFrame(() => {
                    setShowToast({ show: false, message: '', type: 'success' });
                });
            }
        });
    }, [toastAnim]);

    // 이 useEffect들은 함수 선언들 후에 이동됨

    // 안드로이드 네비게이션 바 숨기기 (앱 시작 시)
    useEffect(() => {
        const setupNavigationBar = async () => {
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    // 네비게이션 바 숨기기 (몰입 모드)
                    await NavigationBar.setVisibilityAsync('hidden');
                    // 투명 배경으로 설정
                    if (NavigationBar.setBackgroundColorAsync) {
                        await NavigationBar.setBackgroundColorAsync('#00000000');
                    }
                } catch (error) {
                    if (__DEV__) console.log('Navigation bar setup failed:', error);
                }
            }
        };
        setupNavigationBar();
    }, []);

    // 백그라운드 시 자동 잠금
    useEffect(() => {
        if (!appLockEnabled) return;
        const sub = AppState.addEventListener('change', (state) => {
            // 백그라운드/비활성화로 가면 잠금
            if (state !== 'active') setIsAppLocked(true);
        });
        return () => sub.remove();
    }, [appLockEnabled]);

    // 위젯 URL 처리
    useEffect(() => {
        // 앱 시작 시 URL 체크 (위젯에서 열림)
        Linking.getInitialURL().then(url => {
            if (url && url.includes('deeplogquickwrite')) {
                // 위젯에서 열림 - 홈 탭으로 이동하고 입력창 포커스
                setCurrentTab('home');
                setShowEmotion(false);
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                }, 500);
                // 위젯 탭 이벤트 로깅
                analytics.logWidgetTap();
            }
        });

        // 앱 실행 중 URL 처리
        const subscription = Linking.addEventListener('url', ({ url }) => {
            if (url.includes('deeplogquickwrite')) {
                setCurrentTab('home');
                setShowEmotion(false);
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                }, 300);
                // 위젯 탭 이벤트 로깅
                analytics.logWidgetTap();
            }
        });

        return () => subscription?.remove();
    }, []);

    // 채팅 턴 수 초기화 (로컬 시간 기준 자정에 리셋)
    useEffect(() => {
        const checkAndResetChatTurns = async () => {
            try {
                // 로컬 시간 기준 오늘 날짜 구하기 (getLocalDateKey는 나중에 정의됨)
                const today = (() => {
                    const d = new Date();
                    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                })();

                // AsyncStorage에서 마지막 사용 날짜와 턴 수 불러오기
                const lastChatDate = await AsyncStorage.getItem('lastChatDate');
                const savedDailyTurns = await AsyncStorage.getItem('dailyChatTurns');

                if (lastChatDate !== today) {
                    // 날짜가 다르면 턴 수 리셋
                    setDailyChatTurns(0);
                    await AsyncStorage.setItem('lastChatDate', today);
                    await AsyncStorage.setItem('dailyChatTurns', '0');
                } else if (savedDailyTurns) {
                    // 같은 날이면 저장된 턴 수 불러오기
                    setDailyChatTurns(parseInt(savedDailyTurns, 10));
                }
            } catch (error) {
                console.error('Failed to check chat turns:', error);
            }
        };

        checkAndResetChatTurns();
    }, []);

    // 푸시 알림 설정 (Expo Go가 아닐 때만)
    useEffect(() => {
        if (!isExpoGo && Notifications) {
            // 푸시 알림 권한 요청 및 토큰 등록
            registerForPushNotificationsAsync();

            // 일일 알림 스케줄링
            const setupDailyNotifications = async () => {
                // 권한 확인 후에만 스케줄링
                const hasPermission = await registerForPushNotificationsAsync();
                if (!hasPermission) {
                    console.log('Notification permission denied, skipping scheduling');
                    return;
                }
                
                // 기존 알림들 취소하고 새로 설정
                await Notifications.cancelAllScheduledNotificationsAsync();
                
                // 현재 시간 체크하여 오늘 이미 지난 시간은 내일부터 시작
                const now = new Date();
                const currentHour = now.getHours();
                
                // 저녁 6시 (현재 시간 이후라면 스케줄링)
                if (currentHour < 18) {
                    await scheduleDailyNotification("일기 쓸 시간이야 ✨", "오늘도 수고했어, 마음 정리하고 가자", 18, 0, true);
                }
                
                // 저녁 8시  
                if (currentHour < 20) {
                    await scheduleDailyNotification("감정 기록 안 했지? 🤔", "잊지 말고 오늘 하루도 정리해봐", 20, 0, true);
                }
                
                // 밤 10시
                if (currentHour < 22) {
                    await scheduleDailyNotification("일기 작성 잊은 거 아니지? 📖", "오늘도 하루 마무리는 확실히 하자!", 22, 0, true);
                }
                
                console.log('Daily notifications scheduled: 6PM, 8PM, 10PM (time-checked)');
            };

            setupDailyNotifications();

            // 알림 수신 리스너
            const notificationListener = Notifications.addNotificationReceivedListener(notification => {
                console.log('Notification received:', notification);
            });

            // 알림 액션 리스너
            const actionListener = addNotificationResponseReceivedListener((action, data) => {
                if (action === 'quick_write') {
                    // 빠른 기록 액션
                    setCurrentTab('home');
                    setShowEmotion(false);
                    // 입력창에 포커스
                    setTimeout(() => {
                        if (inputRef.current) {
                            inputRef.current.focus();
                        }
                    }, 300);
                }
            });
            
            // 알림 클릭 리스너 (기본)
            const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('Notification clicked:', response);
                // 알림 클릭 시 홈 탭으로 이동
                setCurrentTab('home');
            });

            return () => {
                Notifications.removeNotificationSubscription(notificationListener);
                Notifications.removeNotificationSubscription(responseListener);
                removeNotificationListener(actionListener);
            };
        } else {
            console.log('Notifications disabled in Expo Go');
        }
    }, []);

    const startAnimations = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }),
            Animated.stagger(150, [
                Animated.timing(cardFadeAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ]).start();
    };

    // 탭 전환 시 인사이트 카드 애니메이션 보장
    useEffect(() => {
        if (currentTab === 'insights') {
            Animated.timing(cardFadeAnim, {
                toValue: 1,
                duration: 350,
                useNativeDriver: true,
            }).start();
        }
    }, [currentTab, cardFadeAnim]);


    const resetAllData = async () => {
        try {
            await AsyncStorage.multiRemove(['lastRecordDateKey', 'language', 'lastChatDate', 'dailyChatTurns']);

            await SecureStore.deleteItemAsync('appLockEnabled').catch(() => {});
            await SecureStore.deleteItemAsync('emotion_app_key').catch(() => {});

            const { clearAllData } = require('./utils/storage');
            await clearAllData();
            await deleteAllEncryptedData(); // 모든 암호화 데이터 삭제 (chatSessions 포함)

            // 4) 메모리 상태 초기화
            setEmotionHistory([]);
            setStreak(0);
            setAppLockEnabled(false);
            setCompletedActivities({}); // 완료된 활동들도 초기화
            setCurrentTab('home'); // 홈 탭으로 초기화
            setDailyDiaryCount(0); // 일일 카운트 초기화
            setDailyAnonymousCount(0);
            setLastDiaryDate(''); // 마지막 기록 날짜 초기화
            setDailyChatTurns(0); // 채팅 턴 초기화
            setSessionChatTurns(0); // 세션 채팅 턴 초기화
            setChatHistory([]); // 채팅 기록 초기화
            setSavedChatSessions([]); // 저장된 채팅 세션 초기화

            // 5) 동의 상태 초기화
            setHasUserConsent(false);
            setShowConsentScreen(true);
            
            showToastMessage('✅ ' + translate('dataDeletedSuccess'));
        } catch (error) {
            console.error('Reset error:', error);
            showToastMessage(translate('deleteError'), 'error');
        }
    };

    // 데이터 로드 
    async function loadData() {
        try {
            // 사용자 동의 확인 (가장 먼저)
            const consent = await checkUserConsent();
            if (!consent) {
                setShowConsentScreen(true);
                setIsInitializing(false);
                return;
            } else {
                setHasUserConsent(true);
                setShowConsentScreen(false);
            }

            
            // 앱 잠금 설정 확인
            const lockEnabled = await SecureStore.getItemAsync('appLockEnabled');
            if (lockEnabled === 'true') {
                setAppLockEnabled(true);
                setIsAppLocked(true);
                
                // 생체인증 시도
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: translate('authPrompt'),
                    cancelLabel: translate('cancel'),
                    disableDeviceFallback: false,
                });
                
                if (result.success) {
                    setIsAppLocked(false);
                } else {
                    // 인증 실패시 앱 종료 또는 재시도
                    return;
                }
            } else {
                setIsAppLocked(false);
            }
            
            
            const data = await loadStorageData();
            if (__DEV__) console.log('Loaded data:', data);
            
            // 언어 설정 로드
            const savedLang = await AsyncStorage.getItem('language');
            if (savedLang) setLanguage(savedLang);

            // 사용자 이름 로드
            const savedName = await AsyncStorage.getItem('userName');
            if (savedName) setUserName(savedName);

            // emotionHistory는 아래에서 통합 처리
            if (data.streak) setStreak(parseInt(data.streak));
            if (data.recoveryTokens !== undefined) setRecoveryTokens(parseInt(data.recoveryTokens));
            
            // 완료된 활동들 로드
            if (data.completedActivities) {
                try {
                    const activities = JSON.parse(data.completedActivities);
                    setCompletedActivities(activities);
                } catch (e) {
                    if (__DEV__) console.log('Failed to parse completed activities:', e);
                }
            }

            // 일일 제한 카운트 체크 (날짜키 기반)
            const todayKey = getLocalDateKey();
            const savedDateKey = data.lastDiaryDateKey || '';
            const savedAnonymousCount = parseInt(data.dailyAnonymousCount) || 0;
            
            if (savedDateKey === todayKey) {
                setDailyAnonymousCount(savedAnonymousCount);
                setLastDiaryDate(todayKey); // 동일한 날일 때도 상태 설정
            } else {
                // 새로운 날이면 카운트 리셋
                setDailyAnonymousCount(0);
                setDailyDiaryCount(0);
                setLastDiaryDate(todayKey);
                
                // 매달 1일에 만회 토큰 리셋 (2개로 복원)
                const today = new Date();
                const savedDate = new Date(savedDateKey + 'T00:00:00');
                if (today.getMonth() !== savedDate.getMonth() || today.getFullYear() !== savedDate.getFullYear()) {
                    setRecoveryTokens(2);
                }
            }
            
            // 감정 히스토리 로드 (암호화된 저장소 우선)
            let history = [];
            try {
                // 암호화된 데이터 우선 시도
                const encryptedHistory = await loadEncryptedData('emotionHistory');
                if (encryptedHistory) {
                    history = encryptedHistory;
                    if (__DEV__) console.log('Loaded encrypted emotion history:', history.length, 'records');
                } else if (data.emotionHistory) {
                    // 기존 평문 데이터 호환성
                    history = typeof data.emotionHistory === 'string' 
                        ? JSON.parse(data.emotionHistory) 
                        : data.emotionHistory;
                    if (__DEV__) console.log('Loaded legacy emotion history:', history.length, 'records');
                    
                    // 기존 데이터를 암호화하여 저장 (마이그레이션)
                    if (history.length > 0) {
                        await saveEncryptedData('emotionHistory', history);
                        if (__DEV__) console.log('Migrated emotion history to encrypted storage');
                    }
                }
                
                setEmotionHistory(history);

                // 오늘 작성한 일기가 있는지 체크
                const todayEntry = history.find(entry =>
                    !entry.deletedAt &&
                    (entry.dateKey === todayKey || getLocalDateKey(new Date(entry.date)) === todayKey)
                );
                setDailyDiaryCount(todayEntry ? 1 : 0);
            } catch (error) {
                if (__DEV__) console.log('History load error:', error);
                setEmotionHistory([]);
            }

            // 채팅 세션 로드 및 마이그레이션
            try {
                const loadedSessions = await loadEncryptedData('chatSessions');
                if (loadedSessions && Array.isArray(loadedSessions)) {
                    // 마이그레이션: id가 없는 세션에 id 추가
                    let needsMigration = false;
                    const migratedSessions = loadedSessions.map(session => {
                        if (!session.id) {
                            needsMigration = true;
                            return {
                                ...session,
                                id: (session.timestamp || Date.now()).toString() + Math.random().toString(36).substr(2, 9)
                            };
                        }
                        return session;
                    });

                    setSavedChatSessions(migratedSessions);

                    // 마이그레이션이 필요했다면 즉시 저장
                    if (needsMigration) {
                        await saveEncryptedData('chatSessions', migratedSessions);
                        if (__DEV__) console.log('Migrated chat sessions with IDs');
                    }

                    if (__DEV__) console.log('Loaded chat sessions:', migratedSessions.length, 'sessions');
                } else {
                    setSavedChatSessions([]);
                }
            } catch (error) {
                if (__DEV__) console.log('Chat sessions load error:', error);
                setSavedChatSessions([]);
            }
        } catch (error) {
            if (__DEV__) console.log('Load error:', error);
            setIsAppLocked(false);
        } finally {
            setIsInitializing(false);
        }
    }

    const saveData = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                // 감정 히스토리는 암호화하여 별도 저장
                await saveEncryptedData('emotionHistory', emotionHistory);

                // 채팅 세션도 암호화하여 저장
                await saveEncryptedData('chatSessions', savedChatSessions);

                await saveStorageData({
                    streak,
                    recoveryTokens,
                    dailyAnonymousCount,
                    lastDiaryDate,
                    lastDiaryDateKey: lastDiaryDate, // 호환성을 위해 키 추가
                    completedActivities: JSON.stringify(completedActivities)
                });
            } catch (error) {
                if (__DEV__) console.log('Save error:', error);
            }
        }, 300);
    }, [emotionHistory, savedChatSessions, streak, recoveryTokens, dailyAnonymousCount, lastDiaryDate, completedActivities]);

    const handleAppLockToggle = useCallback(async () => {
        try {
            if (!appLockEnabled) {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasHardware) {
                    Alert.alert(translate('appLock'), translate('noHardware'));
                    return;
                }
                if (!isEnrolled) {
                    Alert.alert(translate('appLock'), translate('notEnrolled'));
                    return;
                }
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: translate('appLockSetPrompt'),
                    cancelLabel: translate('cancel'),
                });
                if (result.success) {
                    await SecureStore.setItemAsync('appLockEnabled', 'true');
                    setAppLockEnabled(true);
                    showToastMessage(translate('appLockEnabled'));
                }
            } else {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: translate('appLockDisablePrompt'),
                    cancelLabel: translate('cancel'),
                });
                if (result.success) {
                    await SecureStore.deleteItemAsync('appLockEnabled');
                    setAppLockEnabled(false);
                    showToastMessage(translate('appLockDisabled'));
                }
            }
        } catch (error) {
            Alert.alert(translate('confirm'), translate('authError'));
        }
    }, [appLockEnabled, translate, showToastMessage]);

    useEffect(() => {
        saveData();
        // 메모리 누수 방지: 컴포넌트 언마운트 시 타임아웃 정리
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [saveData]);

    // 휴지통 주기적 정리 (하루에 한 번)
    useEffect(() => {
        const intervalId = setInterval(purgeTrash, 24 * 60 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, []);


    // 포그라운드 복귀시 휴지통 정리 및 일일 제한 리셋 체크
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                    NavigationBar.setVisibilityAsync('hidden').catch(()=>{});
                }
                purgeTrash();
                // 날짜 변경 시 일일 제한 리셋
                const today = getLocalDateKey();
                setLastDiaryDate(prev => {
                    if (prev !== today) {
                        setDailyDiaryCount(0);
                        setDailyAnonymousCount(0);
                        // 채팅 턴도 리셋
                        setDailyChatTurns(0);
                        AsyncStorage.setItem('lastChatDate', today).catch(err => {
                            console.error('Failed to update lastChatDate:', err);
                        });
                        AsyncStorage.setItem('dailyChatTurns', '0').catch(err => {
                            console.error('Failed to update dailyChatTurns:', err);
                        });
                        return today;
                    }
                    return prev;
                });
            }
        });
        return () => subscription?.remove();
    }, []);

    // 휴지통 관리
    function purgeTrash() {
        const now = Date.now();
        setEmotionHistory(prev => prev.filter(e => {
            if (!e.deletedAt) return true;
            const ageDays = (now - new Date(e.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
            return ageDays < TRASH_TTL_DAYS;
        }));
    }

    const confirmDelete = useCallback((id) => {
        setDeleteItemId(id);
        setShowDeleteConfirm(true);
    }, []);

    const softDeleteEntry = useCallback((id) => {
        setEmotionHistory(prev =>
            prev.map(e => e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e)
        );
        showToastMessage(translate('recordDeleted'));
        hapticSuccess();
        setShowDeleteConfirm(false);
        setDeleteItemId(null);
    }, [showToastMessage, t]);

    const restoreEntry = useCallback((id) => {
        setEmotionHistory(prev =>
            prev.map(e => e.id === id ? { ...e, deletedAt: null } : e)
        );
        showToastMessage(translate('recordRestored'));
        hapticSuccess();
    }, [showToastMessage, t]);

    const deleteForever = useCallback((id) => {
        Alert.alert(
            translate('deleteForever'),
            translate('deleteConfirmMessage'),
            [
                { text: translate('cancel'), style: 'cancel' },
                {
                    text: translate('confirm'),
                    style: 'destructive',
                    onPress: () => {
                        setEmotionHistory(prev => prev.filter(e => e.id !== id));
                        showToastMessage(translate('permanentDeleted'));
                    }
                }
            ]
        );
    }, [t, showToastMessage]);

    // 일관된 탭 전환 핸들러 (UI 스레드 차단 방지)
    const handleTabSwitch = useCallback((newTab) => {
        if (currentTab !== newTab) {
            setCurrentTab(newTab);
            if (newTab === 'home') {
                setTabClickCount(prev => prev + 1);
            }
        }
    }, [currentTab]);

    // 검색 필터링 (RN/Hermes 호환성)
    const normalize = (s = '') => {
        const lower = `${s}`.toLowerCase();
        try {
            return lower.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // 표준 결합부호 제거
        } catch {
            return lower;
        }
    };

    // 로컬 날짜 키 생성 (YYYY-MM-DD 형태, 자정 경계 안전)
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const getLocalDateKey = (d = new Date()) => {
        const y = d.getFullYear();
        const m = pad(d.getMonth() + 1); // 월은 0부터 시작하므로 +1
        const day = pad(d.getDate());
        return `${y}-${m}-${day}`; // 절대 toISOString() 쓰지 않음 (UTC 변환 방지)
    };

    // 강도 설명 함수
    const getIntensityDescription = (intensity) => {
        if (intensity >= 5) return translate('intensityVeryHigh');
        if (intensity >= 4) return translate('intensityHigh');
        if (intensity >= 3) return translate('intensityMedium');
        if (intensity >= 2) return translate('intensityLow');
        return translate('intensityVeryLow');
    };

    const getFilteredHistory = useCallback(() => {
        const q = normalize(searchQuery);

        return emotionHistory
            .filter(e => !e.deletedAt)
            .filter(e => {
                if (selectedFilter !== 'ALL' && (e.emotionKey || toEmotionKey(e.emotion)) !== selectedFilter) return false;
                if (!q) return true;
                return [e.text, e.emotion, e.action].some(v => normalize(v).includes(q));
            });
    }, [emotionHistory, searchQuery, selectedFilter]);

    const getTrashItems = useCallback(() => {
        return emotionHistory.filter(e => !!e.deletedAt);
    }, [emotionHistory]);

    // 개선된 감정 트렌드 계산
    const getRecentTrend = useCallback(() => {
        const recent = emotionHistory
            .filter(e => !e.deletedAt)
            .slice(0, 7)
            .reverse();

        if (recent.length === 0) return [];

        return recent.map((entry, index) => {
            const date = new Date(entry.date);
            const key = entry.emotionKey || toEmotionKey(entry.emotion);
            const meta = EMOTIONS[key] || EMOTIONS.OK;
            
            return {
                day: formatLocalizedDate(date, { month: 'short', day: 'numeric' }),
                value: meta.order,
                emotion: (language === 'ko' ? meta.ko : meta.en),
                color: meta.color
            };
        });
    }, [emotionHistory, language]);

    // 스트릭 체크 (앱 시작 시에는 계산만, 실제 증가는 기록 시점에만)
    async function checkStreak() {
        try {
            const lastRecordDateKey = await AsyncStorage.getItem('lastRecordDateKey');
            if (!lastRecordDateKey) return;

            const todayKey = getLocalDateKey();
            
            // 앱 시작 시엔 계산만 하고 실제 증가/리셋은 기록할 때 처리
            if (lastRecordDateKey !== todayKey) {
                // 여기서는 아무것도 하지 않음. 기록 시점에 처리
            }
        } catch (error) {
            if (__DEV__) console.log('Streak check error:', error);
        }
    }


    // 안전한 날짜 포맷터 (Intl 오류 방지)
    const formatLocalizedDate = (date, options = {}) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const isKorean = language === 'ko';
        
        try {
            // 간단한 fallback 포맷
            if (isKorean) {
                return `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
            } else {
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                               'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
            }
        } catch (error) {
            return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
        }
    };

    const formatFullDate = (date) => {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        const isKorean = language === 'ko';
        
        try {
            if (isKorean) {
                const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
                const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
                return `${dateObj.getFullYear()}년 ${months[dateObj.getMonth()]}월 ${dateObj.getDate()}일 ${weekdays[dateObj.getDay()]}요일`;
            } else {
                const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
                return `${weekdays[dateObj.getDay()]}, ${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
            }
        } catch (error) {
            return dateObj.toDateString();
        }
    };

    // 안전한 URL 열기
    const openSafeURL = async (url, fallbackMsg = translate('linkError')) => {
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert(translate('confirm'), fallbackMsg);
            }
        } catch {
            Alert.alert(translate('confirm'), fallbackMsg);
        }
    };

    // 안전한 파일 백업 (암호화 옵션 포함)
    const exportSecureBackup = async () => {
        Alert.alert(
            language === 'ko' ? '🔒 백업 옵션 선택' : '🔒 Backup Options',
            language === 'ko'
                ? '데이터를 어떻게 백업하시겠습니까?\n\n🔐 암호화: 비밀번호로 안전하게 보호\n📄 평문: 암호화하지 않음 (주의 필요)'
                : 'How would you like to backup your data?\n\n🔐 Encrypted: Protected with password\n📄 Plain: No encryption (handle with care)',
            [
                { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                { text: language === 'ko' ? '평문 백업' : 'Plain Backup', style: 'default', onPress: exportPlainBackup },
                {
                    text: language === 'ko' ? '암호화 백업' : 'Encrypted Backup',
                    style: 'default',
                    onPress: () => {
                        setBackupPassword('');
                        setShowPasswordModal(true);
                    }
                }
            ]
        );
    };

    // 암호화된 백업
    const exportEncryptedBackup = async () => {
        if (!backupPassword || backupPassword.length < 4) {
            Alert.alert(
                language === 'ko' ? '비밀번호 오류' : 'Password Error',
                language === 'ko' ? '4글자 이상의 비밀번호를 입력해줘!' : 'Please enter a password with at least 4 characters.'
            );
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: language === 'ko' ? '암호화 백업을 위해 인증해줘' : 'Authenticate for encrypted backup',
                fallbackLabel: language === 'ko' ? '비밀번호 사용' : 'Use Password',
            });

            if (!result.success) {
                Alert.alert(
                    language === 'ko' ? '인증 실패' : 'Authentication Failed',
                    language === 'ko' ? '백업을 취소했어' : 'Backup cancelled.'
                );
                return;
            }

            const backup = {
                emotionHistory,
                chatSessions: savedChatSessions,
                streak,
                language,
                exportDate: new Date().toISOString(),
                encrypted: true,
            };

            // AES-CTR + HMAC 강력 암호화 (PBKDF2 + salt + iv)
            const dataString = JSON.stringify(backup);
            const encrypted = await encryptBackupData_CTR_HMAC(dataString, backupPassword);
            
            const encryptedBackup = {
                encrypted: true,
                data: encrypted,
                version: '2.1',
                exportDate: new Date().toISOString(),
            };

            const uri = FileSystem.documentDirectory + `healingemotion-encrypted-${new Date().toISOString().slice(0,10)}.ait`;
            await FileSystem.writeAsStringAsync(uri, JSON.stringify(encryptedBackup, null, 2));
            
            setShowPasswordModal(false);
            setBackupPassword('');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/octet-stream',
                    dialogTitle: language === 'ko' ? '🔐 암호화된 감정 백업 파일 (.ait)' : '🔐 Encrypted emotion backup file (.ait)',
                });
                showToastMessage(language === 'ko' ? '🔒 암호화 백업 완료!' : '🔒 Encrypted backup completed');
            } else {
                Alert.alert(
                    language === 'ko' ? '백업 완료' : 'Backup Complete',
                    language === 'ko' ? '암호화된 파일이 생성됐어' : 'Encrypted file has been created'
                );
            }
        } catch (error) {
            console.error('Encrypted backup error:', error);
            Alert.alert(
                language === 'ko' ? '오류' : 'Error',
                language === 'ko' ? '암호화 백업 중 오류가 났어' : 'An error occurred during encrypted backup.'
            );
            setShowPasswordModal(false);
            setBackupPassword('');
        }
    };

        // 평문 백업 (기존 방식)

        const exportPlainBackup = async () => {

            Alert.alert(
                language === 'ko' ? '⚠️ 평문 백업 주의' : '⚠️ Plain Backup Warning',
                language === 'ko'
                    ? '암호화되지 않은 파일로 백업돼.\n\n개인적인 감정 기록이 포함되어 있으니 안전한 장소에만 보관하고 신뢰할 수 있는 사람과만 공유해!'
                    : 'This will create an unencrypted backup file.\n\nSince it contains personal emotion records, please store it in a safe place and share only with trusted people.',
                [
                    { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                    {
                        text: language === 'ko' ? '확인 후 백업' : 'Proceed with Backup',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                const result = await LocalAuthentication.authenticateAsync({
                                    promptMessage: language === 'ko' ? '평문 백업을 위해 인증해줘' : 'Authenticate for plain backup',
                                    fallbackLabel: language === 'ko' ? '비밀번호 사용' : 'Use Password',
                                });

                                if (!result.success) {
                                    Alert.alert(
                                        language === 'ko' ? '인증 실패' : 'Authentication Failed',
                                        language === 'ko' ? '백업을 취소했어' : 'Backup cancelled.'
                                    );
                                    return;
                                }

                                

                                const backup = {

                                    emotionHistory,

                                    chatSessions: savedChatSessions,

                                    streak,

                                    language,

                                    exportDate: new Date().toISOString(),

                                    encrypted: false,

                                };

                                const uri = FileSystem.documentDirectory + `healingemotion-plain-${new Date().toISOString().slice(0,10)}.ait`;

                                await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));

                                

                                if (await Sharing.isAvailableAsync()) {

                                    await Sharing.shareAsync(uri, {

                                        mimeType: 'application/octet-stream',

                                        dialogTitle: language === 'ko' ? '📄 평문 감정 백업 파일 (.ait - 주의 필요)' : '📄 Plain emotion backup file (.ait - Handle with care)',
                                    });
                                    showToastMessage(language === 'ko' ? '평문 백업 완료!' : 'Plain text backup completed');
                                } else {
                                    Alert.alert(
                                        language === 'ko' ? '백업 완료' : 'Backup Complete',
                                        language === 'ko' ? '파일이 생성됐어' : 'File has been created'
                                    );
                                }
                            } catch (error) {
                                if (error.code === 'UserCancel') {
                                    Alert.alert(
                                        language === 'ko' ? '취소됨' : 'Cancelled',
                                        language === 'ko' ? '백업을 취소했어' : 'Backup has been cancelled.'
                                    );
                                } else {
                                    showToastMessage(language === 'ko' ? '백업 중 오류가 났어' : 'Error during backup', 'error');

                                }

                            }

                        }

                    }

                ]

            );

        };

    

        // 안전한 파일 복원 (암호화 옵션 포함)

        const importSecureBackup = useCallback(async (password = null) => {

            try {

                let fileContent = importFileContent; // 모달을 통해 들어온 경우

                if (!fileContent) {
                    showToastMessage(translate('importCanceled'), 'error');
                    return;
                }



                const parsedBackup = JSON.parse(fileContent);

                let decryptedData;

    

                if (parsedBackup.encrypted) {

                    if (!password) { // 암호화된 파일인데 비밀번호가 없는 경우

                        setImportFileContent(fileContent);

                        setShowImportPasswordModal(true);

                        return;

                    }

                    decryptedData = JSON.parse(await decryptBackupData_CTR_HMAC(parsedBackup.data, password));

                } else {

                    decryptedData = parsedBackup;

                }

    

                // 기존 데이터 초기화 및 새 데이터 로드

                await clearAllData(); // 기존 AsyncStorage 데이터 삭제

                await deleteAllEncryptedData(); // 기존 SecureStore 데이터 및 키 삭제

                // 메모리 상태 즉시 초기화
                setEmotionHistory([]);
                setStreak(0);
                setAppLockEnabled(false);
                setCompletedActivities({});
                setCurrentTab('home');
                setDailyDiaryCount(0);
                setDailyAnonymousCount(0);
                setLastDiaryDate('');
                setDailyChatTurns(0);
                setSessionChatTurns(0);
                setChatHistory([]);
                setSavedChatSessions([]);

    

                // 새 데이터 적용

                setEmotionHistory(decryptedData.emotionHistory || []);

                setStreak(parseInt(decryptedData.streak) || 0);

                setLanguage(decryptedData.language || 'ko');

                // 채팅 세션 복원 및 마이그레이션
                if (decryptedData.chatSessions && Array.isArray(decryptedData.chatSessions)) {
                    const migratedSessions = decryptedData.chatSessions.map(session => {
                        if (!session.id) {
                            return {
                                ...session,
                                id: (session.timestamp || Date.now()).toString() + Math.random().toString(36).substr(2, 9)
                            };
                        }
                        return session;
                    });
                    setSavedChatSessions(migratedSessions);
                    await saveEncryptedData('chatSessions', migratedSessions);
                }

                // 기타 필요한 상태값들 업데이트

                await AsyncStorage.setItem('language', decryptedData.language || 'ko');

                await AsyncStorage.setItem('streak', (decryptedData.streak || 0).toString());

                await saveEncryptedData('emotionHistory', decryptedData.emotionHistory || []);

    

                showToastMessage(translate('importSuccess'));

                hapticSuccess();

                setShowImportPasswordModal(false);

                setImportPassword('');

                setImportFileContent(null);

                loadData(); // 데이터 로드 함수 재호출하여 앱 상태 동기화

    

            } catch (error) {

                console.error('Import backup error:', error);

                let errorMessage = translate('importFailed');

                if (error.message.includes('Integrity check failed')) {

                    errorMessage = translate('importFailedWrongPassword');

                } else if (error.message.includes('Unsupported backup format')) {

                    errorMessage = translate('importFailedUnsupportedFormat');

                } else if (error.message.includes('Password must be at least 4 characters')) {

                    errorMessage = translate('importFailedShortPassword');

                }

                showToastMessage(errorMessage, 'error');

                hapticError();

                setShowImportPasswordModal(false);

                setImportPassword('');

                setImportFileContent(null);

            }

        }, [showToastMessage, translate, hapticSuccess, hapticError, importFileContent]);

    

        // 실제 감정 분석 수행 (짧은 입력 체크 없이)
    const performEmotionAnalysis = useCallback(async (inputText) => {

        // 일일 제한 체크
        if (dailyDiaryCount >= 1) {
            showToastMessage(translate('dailyLimitReached'), 'error');
            return;
        }

        // OpenAI 데이터 전송 동의 확인
        const hasOpenAIConsent = await checkOpenAIConsent();
        if (!hasOpenAIConsent) {
            Alert.alert(
                language === 'ko' ? '데이터 전송 동의 필요' : 'Data Transfer Consent Required',
                language === 'ko'
                    ? 'AI 감정 분석을 위해 OpenAI로 데이터를 전송해야 해.\n\n동의 화면으로 이동할까?'
                    : 'Data needs to be sent to OpenAI for AI emotion analysis.\n\nWould you like to go to the consent screen?',
                [
                    { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                    {
                        text: language === 'ko' ? '동의하기' : 'Agree',
                        style: 'default',
                        onPress: () => setShowConsentScreen(true)
                    }
                ]
            );
            return;
        }

        // 위기 감지는 AI 분석 후에 처리

        setIsSubmitting(true);
        safeHapticImpact('Light');
        
        // 일기 작성 제출 이벤트 로깅
        analytics.logWriteSubmit(inputText, inputText ? inputText.length : 0);

        try {
            // 실제 OpenAI API로 감정 분석
            const analysis = await analyzeEmotion(inputText, false, userName);
            
            // 위기상황 체크는 나중에 처리
            const now = new Date();
            const newEntry = {
                id: Date.now().toString(),
                date: now.toISOString(),
                dateKey: getLocalDateKey(now), // 로컬 날짜 키 추가
                text: inputText,
                quickEmotion: selectedQuickEmotion,
                ...analysis,
                emotionKey: analysis?.emotionKey || toEmotionKey(analysis?.emotion || selectedQuickEmotion),
                deletedAt: null,
            };

            setEmotionHistory(prev => {
                const updatedHistory = [newEntry, ...prev];
                
                // 인앱 리뷰 요청 로직 (2회마다)
                const totalRecords = updatedHistory.filter(entry => !entry.deletedAt).length;
                if (totalRecords > 0 && totalRecords % 2 === 0) {
                    // 2회, 4회, 6회, 8회... 마다 리뷰 요청
                    setTimeout(async () => {
                        try {
                            const isAvailable = await StoreReview.isAvailableAsync();
                            if (isAvailable) {
                                await StoreReview.requestReview();
                                console.log(`📝 Review requested after ${totalRecords} records`);
                            }
                        } catch (error) {
                            console.log('Review request error:', error);
                        }
                    }, 2000); // 2초 후 요청 (사용자가 결과를 확인한 후)
                }
                
                return updatedHistory;
            });
            setCurrentResult(analysis);
            
            // AI 응답 확인 이벤트 로깅
            analytics.logAiReplyView(
                analysis?.emotion || selectedQuickEmotion || 'unknown',
                analysis?.action ? analysis.action.length : 0
            );
            
            // 일일 카운트 증가 (날짜키 기반)
            const todayKey = getLocalDateKey();
            setDailyDiaryCount(1);
            setLastDiaryDate(todayKey);



            // 스트릭 업데이트 (날짜키 기반, 이중 증가 방지)
            const lastRecordDateKey = await AsyncStorage.getItem('lastRecordDateKey');
            
            if (lastRecordDateKey === todayKey) {
                // 이미 오늘 기록 있음: 스트릭 변화 없음
            } else {
                const yesterdayKey = getLocalDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
                if (lastRecordDateKey === yesterdayKey) {
                    // 연속 기록
                    setStreak(prev => {
                        const newStreak = prev + 1;
                        analytics.logStreakIncrement(newStreak);
                        return newStreak;
                    });
                } else {
                    // 연속 기록 중단 또는 첫 기록
                    setStreak(1);
                    analytics.logStreakIncrement(1);
                }
                await AsyncStorage.setItem('lastRecordDateKey', todayKey);
            }

            setSelectedQuickEmotion(null);
            
            // 🎉 즉시 피드백 시스템 (습관 형성)
            // 1. 성공 햅틱
            hapticSuccess();
            
            // 3. 20% 확률 서프라이즈 메시지
            const surpriseMessages = language === 'ko' ? [
                "✨ 대박! 오늘도 기록했네!",
                "🌟 멋져! 꾸준함이 빛난다!", 
                "🎈 와! 또 성장했구나!",
                "🏆 최고야! 계속 이 기세로!",
                "💫 짱! 마음 기록의 달인!"
            ] : [
                "✨ Amazing! You recorded again today!",
                "🌟 Awesome! Your consistency shines!",
                "🎈 Wow! You've grown again!",
                "🏆 Excellent! Keep up this momentum!",
                "💫 Great! You're a master of heart records!"
            ];
            
            const isRandomSurprise = Math.random() < 0.2; // 20% 확률
            const message = isRandomSurprise 
                ? surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)]
                : translate('recordSaved');
                
            showToastMessage(message);

            // 위기 상황도 결과 시트를 먼저 보여줌
            // 모달은 closeResultSheet에서 처리

            // 입력창 초기화 신호
            setInputResetSeq(s => s + 1);
            setCurrentInputText(''); // 입력 텍스트 초기화

            // 결과 시트 표시
            setShowResultSheet(true);
            
            // 스크롤을 상단으로 부드럽게 이동
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({
                    y: 0,
                    animated: true
                });
            }, 100);
            
            Animated.spring(sheetAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }).start();

            // 위기상황 정보는 이미 analysis에 포함되어 있음

        } catch (error) {
            console.error('Emotion analysis error:', error);
            // API 호출 오류와 기타 오류를 구분
            if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
                showToastMessage(translate('networkError'), 'error');
            } else {
                // 기타 오류는 무시하거나 다른 메시지 표시
                console.log('Non-network error, analysis might have succeeded:', error);
            }
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, analyzeEmotion, emotionHistory, showToastMessage, selectedQuickEmotion, language, translate, userName]);


    // 결과 시트 닫기
    function closeResultSheet() {
        const shouldShowCrisisModal = currentResult?.isCrisis;
        
        Animated.timing(sheetAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowResultSheet(false);
            setCurrentResult(null);
            
            // 애니메이션 완료 후 위기상황 모달 표시
            if (shouldShowCrisisModal) {
                setTimeout(() => {
                    setShowCrisisModal(true);
                }, 100); // 잠시 지연 후 모달 표시
            }
        });
    }

    // 초기화 (함수 선언 후 안전한 위치)
    useEffect(() => {
        // 앱 시작 이벤트 로깅
        analytics.logAppOpen();

        // iOS 14+ 추적 권한 요청 (Facebook SDK)
        /*
        const initFacebookSDK = async () => {
            try {
                const { Settings } = require('react-native-fbsdk-next');
                if (Settings && typeof Settings.initializeSDK === 'function') {
                    if (Platform.OS === 'ios') {
                        const { status } = await requestTrackingPermissionsAsync();
                        await Settings.initializeSDK();
                        if (status === 'granted') {
                            Settings.setAdvertiserTrackingEnabled(true);
                        }
                    } else {
                        await Settings.initializeSDK();
                    }
                } else {
                    console.warn('Facebook SDK Settings module not found, skipping initialization.');
                }
            } catch (error) {
                console.log('Facebook SDK init error:', error);
            }
        };
        initFacebookSDK();
        */
        loadData();
        startAnimations();
        purgeTrash();
        checkStreak();
    }, []);

    // Android Back Handler (closeResultSheet 선언 후 안전한 위치)
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            
            // 모달이 열려있으면 닫기
            if (showCrisisModal) {
                setShowCrisisModal(false);
                return true;
            }
            if (showAnonymousModal) {
                setShowAnonymousModal(false);
                return true;
            }
            if (showTrash) {
                setShowTrash(false);
                return true;
            }
            if (showDeleteConfirm) {
                setShowDeleteConfirm(false);
                setDeleteItemId(null);
                return true;
            }
            if (showAnonymousConfirm) {
                setShowAnonymousConfirm(false);
                return true;
            }
            if (showPasswordModal) {
                setShowPasswordModal(false);
                return true;
            }
            if (showImportPasswordModal) {
                setShowImportPasswordModal(false);
                setImportPassword('');
                setImportFileContent(null);
                return true;
            }
            if (showResultSheet) {
                closeResultSheet();
                return true;
            }
            // 홈 탭이 아니면 홈으로 이동
            if (currentTab !== 'home') {
                handleTabSwitch('home');
                return true;
            }
            // 기본 동작(앱 종료)
            return false;
        });

        return () => backHandler.remove();
    }, [showCrisisModal, showAnonymousModal, showTrash, showDeleteConfirm, showAnonymousConfirm, showResultSheet, showPasswordModal, showImportPasswordModal, currentTab, hasUserConsent]);


    // 감정 제출 (짧은 입력 체크 포함)
    const submitEmotion = useCallback(async (inputText) => {
        Keyboard.dismiss();
        if (isSubmitting || !inputText?.trim()) return;

        // 최소 20자 체크 (모달 방식)
        if (inputText.trim().length < 20) {
            setShowShortDiaryConfirm(true);
            return;
        }

        await performEmotionAnalysis(inputText);
    }, [isSubmitting, setShowShortDiaryConfirm, performEmotionAnalysis]);

    useEffect(() => {
        AsyncStorage.setItem('language', language).catch(()=>{});
    }, [language]);


    // 언어 변경시 필터 초기화 (라벨 변경으로 인한 선택 상태 꼬임 방지)
    useEffect(() => {
        setSelectedFilter('ALL');
    }, [language]);

    // 익명 위로 분석 실행
    const performAnonymousAnalysis = useCallback(async () => {
        // 일일 제한 체크
        if (dailyAnonymousCount >= 3) {
            showToastMessage(translate('dailyComfortLimitReached'), 'error');
            return;
        }

        // OpenAI 데이터 전송 동의 확인
        const hasOpenAIConsent = await checkOpenAIConsent();
        if (!hasOpenAIConsent) {
            Alert.alert(
                language === 'ko' ? '데이터 전송 동의 필요' : 'Data Transfer Consent Required',
                language === 'ko'
                    ? 'AI 위로 분석을 위해 OpenAI로 데이터를 전송해야 해.\n\n동의 화면으로 이동할까?'
                    : 'Data needs to be sent to OpenAI for AI comfort analysis.\n\nWould you like to go to the consent screen?',
                [
                    { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                    {
                        text: language === 'ko' ? '동의하기' : 'Agree',
                        style: 'default',
                        onPress: () => setShowConsentScreen(true)
                    }
                ]
            );
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await analyzeEmotion(anonymousText, true, userName);
            setAnonymousResult(result);
            setDailyAnonymousCount(prev => prev + 1);
            showToastMessage(translate('comfortReceived'));
            hapticSuccess();
        } catch (error) {
            showToastMessage(translate('retryLater'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [anonymousText, dailyAnonymousCount, showToastMessage, userName]);

    // AI 채팅 메시지 전송
    const sendChatMessage = useCallback(async () => {
        if (!chatInput.trim()) return;

        // 턴 수 제한 체크
        const maxDailyTurns = isPremium ? 30 : 10;
        const maxSessionTurns = isPremium ? 30 : 10;

        if (dailyChatTurns >= maxDailyTurns) {
            showToastMessage(
                isPremium
                    ? (language === 'ko' ? '오늘의 채팅 횟수를 모두 사용했어' : "You've used all daily chat turns.")
                    : (language === 'ko' ? '오늘의 무료 채팅 횟수를 모두 사용했어. 프리미엄으로 업그레이드할래?' : "You've used all free daily turns. Upgrade to premium?"),
                'error'
            );
            return;
        }

        if (sessionChatTurns >= maxSessionTurns) {
            showToastMessage(
                language === 'ko' ? '이번 세션의 채팅 횟수가 끝났어. 새로 시작하려면 모달을 닫았다 다시 열어줘!' : "Session turns ended. Close and reopen to start new session.",
                'error'
            );
            return;
        }

        // OpenAI 데이터 전송 동의 확인
        const hasOpenAIConsent = await checkOpenAIConsent();
        if (!hasOpenAIConsent) {
            Alert.alert(
                language === 'ko' ? '데이터 전송 동의 필요' : 'Data Transfer Consent Required',
                language === 'ko'
                    ? 'AI 채팅을 위해 OpenAI로 데이터를 전송해야 해.\n\n동의 화면으로 이동할까?'
                    : 'We need to send data to OpenAI for AI chat.\n\nGo to consent screen?',
                [
                    { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                    {
                        text: language === 'ko' ? '동의하기' : 'Agree',
                        style: 'default',
                        onPress: () => setShowConsentScreen(true)
                    }
                ]
            );
            return;
        }

        setIsSubmitting(true);
        const userMessage = chatInput.trim();
        setChatInput('');

        try {
            // 사용자 메시지 추가
            const newUserMsg = { role: 'user', text: userMessage, timestamp: Date.now() };
            setChatHistory(prev => [...prev, newUserMsg]);

            // 사용자 메시지 스크롤
            setTimeout(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // AI 응답 요청 (채팅 히스토리 포함)
            const aiResponse = await chatWithAI(userMessage, chatHistory, language);

            // AI 메시지 추가
            const newAiMsg = { role: 'ai', text: aiResponse, timestamp: Date.now() };
            setChatHistory(prev => [...prev, newAiMsg]);

            // 스크롤을 최신 메시지로 이동
            setTimeout(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            // 턴 수 증가 및 저장
            const newDailyTurns = dailyChatTurns + 1;
            const newSessionTurns = sessionChatTurns + 1;
            setDailyChatTurns(newDailyTurns);
            setSessionChatTurns(newSessionTurns);

            // AsyncStorage에 턴 수 저장
            await AsyncStorage.setItem('dailyChatTurns', newDailyTurns.toString());

            // 턴 종료 알림
            const remainingDailyTurns = maxDailyTurns - newDailyTurns;
            const remainingSessionTurns = maxSessionTurns - newSessionTurns;

            if (remainingDailyTurns === 0) {
                showToastMessage(
                    isPremium
                        ? (language === 'ko' ? '오늘의 채팅 횟수를 모두 사용했어 ✨' : "You've used all daily chat turns ✨")
                        : (language === 'ko' ? '오늘의 무료 채팅 횟수를 모두 사용했어 ✨' : "You've used all free daily turns ✨"),
                    'info'
                );
            } else if (remainingSessionTurns === 0) {
                showToastMessage(
                    language === 'ko'
                        ? '이번 세션의 채팅이 끝났어. 새로 시작하려면 뒤로가기 후 다시 열어줘 💬'
                        : "Session ended. Go back and reopen to start new session 💬",
                    'info'
                );
            } else if (remainingDailyTurns <= 2) {
                // 남은 턴이 2개 이하면 알림
                showToastMessage(
                    language === 'ko'
                        ? `남은 턴: ${remainingDailyTurns}회`
                        : `Remaining turns: ${remainingDailyTurns}`,
                    'info'
                );
            }

            hapticSuccess();
        } catch (error) {
            console.error('Chat error:', error);

            // 에러 타입에 따라 다른 메시지 표시
            let errorMessage = '';
            if (error.message && error.message.includes('Network request failed')) {
                errorMessage = language === 'ko'
                    ? '인터넷 연결을 확인해봐 📡'
                    : 'Please check your internet connection 📡';
            } else if (error.message && error.message.includes('API key')) {
                errorMessage = language === 'ko'
                    ? 'API 키 오류야. 설정을 확인해봐!'
                    : 'API key error. Please check settings.';
            } else {
                errorMessage = language === 'ko'
                    ? '잠시 후 다시 시도해봐 🔄'
                    : 'Please try again later 🔄';
            }

            showToastMessage(errorMessage, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [chatInput, chatHistory, dailyChatTurns, sessionChatTurns, isPremium, language, showToastMessage]);

    // 주간 리포트 공유 (실제 구현)
    const shareWeeklyReport = useCallback(async () => {
        const from = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weeklyData = emotionHistory.filter(
            e => !e.deletedAt && new Date(e.date).getTime() >= from
        );

        if (weeklyData.length === 0) {
            Alert.alert(
                language === 'ko' ? '아직 기록이 부족해요' : 'Not enough records yet',
                language === 'ko' ? '일주일간 기록해보시면 리포트를 만들어드릴게요!' : 'Record for a week and we\'ll create a report for you!'
            );
            return;
        }

        const emotionCount = {};
        weeklyData.forEach(entry => {
            emotionCount[entry.emotion] = (emotionCount[entry.emotion] || 0) + 1;
        });

        const mostFrequent = Object.entries(emotionCount)
            .sort(([, a], [, b]) => b - a)[0];

        const reportText = `📊 나의 주간 감정 리포트
        
🗓 기간: 최근 7일
📝 총 기록: ${weeklyData.length}개
😊 ${language === 'ko' ? '가장 많았던 감정' : 'Most Frequent'}: ${mostFrequent?.[0]} (${language === 'ko' ? mostFrequent?.[1] + '회' : mostFrequent?.[1] + ' ' + (mostFrequent?.[1] === 1 ? 'time' : 'times')})
🔥 연속 기록: ${streak}일

💭 ${language === 'ko' ? '이번 주 나를 살린 문장' : 'This week\'s life-saving quote'}:
"${weeklyData[0]?.comfort || (language === 'ko' ? '당신의 마음을 이해해요.' : 'I understand your heart.')}"

#속마음노트 #감정기록 #마음돌보기`;

        try {
            await Share.share({
                message: reportText,
                title: '나의 주간 감정 리포트',
            });
        } catch (error) {
            if (__DEV__) console.log('Share error:', error);
        }
    }, [emotionHistory, streak]);

    // 추천활동 완료 토글 및 XP 지급
    const toggleActivityCompletion = useCallback((activityId) => {
        setCompletedActivities(prev => {
            const isCompleted = prev[activityId];
            const newState = { ...prev, [activityId]: !isCompleted };
            
            // 체크 시 간단한 피드백만
            if (!isCompleted) {
                hapticSuccess();
                
                // 오늘의 추천 활동 3개를 모두 완료했는지 확인
                const todayActivityIds = getDailyActivities.map(activity => activity.id);
                const completedTodayActivities = todayActivityIds.filter(id => 
                    id === activityId ? true : newState[id]
                ).length;
                
                // 3개 모두 완료 시 축하 토스트
                if (completedTodayActivities === 3) {
                    setTimeout(() => {
                        showToastMessage(
                            language === 'ko' 
                                ? "와! 오늘 추천 활동을 모두 완료했네! 🐻✨" 
                                : "Wow! You completed all today's activities! 🐻✨", 
                            'success'
                        );
                    }, 300);
                }
            }
            
            return newState;
        });
    }, [getDailyActivities, language, showToastMessage]);

    // 별빛 생성 함수
    const createStars = () => {
        const newStars = [];
        const starCount = 30; // 배터리 최적화
        
        for (let i = 0; i < starCount; i++) {
            const isSpecialStar = Math.random() < 0.15; // 15% 확률로 특별한 별
            const star = {
                id: i,
                x: Math.random() * 100, // 퍼센트
                y: Math.random() * 100, // 퍼센트
                size: isSpecialStar ? Math.random() * 4 + 3 : Math.random() * 2.5 + 1, // 특별한 별은 3-7px, 일반 별은 1-3.5px
                opacity: new Animated.Value(Math.random() * 0.6 + 0.2), // 0.2-0.8
                delay: Math.random() * 3000, // 0-3초 지연
                isSpecial: isSpecialStar,
                twinkleSpeed: isSpecialStar ? 800 + Math.random() * 600 : 1200 + Math.random() * 1000, // 특별한 별은 더 빠르게 반짝임
            };
            newStars.push(star);
        }
        
        return newStars;
    };

    // 별빛 애니메이션 제어 Ref (메모리 리크 방지)
    const starsRunningRef = useRef(false);
    const starTimeoutsRef = useRef([]);

    // 안전한 별빛 애니메이션 시작
    const startStarAnimation = useCallback(() => {
        if (starsRunningRef.current || stars.length === 0) return;
        
        starsRunningRef.current = true;
        starTimeoutsRef.current = stars.map((star) => {
            const timeoutId = setTimeout(() => {
                const animate = () => {
                    if (!starsRunningRef.current) return; // 중단 체크
                    
                    const maxBrightness = star.isSpecial ? 1.0 : 0.9;
                    const minBrightness = star.isSpecial ? 0.4 : 0.1;
                    
                    Animated.sequence([
                        Animated.timing(star.opacity, {
                            toValue: maxBrightness,
                            duration: star.twinkleSpeed,
                            useNativeDriver: true,
                        }),
                        Animated.timing(star.opacity, {
                            toValue: minBrightness,
                            duration: star.twinkleSpeed,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        if (starsRunningRef.current) {
                            animate(); // 재귀 호출 (중단 조건 포함)
                        }
                    });
                };
                animate();
            }, star.delay);
            
            return timeoutId;
        });
    }, [stars]);

    // 안전한 별빛 애니메이션 중단
    const stopStarAnimation = useCallback(() => {
        starsRunningRef.current = false;
        
        // 모든 타이머 정리
        starTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        starTimeoutsRef.current = [];
        
        // 별들의 애니메이션 즉시 중단 (선택적)
        stars.forEach(star => {
            star.opacity.stopAnimation?.();
        });
    }, [stars]);

    // 별빛 효과 초기화 (한 번만)
    useEffect(() => {
        const newStars = createStars();
        setStars(newStars);
    }, []);

// 별빛 애니메이션 제어 (조건 변경 시)
    useEffect(() => {
        if (stars.length > 0 && currentTab === 'home' && !showResultSheet) {
            startStarAnimation();
        } else {
            stopStarAnimation();
        }
        
        // Cleanup: 컴포넌트 언마운트 시 반드시 중단
        return stopStarAnimation;
    }, [stars, currentTab, showResultSheet, startStarAnimation, stopStarAnimation]);




    // 개선된 트렌드 차트
    const ImprovedTrendChart = () => {
        const trendData = getRecentTrend();
        if (trendData.length === 0) {
            return (
                <View style={styles.emptyChart}>
                    <Text style={[styles.emptyChartText, null]}>
                        일주일간 기록하시면 변화를 보여드릴게요!
                    </Text>
                </View>
            );
        }

        const maxValue = Math.max(...trendData.map(d => d.value), 5);

        return (
            <View style={styles.improvedChart}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, null]}>{translate('last7Days')}</Text>
                    <Text style={[styles.chartSubtitle, null]}>
                        {translate('daysRecorded', { count: trendData.length })}
                    </Text>
                </View>
                <View style={styles.chartContent}>
                    {trendData.map((point, index) => (
                        <View key={index} style={styles.chartPoint}>
                            <View style={[
                                styles.chartBar,
                                {
                                    height: (point.value / maxValue) * 25,
                                    backgroundColor: point.color
                                }
                            ]} />
                            <Text style={[styles.chartLabel, null]}>
                                {point.day}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // 토스트 컴포넌트 (Premium Dark)
    const ToastMessage = () => {
        if (!showToast.show) return null;

        return (
            <Animated.View style={[
                styles.toast,
                { transform: [{ translateY: toastAnim }] },
            ]}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: showToast.type === 'error' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(201, 169, 98, 0.15)',
                    paddingVertical: 14,
                    paddingHorizontal: 20,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: showToast.type === 'error' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(201, 169, 98, 0.3)',
                }}>
                    <Ionicons
                        name={showToast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                        size={18}
                        color={showToast.type === 'error' ? '#F87171' : DESIGN.colors.primary}
                    />
                    <Text style={{
                        marginLeft: 10,
                        fontSize: 14,
                        fontWeight: '500',
                        color: showToast.type === 'error' ? '#F87171' : DESIGN.colors.primary,
                    }}>
                        {showToast.message}
                    </Text>
                </View>
            </Animated.View>
        );
    };

    // 홈 탭 (Premium Minimal Dark)
    const renderHomeTab = () => {
        // 스트릭 계산
        const calculateStreak = () => {
            if (emotionHistory.length === 0) return 0;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let streak = 0;
            let currentDate = new Date(today);
            while (true) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const hasEntry = emotionHistory.some(entry => {
                    const entryDate = new Date(entry.date).toISOString().split('T')[0];
                    return entryDate === dateStr;
                });
                if (hasEntry) {
                    streak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                } else if (streak === 0) {
                    currentDate.setDate(currentDate.getDate() - 1);
                    const yesterdayStr = currentDate.toISOString().split('T')[0];
                    const hasYesterdayEntry = emotionHistory.some(entry => {
                        const entryDate = new Date(entry.date).toISOString().split('T')[0];
                        return entryDate === yesterdayStr;
                    });
                    if (!hasYesterdayEntry) break;
                } else {
                    break;
                }
            }
            return streak;
        };

        const streak = calculateStreak();
        const totalEntries = emotionHistory.length;
        const isActive = currentInputText.trim().length > 0;

        return (
            <View style={{ flex: 1, backgroundColor: '#0D1117' }}>
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingHorizontal: 28,
                        paddingVertical: 40,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    onScrollBeginDrag={() => Keyboard.dismiss()}>

                    {/* 미니멀 헤더 */}
                    <View style={{ marginBottom: 40 }}>
                        <Text style={{
                            fontSize: 28,
                            fontWeight: '200',
                            color: '#FFFFFF',
                            letterSpacing: 0.5,
                            lineHeight: 38,
                            textAlign: 'center',
                        }}>
                            {translate('homeGreeting')}
                        </Text>
                    </View>

                    {/* 입력 영역 - 미니멀 */}
                    <View style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 16,
                        padding: 24,
                        marginBottom: 24,
                        minHeight: 160,
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.06)',
                    }}>
                        <TextInput
                            ref={inputRef}
                            style={{
                                fontSize: 16,
                                fontWeight: '300',
                                color: '#FFFFFF',
                                lineHeight: 26,
                                minHeight: 120,
                            }}
                            placeholder={translate('homeSubtitle')}
                            placeholderTextColor="rgba(255, 255, 255, 0.25)"
                            value={currentInputText}
                            onChangeText={handleInputTextChange}
                            multiline={true}
                            textAlignVertical="top"
                        />
                    </View>

                    {/* CTA 버튼 - 골드 액센트 */}
                    <TouchableOpacity
                        onPress={() => submitEmotion(currentInputText)}
                        disabled={isSubmitting || !isActive}
                        activeOpacity={0.7}
                        style={{
                            marginBottom: 16,
                        }}
                    >
                        <View style={{
                            backgroundColor: isActive ? DESIGN.colors.primary : 'rgba(255, 255, 255, 0.05)',
                            paddingVertical: 16,
                            borderRadius: 12,
                            alignItems: 'center',
                            borderWidth: isActive ? 0 : 1,
                            borderColor: 'rgba(255, 255, 255, 0.08)',
                        }}>
                            {isSubmitting ? (
                                <ActivityIndicator color={isActive ? '#0D1117' : '#fff'} size="small" />
                            ) : (
                                <Text style={{
                                    fontSize: 14,
                                    fontWeight: '600',
                                    color: isActive ? '#0D1117' : 'rgba(255, 255, 255, 0.4)',
                                    letterSpacing: 1,
                                    textTransform: 'uppercase',
                                }}>
                                    {translate('record')}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>

                    {/* 보안 텍스트 */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 48,
                    }}>
                        <Ionicons name="shield-checkmark-outline" size={14} color="rgba(255, 255, 255, 0.3)" />
                        <Text style={{
                            fontSize: 13,
                            color: 'rgba(255, 255, 255, 0.3)',
                            fontWeight: '400',
                            marginLeft: 6,
                            letterSpacing: 0.3,
                        }}>
                            {translate('helperText')}
                        </Text>
                    </View>

                    {/* 구분선 */}
                    <View style={{
                        height: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        marginBottom: 32,
                    }} />

                    {/* 통계 영역 - 미니멀 */}
                    <View style={{ flexDirection: 'row', marginBottom: 32 }}>
                        {/* 스트릭 */}
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{
                                fontSize: 32,
                                fontWeight: '200',
                                color: '#FFFFFF',
                                marginBottom: 4,
                            }}>
                                {streak}
                            </Text>
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '400',
                                color: 'rgba(255, 255, 255, 0.35)',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}>
                                {language === 'ko' ? '연속' : 'Streak'}
                            </Text>
                        </View>

                        {/* 구분선 */}
                        <View style={{
                            width: 1,
                            backgroundColor: 'rgba(255, 255, 255, 0.12)',
                        }} />

                        {/* 총 기록 */}
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{
                                fontSize: 32,
                                fontWeight: '200',
                                color: '#FFFFFF',
                                marginBottom: 4,
                            }}>
                                {totalEntries}
                            </Text>
                            <Text style={{
                                fontSize: 11,
                                fontWeight: '400',
                                color: 'rgba(255, 255, 255, 0.35)',
                                letterSpacing: 1,
                                textTransform: 'uppercase',
                            }}>
                                {language === 'ko' ? '기록' : 'Entries'}
                            </Text>
                        </View>
                    </View>

                    {/* AI 상담 버튼 */}
                    <TouchableOpacity
                        onPress={() => setShowAnonymousModal(true)}
                        activeOpacity={0.7}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            borderRadius: 12,
                            padding: 20,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.06)',
                        }}
                    >
                        <View>
                            <Text style={{
                                fontSize: 15,
                                fontWeight: '400',
                                color: '#FFFFFF',
                                marginBottom: 4,
                            }}>
                                {language === 'ko' ? '고민 털어놓기' : 'Open up'}
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                fontWeight: '400',
                                color: 'rgba(255, 255, 255, 0.35)',
                            }}>
                                {language === 'ko' ? '편하게 이야기해요' : 'Talk freely'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.25)" />
                    </TouchableOpacity>

                </ScrollView>
            </View>
        );
    };

    // 기록 탭 (개선됨)
    // 기록 탭 (홈화면 스타일로 리디자인)
    const renderHistoryTab = () => {
        const filteredHistory = getFilteredHistory();
        const hasAnyRecords = emotionHistory.filter(e => !e.deletedAt).length > 0;

        return (
            <View style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={!hasAnyRecords ? {
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingTop: 60,
                        paddingBottom: 120
                    } : {
                        paddingTop: 20,
                        paddingBottom: 120
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={true}
                    bounces={true}>

                    {/* 메인 컨텐츠 */}
                    <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
                        {/* 기록이 하나도 없을 때 - 따뜻한 빈 상태 */}
                        {!hasAnyRecords ? (
                            <Animated.View style={{ opacity: cardFadeAnim, alignItems: 'center', paddingHorizontal: 40 }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: 'rgba(201, 169, 98, 0.1)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 24
                                }}>
                                    <Ionicons name="book-outline" size={36} color="#C9A962" />
                                </View>
                                <Text style={{
                                    color: '#FFFFFF',
                                    fontSize: 20,
                                    fontWeight: '300',
                                    letterSpacing: 0.5,
                                    marginBottom: 12,
                                    textAlign: 'center'
                                }}>
                                    {language === 'ko' ? '아직 기록이 없어' : 'No entries yet'}
                                </Text>
                                <Text style={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: 15,
                                    fontWeight: '400',
                                    textAlign: 'center',
                                    lineHeight: 24
                                }}>
                                    {language === 'ko'
                                        ? '오늘 하루는 어땠어?\n첫 번째 기록을 남겨봐'
                                        : 'How was your day?\nStart your first entry'}
                                </Text>
                            </Animated.View>
                        ) : (
                            /* 헤더 영역 - 기록이 있을 때 표시 */
                            <>
                                <View style={styles.newHomeHeader}>
                                    <Text style={[styles.newHomeGreeting, { fontSize: 28, fontWeight: '200' }]}>
                                        {translate('tabHistory')}
                                    </Text>
                                </View>
                                {/* 검색 영역 */}
                                <Animated.View
                                    style={{
                                        opacity: cardFadeAnim,
                                        width: '100%',
                                        alignSelf: 'center',
                                        marginVertical: 16
                                    }}
                                >
                                    <View style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                        borderRadius: 12,
                                        padding: 14,
                                        marginBottom: 20,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}>
                                        <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.5)" />
                                        <TextInput
                                            style={{ flex: 1, marginLeft: 12, color: '#fff', fontSize: 15, fontWeight: '400' }}
                                            placeholder={translate('searchPlaceholder')}
                                            placeholderTextColor="rgba(255, 255, 255, 0.7)"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowTrash(true)}
                                            style={{ marginLeft: 12, padding: 4 }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>

                                {/* 검색 결과 없을 때 */}
                                {filteredHistory.length === 0 && searchQuery.length > 0 && (
                                    <Animated.View style={{ opacity: cardFadeAnim, alignItems: 'center', paddingVertical: 40 }}>
                                        <Ionicons name="search-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                                        <Text style={{
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontSize: 15,
                                            fontWeight: '400',
                                            marginTop: 16,
                                            textAlign: 'center'
                                        }}>
                                            {language === 'ko' ? '검색 결과가 없어' : 'No results found'}
                                        </Text>
                                    </Animated.View>
                                )}

                                {/* 기록 카드들 */}
                                {filteredHistory.slice(0, 10).map((item, index) => (
                                    <Animated.View key={item.id} style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                                        <View
                                            style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: 16,
                                                padding: 20,
                                                width: '100%',
                                                borderWidth: 1,
                                                borderColor: 'rgba(255, 255, 255, 0.06)'
                                            }}
                                        >
                                            {/* 기록 헤더 */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '400', letterSpacing: 0.3 }}>
                                                    {formatLocalizedDate(item.date, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        weekday: 'short'
                                                    })}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                    <View style={{
                                                        backgroundColor: 'rgba(201, 169, 98, 0.15)',
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(201, 169, 98, 0.25)'
                                                    }}>
                                                        <Text style={{ color: '#C9A962', fontSize: 12, fontWeight: '500' }}>
                                                            {language === 'ko' ? (item.emotion_ko || item.emotion) : (item.emotion_en || item.emotion)}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                                                        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* 기록 내용 */}
                                            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 15, lineHeight: 24, fontWeight: '400' }}>
                                                {item.text}
                                            </Text>

                                            {/* 위로의 말 */}
                                            {item.comfort && (
                                                <View style={{
                                                    marginTop: 16,
                                                    padding: 16,
                                                    backgroundColor: 'rgba(201, 169, 98, 0.08)',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(201, 169, 98, 0.15)'
                                                }}>
                                                    <Text style={{ color: '#C9A962', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>
                                                        {language === 'ko' ? '✨ 맞춤 분석' : '✨ Analysis'}
                                                    </Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, fontWeight: '400' }}>
                                                        {language === 'ko' ? (item.comfort_ko || item.comfort) : (item.comfort_en || item.comfort)}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* 해결 방안 */}
                                            {item.solution && (
                                                <View style={{
                                                    marginTop: 12,
                                                    padding: 16,
                                                    backgroundColor: 'rgba(201, 169, 98, 0.05)',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(201, 169, 98, 0.1)'
                                                }}>
                                                    <Text style={{ color: '#C9A962', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>
                                                        {language === 'ko' ? '💡 해결 방안' : '💡 Solutions'}
                                                    </Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, fontWeight: '400' }}>
                                                        {language === 'ko' ? (item.solution_ko || item.solution) : (item.solution_en || item.solution)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </Animated.View>
                                ))}
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };

    // 인사이트 탭 (개선됨)
    const renderInsightsTab = () => {
        const recentData = emotionHistory
            .filter(e => !e.deletedAt)
            .slice(0, 7);

        const emotionCounts = recentData.reduce((acc, curr) => {
            const key = curr.emotionKey || toEmotionKey(curr.emotion);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const totalRecords = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
        // 7일 전부터 오늘까지의 날짜 키들 생성
        const last7DaysKeys = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return getLocalDateKey(date);
        });
        
        const weeklyInputs = emotionHistory
            .filter(e => !e.deletedAt && (
                (e.dateKey && last7DaysKeys.includes(e.dateKey)) ||
                (!e.dateKey && new Date(e.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            )).length;

        return (
            <ScrollView 
                keyboardShouldPersistTaps="never" 
                style={{ flex: 1 }} 
                showsVerticalScrollIndicator={false} 
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} 
                onTouchStart={Keyboard.dismiss} 
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{ 
                    paddingTop: 20,
                    paddingBottom: 120
                }}
            >
                {/* 메인 컨텐츠 */}
                <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
                    {/* 헤더 영역 */}
                    <View style={styles.newHomeHeader}>
                        <Text style={[styles.newHomeGreeting, { fontSize: 28, fontWeight: '200' }]}>
                            {translate('insights')}
                        </Text>
                    </View>

                    {/* 주간 리포트 카드 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                        <WeeklyReport 
                            emotionHistory={emotionHistory}
                            streak={streak}
                            language={language}
                        />
                    </Animated.View>

                    {/* 스트릭 캘린더 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                        <View
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                        >
                            <StreakCalendar
                                emotionHistory={emotionHistory}
                                streak={streak}
                                recoveryTokens={recoveryTokens}
                                language={language}
                            />
                        </View>
                    </Animated.View>

                    {/* 주간 감정 분포 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                        <View
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                        >
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300', textAlign: 'center', letterSpacing: 0.5 }}>
                                {translate('emotionDistribution')}
                            </Text>
                            {totalRecords > 0 && totalRecords < 3 && (
                                <View style={{ marginTop: 8 }}>
                                    <SparseSample language={language} />
                                </View>
                            )}
                        </View>

                        {totalRecords === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <View style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: 'rgba(201, 169, 98, 0.1)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <Ionicons name="bar-chart-outline" size={24} color="#C9A962" />
                                </View>
                                <Text style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: 14,
                                    fontWeight: '400',
                                    textAlign: 'center',
                                    lineHeight: 22
                                }}>
                                    {translate('weeklyRecordPrompt')}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.emotionDistribution}>
                                    {Object.entries(emotionCounts).map(([key, count]) => {
                                        const meta = EMOTIONS[key] || EMOTIONS.OK;
                                        const label = language === 'ko' ? meta.ko : meta.en;
                                        return (
                                            <View key={key} style={styles.emotionStat}>
                                                <Text style={[styles.emotionStatLabel, null]}>{label}</Text>
                                            <View style={styles.emotionStatBar}>
                                                <LinearGradient
                                                    colors={['#C9A962', '#B8985A']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={[
                                                        styles.emotionStatFill,
                                                        { width: `${(count / totalRecords) * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                                <Text style={[styles.emotionStatCount, null]}>
                                                    {language === 'ko' ? `${count}회` : `${count} ${count === 1 ? 'time' : 'times'}`}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={styles.insightSummary}>
                                    <Text style={styles.insightSummaryText}>
                                        {translate('mostFrequentEmotion')}: {(() => {
                                            const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
                                            if (!topEmotion) return '';
                                            const meta = EMOTIONS[topEmotion[0]] || EMOTIONS.OK;
                                            return language === 'ko' ? meta.ko : meta.en;
                                        })()}
                                    </Text>
                                </View>
                            </>
                        )}
                        </View>
                    </Animated.View>

                    {/* 나를 살린 문장 */}
                    {recentData.length > 0 && (
                        <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                            <View
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                            >
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: '400', textAlign: 'center', letterSpacing: 0.5 }}>
                                        {translate('weeklyQuote')}
                                    </Text>
                                </View>

                                <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 15, fontWeight: '400', lineHeight: 26, textAlign: 'center', fontStyle: 'italic' }}>
                                        "{language === 'ko' ? (recentData[0]?.comfort_ko || recentData[0]?.comfort || '네 마음을 소중히 여겨') : (recentData[0]?.comfort_en || recentData[0]?.comfort || 'Take care of your precious heart.')}"
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* 행동 추천 */}
                    {recentData.length > 0 && (
                        <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                            <View
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                            >
                            <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: '400', marginBottom: 16, letterSpacing: 0.5 }}>
                                {translate('weeklyRecommendedActivities')}
                            </Text>
                            <View style={{ gap: 12 }}>
                                {getDailyActivities.map((activity) => (
                                    <TouchableOpacity
                                        key={activity.id}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: 12,
                                            padding: 14,
                                            borderWidth: 1,
                                            borderColor: completedActivities[activity.id] ? 'rgba(201, 169, 98, 0.3)' : 'rgba(255, 255, 255, 0.06)'
                                        }}
                                        onPress={() => toggleActivityCompletion(activity.id)}
                                    >
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: completedActivities[activity.id] ? 'rgba(201, 169, 98, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12
                                        }}>
                                            <Ionicons name={activity.icon} size={18} color={completedActivities[activity.id] ? '#C9A962' : 'rgba(255, 255, 255, 0.5)'} />
                                        </View>
                                        <Text style={{
                                            flex: 1,
                                            color: completedActivities[activity.id] ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
                                            fontSize: 14,
                                            fontWeight: '400'
                                        }}>
                                            {activity.text}
                                        </Text>
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: completedActivities[activity.id] ? '#C9A962' : 'transparent',
                                            borderWidth: 1.5,
                                            borderColor: completedActivities[activity.id] ? '#C9A962' : 'rgba(255, 255, 255, 0.2)',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {completedActivities[activity.id] && (
                                                <Ionicons name="checkmark" size={14} color="#0D1117" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            </View>
                        </Animated.View>
                    )}

                </View>
            </ScrollView>
        );
    };



    // 초기화 중일 때 로딩 화면
    if (isInitializing) {
        return (
            <LinearGradient
                colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                style={[styles.background, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}
            >
                <StatusBar barStyle="light-content" hidden={true} />
                <ActivityIndicator size="large" color="#C9A962" />
                <Text style={{ color: 'rgba(201, 169, 98, 0.9)', marginTop: 16, fontSize: 16 }}>
                    {language === 'ko' ? '로딩중...' : 'Loading...'}
                </Text>
            </LinearGradient>
        );
    }

    // 동의 화면 (최우선)
    if (showConsentScreen) {
        return (
            <ConsentScreen
                onConsentGranted={async () => {
                    if (__DEV__) console.log('🔵 동의 완료');
                    setShowConsentScreen(false);
                    setHasUserConsent(true);

                    // 저장된 이름 확인
                    const savedName = await AsyncStorage.getItem('userName');
                    if (savedName) {
                        setUserName(savedName);
                    } else {
                        // 이름이 없으면 입력 모달 표시
                        setShowNameInputModal(true);
                    }

                    // 동의 후 바로 메인 데이터 로드
                    loadData();
                }}
                onLanguageChange={(newLanguage) => {
                    setLanguage(newLanguage);
                }}
                language={language}
            />
        );
    }


    // 앱 잠금 화면
    if (isAppLocked) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#0D1117' }]} edges={[]}>
                <StatusBar barStyle="light-content" hidden={true} />
                <View style={styles.lockScreen}>
                    <View style={styles.lockIconContainer}>
                        <Ionicons name="lock-closed" size={48} color="#C9A962" />
                    </View>
                    <Text style={styles.lockTitle}>
                        {language === 'ko' ? '앱이 잠겨있어' : 'App is Locked'}
                    </Text>
                    <Text style={styles.lockDescription}>
                        {language === 'ko' ? '사용하려면 인증이 필요해' : 'Authentication required to continue'}
                    </Text>

                    <TouchableOpacity
                        style={styles.unlockButton}
                        onPress={async () => {
                            try {
                                const result = await LocalAuthentication.authenticateAsync({
                                    promptMessage: language === 'ko' ? '앱을 사용하려면 인증해줘' : 'Authenticate to use the app',
                                    cancelLabel: language === 'ko' ? '취소' : 'Cancel',
                                    disableDeviceFallback: false,
                                });

                                if (result.success) {
                                    setIsAppLocked(false);
                                }
                            } catch (error) {
                                showToastMessage(
                                    language === 'ko' ? '인증에 실패했어' : 'Authentication failed',
                                    'error'
                                );
                            }
                        }}
                    >
                        <LinearGradient
                            colors={['#C9A962', '#B8985A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.lockGradientButton}
                        >
                            <Ionicons name="finger-print" size={22} color="#0D1117" />
                            <Text style={styles.unlockButtonText}>
                                {language === 'ko' ? '잠금 해제' : 'Unlock'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    // AI 채팅 화면 (전체 화면)
    if (showAnonymousModal) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#0D1117' }]} edges={[]}>
                <StatusBar barStyle="light-content" hidden={true} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, backgroundColor: '#0D1117' }}
                >
                    <View style={styles.chatScreenContainer}>
                            {/* 헤더 */}
                            <View style={styles.chatScreenHeader}>
                                <TouchableOpacity
                                    onPress={async () => {
                                        // 채팅 기록 저장/업데이트
                                        if (chatHistory.length > 0) {
                                            const firstUserMessage = chatHistory.find(msg => msg.role === 'user')?.text || '';

                                            // 사용자 메시지가 실제로 있을 때만 저장
                                            if (firstUserMessage.trim()) {
                                                if (currentSessionId) {
                                                    // 기존 세션 업데이트
                                                    setSavedChatSessions(prev =>
                                                        prev.map(session =>
                                                            session.id === currentSessionId
                                                                ? { ...session, messages: chatHistory, timestamp: Date.now() }
                                                                : session
                                                        )
                                                    );
                                                } else {
                                                    // 새 세션 생성
                                                    const title = await summarizeChat(chatHistory, language);
                                                    const newSession = {
                                                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                                                        timestamp: Date.now(),
                                                        messages: chatHistory,
                                                        title: title
                                                    };
                                                    setSavedChatSessions(prev => [newSession, ...prev]);
                                                }
                                            }
                                        }

                                        setShowAnonymousModal(false);
                                        setChatHistory([]);
                                        setChatInput('');
                                        setSessionChatTurns(0);
                                        setCurrentSessionId(null); // 초기화
                                    }}
                                    style={styles.chatBackButton}
                                >
                                    <Ionicons name="arrow-back" size={22} color="rgba(255, 255, 255, 0.7)" />
                                </TouchableOpacity>
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                                        <Ionicons name="chatbubble-ellipses" size={20} color="#C9A962" />
                                        <Text style={styles.chatScreenTitle}>
                                            {language === 'ko' ? '고민 상담소' : 'Worry Counseling'}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowChatHistory(true)}
                                    style={styles.chatBackButton}
                                >
                                    <Ionicons name="menu" size={22} color="rgba(255, 255, 255, 0.7)" />
                                </TouchableOpacity>
                            </View>

                            {/* 남은 턴 표시 */}
                            {(() => {
                                const remainingTurns = (isPremium ? 30 : 10) - dailyChatTurns;
                                if (remainingTurns <= 0) {
                                    return (
                                        <View style={styles.noTurnsContainer}>
                                            <Text style={styles.noTurnsText}>{translate('noTurnsLeft')}</Text>
                                            <Text style={styles.comeBackText}>{translate('comeBackTomorrow')}</Text>
                                        </View>
                                    );
                                }
                                return (
                                    <Text style={styles.chatScreenSubtitle}>
                                        {language === 'ko' ? '남은 턴' : 'Turns left'}: {remainingTurns}
                                    </Text>
                                );
                            })()}

                            {/* 채팅 히스토리 */}
                            <ScrollView
                                ref={chatScrollViewRef}
                                style={styles.chatScreenHistory}
                                contentContainerStyle={styles.chatScreenHistoryContent}
                                showsVerticalScrollIndicator={false}
                                onContentSizeChange={() => chatScrollViewRef.current?.scrollToEnd({ animated: true })}
                            >
                                {chatHistory.length === 0 ? (
                                    <View style={styles.chatScreenEmpty}>
                                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(201, 169, 98, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                            <Ionicons name="chatbubbles-outline" size={36} color="#C9A962" />
                                        </View>
                                        <Text style={styles.chatScreenEmptyText}>
                                            {language === 'ko'
                                                ? '무엇이든 편하게 털어놔'
                                                : 'Feel free to share anything'}
                                        </Text>
                                        <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.3)', marginTop: 8, textAlign: 'center' }}>
                                            {language === 'ko'
                                                ? '네 이야기를 들을 준비가 되어있어'
                                                : 'Ready to listen to your story'}
                                        </Text>
                                    </View>
                                ) : (
                                    chatHistory.map((msg, idx) => (
                                        msg.role === 'user' ? (
                                            <View
                                                key={idx}
                                                style={[
                                                    styles.chatScreenBubble,
                                                    styles.chatScreenBubbleUser
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.chatScreenBubbleText,
                                                    styles.chatScreenBubbleTextUser
                                                ]}>
                                                    {msg.text}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View
                                                key={idx}
                                                style={[
                                                    styles.chatScreenBubble,
                                                    styles.chatScreenBubbleAi
                                                ]}
                                            >
                                                <Text style={[
                                                    styles.chatScreenBubbleText,
                                                    styles.chatScreenBubbleTextAi
                                                ]}>
                                                    {msg.text}
                                                </Text>
                                            </View>
                                        )
                                    ))
                                )}
                            </ScrollView>

                            {/* 하단 입력창 */}
                            <View style={styles.chatScreenInputContainer}>
                                <TextInput
                                    style={styles.chatScreenInput}
                                    multiline
                                    placeholder={language === 'ko' ? '메시지를 입력해...' : 'Type a message...'}
                                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                    value={chatInput}
                                    onChangeText={setChatInput}
                                    maxLength={200}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.chatScreenSendButton,
                                        (!chatInput.trim() || isSubmitting) && styles.chatScreenSendButtonDisabled
                                    ]}
                                    onPress={sendChatMessage}
                                    disabled={!chatInput.trim() || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator size="small" color="#0D1117" />
                                    ) : (
                                        <Ionicons name="send" size={18} color="#0D1117" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {/* 채팅 기록 모달 */}
                            <Modal
                                visible={showChatHistory}
                                animationType="slide"
                                transparent={true}
                                onRequestClose={() => setShowChatHistory(false)}
                            >
                                <View style={styles.chatHistoryModalContainer}>
                                    <View style={styles.chatHistoryModalContent}>
                                        <View style={styles.chatHistoryBgContainer}>
                                            <View style={styles.chatHistoryHandle} />

                                            <View style={styles.chatHistoryHeader}>
                                                <Text style={styles.chatHistoryTitle}>
                                                    {language === 'ko' ? '채팅 기록' : 'Chat History'}
                                                </Text>
                                                <TouchableOpacity
                                                    onPress={() => setShowChatHistory(false)}
                                                    style={styles.chatHistoryCloseButton}
                                                >
                                                    <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.6)" />
                                                </TouchableOpacity>
                                            </View>

                                            <ScrollView style={styles.chatHistoryList}>
                                            {savedChatSessions.length === 0 ? (
                                                <View style={styles.chatHistoryEmpty}>
                                                    <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(201, 169, 98, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                                        <Ionicons name="chatbubbles-outline" size={32} color="#C9A962" />
                                                    </View>
                                                    <Text style={styles.chatHistoryEmptyText}>
                                                        {language === 'ko' ? '저장된 채팅 기록이 없어' : 'No saved chat history'}
                                                    </Text>
                                                </View>
                                            ) : (
                                                savedChatSessions.map((session, index) => (
                                                    <View key={index} style={styles.chatHistoryItemContainer}>
                                                        <TouchableOpacity
                                                            style={styles.chatHistoryItem}
                                                            onPress={() => {
                                                                setChatHistory(session.messages);
                                                                setCurrentSessionId(session.id); // 세션 ID 설정
                                                                setShowChatHistory(false);
                                                            }}
                                                        >
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.chatHistoryItemTitle} numberOfLines={2}>
                                                                    {session.title || session.preview || (language === 'ko' ? '대화 기록' : 'Chat history')}
                                                                </Text>
                                                                <Text style={styles.chatHistoryItemDate}>
                                                                    {(() => {
                                                                        const date = new Date(session.timestamp);
                                                                        // timestamp 유효성 검증
                                                                        if (isNaN(date.getTime())) {
                                                                            return language === 'ko' ? '날짜 오류' : 'Invalid Date';
                                                                        }
                                                                        // 한국시간으로 변환
                                                                        const year = date.getFullYear();
                                                                        const month = date.getMonth() + 1;
                                                                        const day = date.getDate();
                                                                        const hours = date.getHours();
                                                                        const minutes = date.getMinutes();

                                                                        if (language === 'ko') {
                                                                            return `${year}년 ${month}월 ${day}일 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                                                        } else {
                                                                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                                                            return `${monthNames[month-1]} ${day}, ${year} ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                                                                        }
                                                                    })()}
                                                                </Text>
                                                            </View>
                                                            <TouchableOpacity
                                                                style={styles.chatHistoryDeleteButton}
                                                                onPress={(e) => {
                                                                    e.stopPropagation();
                                                                    Alert.alert(
                                                                        language === 'ko' ? '채팅 기록 삭제' : 'Delete Chat',
                                                                        language === 'ko' ? '이 대화를 삭제하시겠습니까?' : 'Delete this conversation?',
                                                                        [
                                                                            { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                                                                            {
                                                                                text: language === 'ko' ? '삭제' : 'Delete',
                                                                                style: 'destructive',
                                                                                onPress: () => {
                                                                                    setSavedChatSessions(prev => prev.filter((_, i) => i !== index));
                                                                                    hapticSuccess();
                                                                                }
                                                                            }
                                                                        ]
                                                                    );
                                                                }}
                                                            >
                                                                <Ionicons name="trash-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                                                            </TouchableOpacity>
                                                        </TouchableOpacity>
                                                    </View>
                                                ))
                                            )}
                                            </ScrollView>
                                        </View>
                                    </View>
                                </View>
                            </Modal>
                        </View>
                    </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={[]}>
                <StatusBar barStyle="light-content" hidden={true} />
                <LinearGradient
                    colors={DESIGN.colors.bgGradient}
                    style={styles.background}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                >
                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                        {currentTab === 'home' && renderHomeTab()}
                        {currentTab === 'history' && renderHistoryTab()}
                        {currentTab === 'insights' && renderInsightsTab()}
                        {currentTab === 'settings' && (
                            <SettingsTab
                                styles={styles}
                                translate={translate}
                                cardFadeAnim={cardFadeAnim}
                                language={language}
                                setLanguage={setLanguage}
                                userName={userName}
                                setTempNameInput={setTempNameInput}
                                setShowNameChangeModal={setShowNameChangeModal}
                                exportSecureBackup={exportSecureBackup}
                                importSecureBackup={importSecureBackup}
                                exportUserData={exportUserData}
                                showToastMessage={showToastMessage}
                                hasUserConsent={hasUserConsent}
                                revokeConsent={revokeConsent}
                                setShowConsentScreen={setShowConsentScreen}
                                resetAllData={resetAllData}
                                appLockEnabled={appLockEnabled}
                                handleAppLockToggle={handleAppLockToggle}
                                setShowCrisisModal={setShowCrisisModal}
                                openSafeURL={openSafeURL}
                            />
                        )}
                    </Animated.View>
                </KeyboardAvoidingView>

                {/* 새로운 미니멀 탭 바 */}
                <View style={styles.tabBarNew}>
                    <View style={styles.tabBarInner}>
                        <TouchableOpacity
                            style={styles.tabItemNew}
                            onPress={() => handleTabSwitch('home')}
                        >
                            <Ionicons
                                name={currentTab === 'home' ? 'home' : 'home-outline'}
                                size={22}
                                color={currentTab === 'home' ? DESIGN.colors.primary : DESIGN.colors.textMuted}
                            />
                            <Text style={[styles.tabTextNew, currentTab === 'home' && styles.tabTextActive]}>
                                {translate('tabHome')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabItemNew}
                            onPress={() => handleTabSwitch('history')}
                        >
                            <Ionicons
                                name={currentTab === 'history' ? 'book' : 'book-outline'}
                                size={22}
                                color={currentTab === 'history' ? DESIGN.colors.primary : DESIGN.colors.textMuted}
                            />
                            <Text style={[styles.tabTextNew, currentTab === 'history' && styles.tabTextActive]}>
                                {translate('tabHistory')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabItemNew}
                            onPress={() => handleTabSwitch('insights')}
                        >
                            <Ionicons
                                name={currentTab === 'insights' ? 'stats-chart' : 'stats-chart-outline'}
                                size={22}
                                color={currentTab === 'insights' ? DESIGN.colors.primary : DESIGN.colors.textMuted}
                            />
                            <Text style={[styles.tabTextNew, currentTab === 'insights' && styles.tabTextActive]}>
                                {translate('tabInsights')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabItemNew}
                            onPress={() => handleTabSwitch('settings')}
                        >
                            <Ionicons
                                name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
                                size={22}
                                color={currentTab === 'settings' ? DESIGN.colors.primary : DESIGN.colors.textMuted}
                            />
                            <Text style={[styles.tabTextNew, currentTab === 'settings' && styles.tabTextActive]}>
                                {translate('tabSettings')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 개선된 결과 시트 */}
                {showResultSheet && (
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[
                            styles.resultSheet,
                            { transform: [{ translateY: sheetAnim }] }
                        ]}>
                        <View style={styles.sheetContainer}>
                            <View style={styles.sheetHandle} />
                            <View style={styles.sheetContent}>
                                <View style={styles.sheetBadge}>
                                    <Text style={styles.sheetBadgeText}>
                                        {language === 'ko' ? (currentResult?.emotion_ko || currentResult?.emotion) : (currentResult?.emotion_en || currentResult?.emotion)}
                                    </Text>
                                </View>

                                {/* 1. 위로 (상태 분석 포함) */}
                                <View style={styles.sheetSection}>
                                    <Text style={styles.sheetSectionTitle}>✨ {language === 'ko' ? '맞춤 분석' : 'Personalized Analysis'}</Text>
                                    <Text style={styles.sheetSectionText}>
                                        {language === 'ko' ? (currentResult?.comfort_ko || currentResult?.comfort) : (currentResult?.comfort_en || currentResult?.comfort)}
                                    </Text>
                                </View>

                                {/* 2. 해결 방안 */}
                                <View style={styles.sheetSection}>
                                    <Text style={styles.sheetSectionTitle}>💡 {language === 'ko' ? '해결 방안' : 'Solutions'}</Text>
                                    {(() => {
                                        const solutionText = language === 'ko' ? (currentResult?.solution_ko || currentResult?.solution) : (currentResult?.solution_en || currentResult?.solution);
                                        // \n\n으로 문단 구분
                                        const paragraphs = solutionText.split('\n\n').filter(p => p.trim());
                                        return paragraphs.map((paragraph, index) => (
                                            <Text key={index} style={[styles.sheetSectionText, { marginBottom: index < paragraphs.length - 1 ? 16 : 0 }]}>
                                                {paragraph.trim()}
                                            </Text>
                                        ));
                                    })()}
                                </View>

                                <View style={styles.sheetButtons}>
                                    <TouchableOpacity style={styles.sheetButton} onPress={closeResultSheet}>
                                        <LinearGradient
                                            colors={['#C9A962', '#B8985A']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.sheetButtonGradient}
                                        >
                                            <Text style={styles.sheetButtonText}>{translate('recordDone')}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* 개선된 위기 지원 모달 - 커스텀 오버레이 */}
                {showCrisisModal && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                        <View style={[styles.crisisOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <View style={[styles.crisisContent, { backgroundColor: 'rgba(30, 41, 59, 0.98)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }]}>
                            <LinearGradient
                                colors={['#FEF2F2', '#FECACA']}
                                style={styles.crisisHeader}
                            >
                                <Ionicons name="alert-circle" size={32} color="#EF4444" />
                                <Text style={styles.crisisTitle}>{translate('crisisTitle')}</Text>
                            </LinearGradient>

                            <View style={styles.crisisBody}>
                                <Text style={[styles.crisisMessage, null]}>{translate('crisisMessage')}</Text>

                                <View style={styles.crisisHelplines}>
                                    <TouchableOpacity
                                        style={styles.crisisButton}
                                        onPress={() => {
                                            const helplines = language === 'en' ? HELPLINES['en-US'] : HELPLINES['ko-KR'];
                                            openSafeURL(`tel:${helplines.suicide}`, '전화 앱을 열 수 없어');
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#EF4444', '#DC2626']}
                                            style={styles.crisisButtonGradient}
                                        >
                                            <Ionicons name="call" size={20} color="#fff" />
                                            <Text style={styles.crisisButtonText}>
                                                {language === 'en' ? `Crisis Hotline ${HELPLINES['en-US'].suicide}` : `생명의전화 ${HELPLINES['ko-KR'].suicide}`}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.crisisButtonSecondary}
                                        onPress={() => {
                                            const helplines = language === 'en' ? HELPLINES['en-US'] : HELPLINES['ko-KR'];
                                            openSafeURL(`tel:${helplines.youth}`, '전화 앱을 열 수 없어');
                                        }}
                                    >
                                        <Ionicons name="chatbubble-outline" size={20} color="#EF4444" />
                                        <Text style={styles.crisisButtonSecondaryText}>
                                            {language === 'en' ? `Youth Helpline ${HELPLINES['en-US'].youth}` : `청소년상담 ${HELPLINES['ko-KR'].youth}`}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.crisisDisclaimer, null]}>
                                    {translate('crisisDisclaimer')}
                                </Text>
                                
                                <View style={styles.medicalDisclaimer}>
                                    <Ionicons name="warning" size={16} color="#EF4444" />
                                    <Text style={styles.medicalDisclaimerText}>
                                        {language === 'ko' ? 
                                            '⚠️ 본 앱은 의료 조언을 제공하지 않아. 전문의와 상담해!' :
                                            '⚠️ This app does not provide medical advice. Please consult a professional.'
                                        }
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.crisisCloseButton}
                                onPress={() => {
                                    setShowCrisisModal(false);
                                    setSelectedQuickEmotion(null);
                                    setInputResetSeq(s => s + 1);
                                }}
                            >
                                <Text style={[styles.crisisCloseText, { color: '#fff' }]}>{translate('confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                        </View>
                    </View>
                )}

                {/* 백업 비밀번호 입력 모달 - 커스텀 오버레이 */}
                {showPasswordModal && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                    <View style={styles.modalOverlay}>
                        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                            <View style={styles.passwordModalContent}>
                                <View style={styles.passwordModalHeader}>
                                    <Ionicons name="lock-closed" size={24} color="#4ADE80" />
                                    <Text style={styles.passwordModalTitle}>암호화 백업</Text>
                                </View>
                                
                                <View style={styles.passwordModalBody}>
                                    <Text style={styles.passwordModalSubtitle}>
                                        백업 파일을 보호할 비밀번호를 입력해
                                    </Text>
                                    <Text style={styles.passwordModalWarning}>
                                        ⚠️ 비밀번호를 분실하면 데이터를 복구할 수 없어
                                    </Text>
                                    
                                    <TextInput
                                        style={styles.passwordModalInput}
                                        value={backupPassword}
                                        onChangeText={setBackupPassword}
                                        placeholder="4글자 이상의 비밀번호"
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        secureTextEntry={true}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={exportEncryptedBackup}
                                    />
                                    
                                    <Text style={styles.passwordModalRule}>
                                        영문, 숫자, 특수문자 사용 가능 (4글자 이상)
                                    </Text>
                                </View>
                                
                                <View style={styles.passwordModalButtons}>
                                    <TouchableOpacity
                                        style={[styles.passwordModalButton, styles.cancelButton]}
                                        onPress={() => {
                                            setShowPasswordModal(false);
                                            setBackupPassword('');
                                        }}
                                    >
                                        <Text style={styles.cancelButtonText}>취소</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[
                                            styles.passwordModalButton, 
                                            styles.confirmButton,
                                            (!backupPassword || backupPassword.length < 4) && styles.confirmButtonDisabled
                                        ]}
                                        onPress={exportEncryptedBackup}
                                        disabled={!backupPassword || backupPassword.length < 4}
                                    >
                                        <LinearGradient
                                            colors={(!backupPassword || backupPassword.length < 4)
                                                ? ['#4ade80', '#22c55e']
                                                : ['#4ADE80', '#22C55E']
                                            }
                                            style={styles.passwordConfirmGradient}
                                        >
                                            <Ionicons name="shield-checkmark" size={16} color="#fff" />
                                            <Text style={styles.confirmButtonText}>암호화 백업</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            </KeyboardAvoidingView>
                        </View>
                    </View>
                )}

                {/* 데이터 복원 비밀번호 입력 모달 */}
                {showImportPasswordModal && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                        <View style={styles.modalOverlay}>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                                <View style={styles.passwordModalContent}>
                                    <View style={styles.passwordModalHeader}>
                                        <Ionicons name="key-outline" size={24} color="#7dd3fc" />
                                        <Text style={styles.passwordModalTitle}>비밀번호 입력</Text>
                                    </View>
                                    
                                    <View style={styles.passwordModalBody}>
                                        <Text style={styles.passwordModalSubtitle}>
                                            암호화된 백업 파일을 복원하려면 비밀번호를 입력해줘
                                        </Text>
                                        
                                        <TextInput
                                            style={styles.passwordModalInput}
                                            value={importPassword}
                                            onChangeText={setImportPassword}
                                            placeholder="백업 시 사용한 비밀번호"
                                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                            secureTextEntry={true}
                                            autoCapitalize="none"
                                            autoCorrect={false}
                                            returnKeyType="done"
                                            onSubmitEditing={() => importSecureBackup(importPassword)}
                                        />
                                    </View>
                                    
                                    <View style={styles.passwordModalButtons}>
                                        <TouchableOpacity
                                            style={[styles.passwordModalButton, styles.cancelButton]}
                                            onPress={() => {
                                                setShowImportPasswordModal(false);
                                                setImportPassword('');
                                                setImportFileContent(null);
                                            }}
                                        >
                                            <Text style={styles.cancelButtonText}>취소</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity
                                            style={[
                                                styles.passwordModalButton, 
                                                styles.confirmButton,
                                                (!importPassword || importPassword.length < 4) && styles.confirmButtonDisabled
                                            ]}
                                            onPress={() => importSecureBackup(importPassword)}
                                            disabled={!importPassword || importPassword.length < 4}
                                        >
                                            <LinearGradient
                                                colors={(!importPassword || importPassword.length < 4)
                                                    ? ['#818cf8', '#6366f1']
                                                    : ['#818CF8', '#6366F1']
                                                }
                                                style={styles.passwordConfirmGradient}
                                            >
                                                <Ionicons name="cloud-download" size={16} color="#fff" />
                                                <Text style={styles.confirmButtonText}>복원</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    </View>
                )}

                {/* 휴지통 모달 (개선됨) */}
                {showTrash && (
                  <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                    <TouchableOpacity
                      onPress={() => {
                        setShowTrash(false);
                      }}
                      style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
                    >
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                      <View style={[styles.modalOverlay, { paddingHorizontal: 20 }]}>
                        <LinearGradient
                          colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <View style={{ flex: 1, justifyContent: 'center' }}>

                        <FlatList
                            data={getTrashItems()}
                            keyExtractor={item => item.id}
                            removeClippedSubviews={true}
                            windowSize={5}
                            maxToRenderPerBatch={5}
                            initialNumToRender={5}
                            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                            renderItem={({ item }) => (
                                <View style={{ paddingHorizontal: 20, paddingVertical: 10 }}>
                                    <View style={styles.trashHeader}>
                                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>
                                            {formatLocalizedDate(item.date, {
                                                month: 'short',
                                                day: 'numeric',
                                                weekday: 'short'
                                            })}
                                        </Text>
                                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                                            {language === 'ko' ? (item.emotion_ko || item.emotion) : (item.emotion_en || item.emotion)}
                                        </Text>
                                    </View>
                                    <Text style={{ color: '#fff', fontSize: 15, marginVertical: 8 }} numberOfLines={2}>{item.text}</Text>
                                    <View style={styles.trashActions}>
                                        <TouchableOpacity
                                            style={styles.restoreButton}
                                            onPress={() => restoreEntry(item.id)}
                                        >
                                            <Ionicons name="refresh" size={16} color="#C9A962" />
                                            <Text style={styles.restoreText}>{translate('restore')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => deleteForever(item.id)}
                                        >
                                            <Ionicons name="trash" size={16} color="#EF4444" />
                                            <Text style={styles.deleteText}>{translate('deleteForever')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 10 }} />
                                </View>
                            )}
                            ListEmptyComponent={
                                <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                                    <Text style={{ fontSize: 60, marginBottom: 20 }}>🗑️</Text>
                                    <Text style={{ color: '#fff', fontSize: 20, marginBottom: 10 }}>{translate('trashEmpty')}</Text>
                                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center' }}>
                                        {translate('trashAutoDelete', { days: TRASH_TTL_DAYS })}
                                    </Text>
                                </View>
                            }
                        />
                        </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                )}

                {/* 삭제 확인 모달 */}
                <Modal visible={showDeleteConfirm} transparent animationType="fade" statusBarTranslucent={true}>
                    <View style={styles.deleteOverlay}>
                        <View style={styles.deleteModal}>
                            <View style={styles.deleteHeader}>
                                <Ionicons name="trash-outline" size={28} color="#ef4444" />
                                <Text style={styles.deleteTitle}>기록을 삭제할까요?</Text>
                            </View>
                            
                            <Text style={styles.deleteDescription}>삭제된 기록은 휴지통에서 복원할 수 있어</Text>
                            
                            <View style={styles.deleteActionRow}>
                                <TouchableOpacity 
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setShowDeleteConfirm(false);
                                        setDeleteItemId(null);
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>취소</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.confirmDeleteButton}
                                    onPress={() => softDeleteEntry(deleteItemId)}
                                >
                                    <Text style={styles.confirmDeleteButtonText}>삭제하기</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* 이름 입력 모달 */}
                <Modal visible={showNameInputModal} transparent animationType="fade" statusBarTranslucent={true}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.deleteOverlay}>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                                <View style={styles.deleteModal}>
                                    <View style={styles.deleteHeader}>
                                        <Text style={styles.nameModalEmoji}>👋</Text>
                                        <Text style={styles.deleteTitle}>
                                            {language === 'ko' ? '이름을 알려줘!' : 'What\'s your name?'}
                                        </Text>
                                    </View>

                                    <Text style={styles.deleteDescription}>
                                        {language === 'ko'
                                            ? '어떻게 불러줄까?'
                                            : 'How should we address you?'}
                                    </Text>

                                    <TextInput
                                        style={styles.nameInput}
                                        value={tempNameInput}
                                        onChangeText={setTempNameInput}
                                        placeholder={language === 'ko' ? '이름 또는 닉네임' : 'Name or nickname'}
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        autoFocus={true}
                                        maxLength={20}
                                        returnKeyType="done"
                                        onSubmitEditing={async () => {
                                            if (tempNameInput.trim()) {
                                                const name = tempNameInput.trim();
                                                setUserName(name);
                                                await AsyncStorage.setItem('userName', name);
                                                setShowNameInputModal(false);
                                                setTempNameInput('');
                                                hapticSuccess();
                                            }
                                        }}
                                    />

                                    <TouchableOpacity
                                        style={styles.nameConfirmButton}
                                        onPress={async () => {
                                            if (tempNameInput.trim()) {
                                                const name = tempNameInput.trim();
                                                setUserName(name);
                                                await AsyncStorage.setItem('userName', name);
                                                setShowNameInputModal(false);
                                                setTempNameInput('');
                                                hapticSuccess();
                                            }
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#C9A962', '#B8985A']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.nameConfirmGradient}
                                        >
                                            <Text style={styles.nameConfirmButtonText}>
                                                {language === 'ko' ? '시작하기' : 'Get Started'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* 이름 변경 모달 */}
                <Modal visible={showNameChangeModal} transparent animationType="fade" statusBarTranslucent={true}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.deleteOverlay}>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                                <View style={styles.deleteModal}>
                                    <TouchableOpacity
                                        style={styles.modalCloseButton}
                                        onPress={() => {
                                            setShowNameChangeModal(false);
                                            setTempNameInput('');
                                        }}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    >
                                        <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.6)" />
                                    </TouchableOpacity>
                                    <View style={styles.deleteHeader}>
                                        <Text style={styles.nameModalEmoji}>✏️</Text>
                                        <Text style={styles.deleteTitle}>
                                            {language === 'ko' ? '이름 변경' : 'Change Name'}
                                        </Text>
                                    </View>

                                    <Text style={styles.deleteDescription}>
                                        {language === 'ko'
                                            ? '새로운 이름을 입력해줘'
                                            : 'Enter your new name'}
                                    </Text>

                                    <TextInput
                                        style={styles.nameInput}
                                        value={tempNameInput}
                                        onChangeText={setTempNameInput}
                                        placeholder={language === 'ko' ? '이름 또는 닉네임' : 'Name or nickname'}
                                        placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                        autoFocus={true}
                                        maxLength={20}
                                        returnKeyType="done"
                                        onSubmitEditing={async () => {
                                            if (tempNameInput.trim()) {
                                                const name = tempNameInput.trim();
                                                setUserName(name);
                                                await AsyncStorage.setItem('userName', name);
                                                setShowNameChangeModal(false);
                                                setTempNameInput('');
                                                hapticSuccess();
                                                showToastMessage(language === 'ko' ? '이름이 변경됐어!' : 'Name changed successfully');
                                            }
                                        }}
                                    />

                                    <TouchableOpacity
                                        style={styles.nameConfirmButton}
                                        onPress={async () => {
                                            if (tempNameInput.trim()) {
                                                const name = tempNameInput.trim();
                                                setUserName(name);
                                                await AsyncStorage.setItem('userName', name);
                                                setShowNameChangeModal(false);
                                                setTempNameInput('');
                                                hapticSuccess();
                                                showToastMessage(language === 'ko' ? '이름이 변경됐어!' : 'Name changed successfully');
                                            }
                                        }}
                                    >
                                        <LinearGradient
                                            colors={['#C9A962', '#B8985A']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.nameConfirmGradient}
                                        >
                                            <Text style={styles.nameConfirmButtonText}>
                                                {language === 'ko' ? '변경' : 'Change'}
                                            </Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </KeyboardAvoidingView>
                        </View>
                    </TouchableWithoutFeedback>
                </Modal>

                {/* 익명 위로받기 중복 확인 모달 */}
                <Modal visible={showAnonymousConfirm} transparent animationType="fade" statusBarTranslucent={true}>
                    <View style={styles.deleteOverlay}>
                        <View style={styles.deleteModal}>
                            <View style={styles.deleteHeader}>
                                <Ionicons name="refresh-outline" size={28} color="#C9A962" />
                                <Text style={styles.deleteTitle}>{translate('getComfort')}</Text>
                            </View>
                            
                            <Text style={styles.deleteDescription}>같은 내용으로 다시 위로를 받을까? 일일 횟수가 차감돼</Text>
                            
                            <View style={styles.deleteActionRow}>
                                <TouchableOpacity 
                                    style={styles.cancelButton}
                                    onPress={() => setShowAnonymousConfirm(false)}
                                >
                                    <Text style={styles.cancelButtonText}>취소</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={styles.confirmDeleteButton}
                                    onPress={async () => {
                                        setShowAnonymousConfirm(false);
                                        await performAnonymousAnalysis();
                                    }}
                                >
                                    <Text style={styles.confirmDeleteButtonText}>다시 받기</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* 짧은 입력 확인 모달 */}
                <Modal visible={showShortInputConfirm} transparent animationType="fade" statusBarTranslucent={true}>
                    <View style={styles.deleteOverlay}>
                        <View style={styles.deleteModal}>
                            <View style={styles.deleteHeader}>
                                <Ionicons name="create-outline" size={28} color="#C9A962" />
                                <Text style={styles.deleteTitle}>{translate('shortInputTitle')}</Text>
                            </View>

                            <Text style={styles.deleteDescription}>{translate('shortInputMessage')}</Text>

                            <View style={styles.deleteActionRow}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowShortInputConfirm(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{translate('writeMore')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmDeleteButton}
                                    onPress={async () => {
                                        setShowShortInputConfirm(false);
                                        await performAnonymousAnalysis();
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#C9A962', '#B8985A']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                                    />
                                    <Text style={styles.confirmDeleteButtonText}>{translate('getComfortNow')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* 홈화면 감정일기 짧은 입력 확인 모달 */}
                <Modal visible={showShortDiaryConfirm} transparent animationType="fade" statusBarTranslucent={true}>
                    <View style={styles.deleteOverlay}>
                        <View style={styles.deleteModal}>
                            <View style={styles.deleteHeader}>
                                <Ionicons name="create-outline" size={28} color="#C9A962" />
                                <Text style={styles.deleteTitle}>{translate('shortInputTitle')}</Text>
                            </View>

                            <Text style={styles.deleteDescription}>{translate('shortInputMessage')}</Text>

                            <View style={styles.deleteActionRow}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowShortDiaryConfirm(false)}
                                >
                                    <Text style={styles.cancelButtonText}>{translate('writeMore')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.confirmDeleteButton}
                                    onPress={async () => {
                                        setShowShortDiaryConfirm(false);
                                        await performEmotionAnalysis(currentInputText);
                                    }}
                                >
                                    <LinearGradient
                                        colors={['#C9A962', '#B8985A']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                                    />
                                    <Text style={styles.confirmDeleteButtonText}>{translate('getComfortNow')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>


                {/* 토스트 메시지 */}
                <ToastMessage />

                {/* 업데이트 권장 팝업 */}
                <UpdatePrompt language={language} />
            </LinearGradient>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DESIGN.colors.bgGradient[0],
    },
    starsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
    },
    star: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 2,
        elevation: 2,
    },
    specialStar: {
        position: 'absolute',
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
        shadowColor: '#FFFFFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1.0,
        shadowRadius: 4,
        elevation: 4,
        // 특별한 별은 더 큰 글로우 효과
    },
    darkContainer: {
        backgroundColor: '#1a1a2e',
    },
    background: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },

    // 기본 텍스트 스타일
    defaultText: {
    },

    // 다크모드 공통 스타일
    darkText: {
        color: '#ffffff',
    },
    darkSubText: {
        color: '#cccccc',
    },
    darkCard: {
        backgroundColor: '#3a4556',
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    darkInput: {
        backgroundColor: '#3a4556',
        color: '#ffffff',
        borderColor: '#4a5568',
    },

    // 개선된 고정 CTA
    fixedCTA: {
        marginHorizontal: 20,
        marginTop: Platform.OS === 'ios' ? 70 : 50,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 15,
    },
    fixedCTAButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    fixedCTAText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },

    // 개선된 스트릭 배너
    streakBanner: {
        marginHorizontal: 20,
        marginTop: Platform.OS === 'ios' ? 60 : 20,  // iOS에서 노치 영역 피하기 위해 증가
        marginBottom: 0,  // 아래쪽도 완전히 붙이기
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    streakGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    streakText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
    },

    // 헤더 카드 (간격 조정)
    headerCardShadow: {
        marginHorizontal: 20,
        marginBottom: 20,
        marginTop: 0,
        borderRadius: 24,
        ...Platform.select({
            android: {
                elevation: 15,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 20,
            },
        }),
    },
    headerCard: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    headerCardWithStreak: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    headerGradient: {
        padding: 32,
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 12,
        letterSpacing: -0.8,
    },
    greetingText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        letterSpacing: -0.2,
    },

    // 명언 카드
    quoteCardShadow: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        ...Platform.select({
            android: {
                elevation: 8,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#C9A962',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
        }),
    },
    quoteCard: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    quoteGradient: {
        padding: 24,
    },
    quoteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        gap: 8,
    },
    quoteTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#7dd3fc',
        letterSpacing: -0.3,
    },
    quoteText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 24,
        fontWeight: '500',
        fontStyle: 'italic',
    },

    // 개선된 트렌드 카드
    trendCard: {
        backgroundColor: '#475569',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    improvedChart: {
        padding: 0,
    },
    chartHeader: {
        marginBottom: 24,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    chartSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    chartContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 50,
    },
    chartPoint: {
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    chartBar: {
        width: 12,
        borderRadius: 6,
        minHeight: 8,
    },
    chartLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyChart: {
        padding: 40,
        alignItems: 'center',
    },
    emptyChartText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 20,
    },

    // 스탯 (개선됨)
    statsContainer: {
        width: '85%',
        gap: 20,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingRight: 4,
    },
    statsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    helpButton: {
        padding: 4,
        borderRadius: 12,
        backgroundColor: '#3a4556',
    },
    helpBadge: {
        position: 'absolute',
        top: 10,
        left: 30,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7dd3fc',
        shadowColor: '#7dd3fc',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 6,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statLabel: {
        flex: 0.35,
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 17,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '700',
        textAlign: 'right',
        flexShrink: 0,
        minWidth: 50,
    },
    // 새로 추가된 statRight 스타일
    statRight: {
        flex: 0.65,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 10,
        backgroundColor: '#4a5568',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#7dd3fc',
        borderRadius: 5,
    },
    progressFillHappy: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 5,
    },

    // 감정 입력 섹션
    emotionSection: {
        backgroundColor: '#475569',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 12,
    },
    emotionSectionEnhanced: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    emotionSectionGradient: {
        padding: 24,
        borderRadius: 24,
    },
    insightCardEnhanced: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        shadowColor: '#4f46e5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.18)',
    },
    insightCardGradient: {
        padding: 24,
        borderRadius: 24,
    },

    // 새로운 홈 화면 스타일들
    newHomeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    newHomeContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 120,
        alignItems: 'center',
        width: '100%',
    },
    newHomeHeader: {
        paddingTop: DESIGN.spacing.xxl,
        paddingBottom: DESIGN.spacing.lg,
        alignItems: 'center',
    },
    newHomeGreeting: {
        fontSize: DESIGN.typography.title.size,
        fontWeight: DESIGN.typography.title.weight,
        color: DESIGN.colors.textPrimary,
        textAlign: 'center',
        marginBottom: DESIGN.spacing.sm,
        letterSpacing: DESIGN.typography.title.letterSpacing,
        lineHeight: 42,
    },
    newHomeSubtitle: {
        fontSize: DESIGN.typography.subtitle.size,
        fontWeight: DESIGN.typography.subtitle.weight,
        color: DESIGN.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 26,
        letterSpacing: DESIGN.typography.subtitle.letterSpacing,
    },
    newStreakBanner: {
        marginVertical: 16,
        alignSelf: 'center',
        shadowColor: '#E6C547', // 채도 감소된 색상
        shadowOffset: { width: 0, height: 2 }, // 그림자 강도 감소
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    newStreakGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10, // 크기 축소
        borderRadius: 999, // Pill radius
        gap: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    newStreakText: {
        color: '#4A5568',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(255,255,255,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    newEmotionWheelSection: {
        marginVertical: 20,
        alignItems: 'center',
    },
    newEmotionWheelSectionMain: {
        marginVertical: 40,
        alignItems: 'center',
        paddingVertical: 30,
    },
    newMainTitle: {
        fontSize: 40,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 16,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 6,
        letterSpacing: -0.5,
    },
    newSubtitle: {
        fontSize: 18,
        fontWeight: '500',
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
        paddingHorizontal: 20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    newAIAnalysisSection: {
        marginVertical: 5,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 10,
        width: '100%',
    },
    // 서브타이틀 말풍선 - Calm 스타일
    dottedBubble: {
        backgroundColor: DESIGN.colors.cardBg,
        borderRadius: DESIGN.radius.full,
        padding: DESIGN.spacing.md,
        paddingHorizontal: DESIGN.spacing.lg,
        marginBottom: DESIGN.spacing.xl,
        maxWidth: '80%',
        alignSelf: 'center',
        ...DESIGN.shadows.soft,
    },
    dottedBubbleText: {
        color: DESIGN.colors.textSecondary,
        fontSize: DESIGN.typography.body.size,
        lineHeight: DESIGN.typography.body.lineHeight,
        textAlign: 'center',
        fontWeight: '400',
        letterSpacing: 0.1,
    },
    
    // ScrollView의 contentContainerStyle용 중앙 정렬 - 프리미엄 간격
    centeredScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 120,
    },

    // 중앙 정렬된 메인 컨텐츠 컨테이너 - 프리미엄 간격
    centeredMainContent: {
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    submitHelperContainer: {
        marginTop: 12,
        alignItems: 'center',
    },
    submitHelperText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        marginBottom: 8,
    },
    trustBadgeText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
    },
    // 새로운 레이아웃 스타일들 - Glassmorphism
    newInputSection: {
        marginVertical: DESIGN.spacing.lg,
        marginBottom: DESIGN.spacing.sm,
        width: '100%',
    },
    newInputCard: {
        backgroundColor: DESIGN.colors.cardBg,
        borderRadius: DESIGN.radius.xl,
        padding: DESIGN.spacing.lg,
        width: '100%',
        alignSelf: 'stretch',
        flexShrink: 0,
        ...DESIGN.shadows.soft,
    },
    // 새로운 입력 컨테이너 스타일 - Glassmorphism
    inputContainer: {
        width: '90%',
        maxWidth: 360,
        alignSelf: 'center',
    },
    // 입력 카드 - Glassmorphism
    inputBubbleOuter: {
        borderRadius: DESIGN.radius.xl,
        backgroundColor: DESIGN.colors.cardBg,
        padding: DESIGN.spacing.lg,
        width: '100%',
        minHeight: 140,
        justifyContent: 'flex-start',
        ...DESIGN.shadows.medium,
    },
    inputCounterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: DESIGN.spacing.md,
        paddingHorizontal: DESIGN.spacing.sm,
    },
    emotionInputSimple: {
        textAlignVertical: 'top',
        color: DESIGN.colors.textPrimary,
        fontSize: DESIGN.typography.body.size,
        lineHeight: 26,
        paddingVertical: 4,
        paddingHorizontal: 0,
        width: '100%',
        alignSelf: 'stretch',
        fontWeight: '500',
        letterSpacing: 0.3,
        includeFontPadding: false,
    },
    mainCTASection: {
        marginVertical: DESIGN.spacing.xl,
        alignItems: 'center',
        paddingHorizontal: DESIGN.spacing.lg,
    },
    mainCTAButton: {
        width: '65%',
        maxWidth: 240,
    },
    mainCTAButtonLoading: {
        width: '75%',
        maxWidth: 280,
    },
    mainCTAGradient: {
        borderRadius: DESIGN.radius.full,
        paddingVertical: 18,
        paddingHorizontal: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        ...DESIGN.shadows.medium,
    },
    mainCTAText: {
        color: DESIGN.colors.textOnDark,
        fontSize: DESIGN.typography.button.size,
        fontWeight: DESIGN.typography.button.weight,
        letterSpacing: DESIGN.typography.button.letterSpacing,
    },
    mainCTAHelper: {
        color: DESIGN.colors.textMuted,
        fontSize: DESIGN.typography.caption.size,
        marginTop: DESIGN.spacing.md,
        textAlign: 'center',
        fontWeight: '400',
        letterSpacing: 0.3,
    },
    emptyStateIcon: {
        position: 'absolute',
        top: 20,
        right: 36, // 좌우 패딩 고려한 위치
        zIndex: 0,
    },
    backgroundIcon: {
        opacity: 0.6,
    },
    newAIInputCard: {
        width: '100%',
        padding: 24,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    newSectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    newTrendSection: {
        marginVertical: 40,
        marginTop: 24,
        alignItems: 'center',
        width: '100%',
    },
    newTrendCard: {
        padding: 26,
        borderRadius: 24,
        marginHorizontal: 0,
        width: '88%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
    },
    newTrendTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 15,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    newTextInputSection: {
        marginVertical: 20,
        marginHorizontal: 10,
    },
    newTextInputCard: {
        padding: 24,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    newTextInputTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 24,
        letterSpacing: -0.4,
        textAlign: 'center',
    },
    quickEmotions: {
        marginBottom: 24,
        paddingVertical: 4,
    },
    quickEmotionButton: {
        backgroundColor: '#475569',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 20,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 82,
        width: 82,
        height: 80,
        // 안드로이드에서 중첩된 테두리 문제 해결
        borderWidth: Platform.OS === 'android' ? 1 : 2,
        borderColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: Platform.OS === 'android' ? 0.02 : 0.05,
        shadowRadius: Platform.OS === 'android' ? 2 : 4,
        elevation: Platform.OS === 'android' ? 1 : 2,
    },
    quickEmotionButtonSelected: {
        backgroundColor: '#3f4f63',
        borderColor: '#7dd3fc',
        shadowColor: '#C9A962',
        shadowOpacity: 0.2,
        elevation: 6,
    },
    quickEmotionButtonWide: {
        width: 92, // 영어일 때 넓게
    },
    quickEmotionEmoji: {
        fontSize: 28,
        marginBottom: 6,
    },
    quickEmotionText: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: -0.1,
        maxWidth: 70,
        flexShrink: 1,
    },
    quickEmotionTextTight: {
        letterSpacing: -0.1,
    },
    quickEmotionTextSelected: {
        color: '#7dd3fc',
        fontWeight: '700',
    },
    charCount: {
        fontSize: 13,
        color: DESIGN.colors.textMuted,
        textAlign: 'right',
        fontWeight: '400',
    },
    
    // 제출 버튼 (입력창 아래)
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 28,
        borderRadius: 18,
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: Platform.OS === 'android' ? 0.2 : 0.35,
        shadowRadius: Platform.OS === 'android' ? 6 : 12,
        elevation: Platform.OS === 'android' ? 8 : 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    // 익명 위로받기
    anonymousCardShadow: {
        marginHorizontal: 20,
        marginBottom: 30,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.4)',
        ...Platform.select({
            android: {
                elevation: 12,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#C9A962',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
        }),
    },
    anonymousCard: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    anonymousButton: {
        minHeight: 72,
    },
    anonymousGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    anonymousIcon: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#3b4261',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    anonymousContent: {
        flex: 1,
    },
    anonymousTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    anonymousDesc: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },

    // 탭 헤더
    tabHeader: {
        marginTop: Platform.OS === 'ios' ? 80 : 60,
        marginHorizontal: 20,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tabTitle: {
        fontSize: 40,
        fontWeight: '800',
        color: '#ffffff',
        letterSpacing: -1,
    },

    // 검색
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#475569',
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500',
    },

    // 개선된 필터
    filterContainer: {
        paddingHorizontal: 20,
        marginTop: 8,
        height: 44,
        overflow: 'visible',
    },
    filterChipsContent: {
        alignItems: 'center',
        flexGrow: 0,
    },
    filterChip: {
        backgroundColor: '#475569',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 40,
        flexShrink: 0,
        overflow: 'visible',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    filterChipActive: {
        backgroundColor: '#7dd3fc',
        borderColor: '#7dd3fc',
        shadowColor: '#C9A962',
        shadowOpacity: 0.3,
        elevation: 6,
        height: 44,
        paddingVertical: 12,
    },
    darkFilterChip: {
        backgroundColor: '#3a4556',
    },
    darkFilterChipActive: {
        backgroundColor: '#7dd3fc',
        borderColor: '#7dd3fc',
    },
    filterText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        letterSpacing: -0.2,
        textAlign: 'center',
        width: '100%',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: '700',
    },

    // 빈 상태 (개선됨)
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyIcon: {
        fontSize: 72,
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 24,
        color: '#ffffff',
        marginBottom: 32,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    emptyDesc: {
        fontSize: 14,
        color: 'rgba(74, 55, 40, 0.6)',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 8,
    },
    emptyStateCTAShadow: {
        borderRadius: 16,
        ...Platform.select({
            android: {
                elevation: 8,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#C9A962',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
        }),
    },
    emptyStateCTA: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    emptyGradient: {
        paddingHorizontal: 32,
        paddingVertical: 16,
    },
    emptyCTAText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    // 기록 카드 (개선됨)
    historyCardShadow: {
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 20,
        ...Platform.select({
            android: {
                elevation: 6,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
        }),
    },
    historyCard: {
        backgroundColor: '#475569',
        borderRadius: 20,
        padding: 20,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
        overflow: 'hidden',
    },
    crisisCard: {
        borderLeftColor: '#EF4444',
        borderLeftWidth: 4,
        backgroundColor: '#475569',
    },
    crisisText: {
        color: '#ffffff', // 다른 카드들과 일치하는 흰색 텍스트
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyDate: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
    },
    historyActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    crisisHelper: {
        padding: 4,
    },
    historyText: {
        fontSize: 15,
        color: '#ffffff',
        lineHeight: 22,
        fontWeight: '500',
    },
    quickEmotionDisplay: {
        flexDirection: 'row',
        marginTop: 8,
        alignItems: 'center',
    },
    quickEmotionLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    quickEmotionValue: {
        fontSize: 13,
        color: '#7dd3fc',
        fontWeight: '700',
    },
    comfortSection: {
        marginTop: 12,
        padding: 12,
        backgroundColor: '#2d4a5a',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#7dd3fc',
    },
    comfortTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#7dd3fc',
        marginBottom: 4,
    },
    comfortText: {
        fontSize: 13,
        color: '#ffffff',
        lineHeight: 18,
        fontWeight: '500',
    },
    actionSection: {
        marginTop: 8,
        padding: 12,
        backgroundColor: '#4a3d2d',
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#FFB347',
    },
    actionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF8C00',
        marginBottom: 4,
    },
    actionText: {
        fontSize: 13,
        color: '#ffffff',
        lineHeight: 18,
        fontWeight: '500',
    },
    emotionBadge: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    emotionBadgeText: {
        fontSize: 12,
        color: '#7dd3fc',
        fontWeight: '700',
        paddingHorizontal: 12,
        paddingVertical: 6,
        letterSpacing: -0.1,
    },

    // 강도 표시 (새로 추가)
    intensitySection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    intensityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    intensityLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
    },
    intensityDots: {
        flexDirection: 'row',
        gap: 3,
    },
    intensityDescription: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    intensityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#5a6578',
    },
    intensityDotActive: {
        backgroundColor: '#7dd3fc',
    },

    // 인사이트 카드 (대폭 개선)
    insightCardShadow: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        ...Platform.select({
            android: {
                elevation: 8,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 20,
            },
        }),
    },
    insightCard: {
        backgroundColor: '#475569',
        borderRadius: 24,
        overflow: 'hidden',
    },
    insightTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 20,
        letterSpacing: -0.4,
        textAlign: 'center',
    },

    // 핵심 지표 (새로 추가)
    keyMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'stretch',
        marginBottom: 16,
    },
    metric: {
        flex: 1,
        alignItems: 'center',
        minWidth: 90,
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#7dd3fc',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        textAlign: 'center',
    },

    // 감정 분포 (개선됨)
    emptyInsight: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyInsightText: {
        fontSize: 20,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 28,
    },
    emotionDistribution: {
        gap: 16,
        marginBottom: 20,
    },
    emotionStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    emotionStatLabel: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        width: 80,
        fontWeight: '600',
    },
    emotionStatBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#4a5568',
        borderRadius: 4,
        overflow: 'hidden',
    },
    emotionStatFill: {
        height: '100%',
        borderRadius: 4,
    },
    emotionStatCount: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        width: 80,
        textAlign: 'right',
        fontWeight: '600',
    },
    insightSummary: {
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        gap: 6,
    },
    insightSummaryText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.95)',
        marginBottom: 8,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.2,
        lineHeight: 22,
    },

    // 나를 살린 문장 (개선됨)
    quoteSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        position: 'relative',
    },
    saveButton: {
        position: 'absolute',
        right: 0,
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#3b4261',
    },
    savedQuoteText: {
        fontSize: 18,
        color: '#ffffff',
        lineHeight: 26,
        fontWeight: '500',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 16,
    },
    quoteCenterBox: {
        minHeight: 120,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
    },

    // 행동 추천 (새로 추가)
    recommendedActions: {
        gap: 16,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        marginBottom: 8,
    },
    actionIcon: {
        width: 24,
        alignItems: 'center',
    },
    actionText: {
        fontSize: 15,
        color: '#ffffff',
        fontWeight: '500',
        flex: 1,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxCompleted: {
        backgroundColor: '#059669',
        borderColor: '#059669',
    },

    // 설정 (대폭 개선)
    settingCardShadow: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        ...Platform.select({
            android: {
                elevation: 8,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
        }),
    },
    settingCard: {
        backgroundColor: '#475569',
        borderRadius: 20,
        padding: 20,
        overflow: 'hidden',
    },
    settingCategoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 20,
        letterSpacing: -0.3,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    settingRowVertical: {
        paddingVertical: 4,
    },
    settingRowButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        letterSpacing: -0.2,
    },
    settingDesc: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
        fontWeight: '500',
    },
    settingDivider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginVertical: 16,
    },

    // 토글 스위치 (개선됨)
    toggleSwitch: {
        width: 56,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#e0e0e0',
        justifyContent: 'center',
        padding: 2,
    },
    toggleSwitchActive: {
        backgroundColor: '#7dd3fc',
    },
    toggleThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#475569',
        alignSelf: 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    toggleThumbActive: {
        alignSelf: 'flex-end',
    },

    // 언어 옵션 (개선됨)
    languageOptions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    languageOption: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        backgroundColor: 'transparent',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#fff',
    },
    activeOption: {
        backgroundColor: 'transparent',
        borderColor: '#FFD700',
    },
    darkLanguageOption: {
        backgroundColor: '#3a4556',
    },
    languageText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
    activeText: {
        color: '#FFD700',
        fontWeight: '700',
    },

    // 법적 정보 (개선됨)
    legalCard: {
        backgroundColor: 'transparent',
        marginHorizontal: 20,
        marginBottom: 40,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        width: '90%',
        alignSelf: 'center',
    },
    darkLegalCard: {
        backgroundColor: '#353f50',
    },
    legalText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
        lineHeight: 20,
    },
    legalLinks: {
        flexDirection: 'row',
        gap: 24,
        marginBottom: 24,
    },
    linkText: {
        fontSize: 13,
        color: '#7dd3fc',
        textDecorationLine: 'underline',
        fontWeight: '600',
    },
    deleteAccountButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    deleteAccountText: {
        fontSize: 13,
        color: '#ffffff',
        fontWeight: '600',
    },

    // 탭 바 (개선됨)
    tabBar: {
        borderTopWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 25,
    },
    tabGradient: {
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 28 : 12,
        paddingTop: 16,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        paddingVertical: 8,
    },
    tabText: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.9)',
        marginTop: 4,
        fontWeight: '600',
        letterSpacing: -0.1,
        textShadowColor: 'rgba(0, 0, 0, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Premium Minimal 탭 바
    tabBarNew: {
        backgroundColor: '#0D1117',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.04)',
    },
    tabBarInner: {
        flexDirection: 'row',
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        paddingTop: 12,
    },
    tabItemNew: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        paddingVertical: 4,
    },
    tabTextNew: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.3)',
        marginTop: 6,
        fontWeight: '400',
        letterSpacing: 0.5,
    },
    tabTextActive: {
        color: DESIGN.colors.primary,
        fontWeight: '500',
    },

    // 결과 시트 (대폭 개선)
    resultSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 30,
        overflow: 'hidden',
        backgroundColor: '#161B22',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    darkSheet: {
        shadowColor: '#fff',
        shadowOpacity: 0.1,
    },
    sheetContainer: {
        flex: 1,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        backgroundColor: '#161B22',
    },
    sheetHandle: {
        width: 48,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 16,
        marginBottom: 28,
    },
    darkSheetHandle: {
        backgroundColor: '#666',
    },
    sheetContent: {
        paddingHorizontal: 28,
    },
    sheetBadge: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        borderRadius: 24,
        alignSelf: 'flex-start',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.3)',
    },
    sheetBadgeText: {
        color: '#C9A962',
        fontSize: 16,
        fontWeight: '600',
        paddingHorizontal: 24,
        paddingVertical: 12,
        letterSpacing: 0.5,
    },
    sheetMessage: {
        fontSize: 20,
        color: '#ffffff',
        lineHeight: 28,
        marginBottom: 20,
        fontWeight: '600',
        letterSpacing: -0.4,
    },

    // 시트 내 강도 표시
    sheetIntensity: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sheetIntensityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },

    sheetSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    sheetSectionTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 12,
        letterSpacing: 0.3,
    },
    sheetSectionText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 26,
        fontWeight: '400',
    },
    sheetAction: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    darkSheetAction: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    sheetActionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    sheetActionText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 22,
        fontWeight: '500',
    },

    // 시트 버튼들
    sheetButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    sheetButton: {
        flex: 2,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    sheetButtonSecondary: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 18,
        backgroundColor: '#475569',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetButtonSecondaryText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 15,
        fontWeight: '600',
    },
    sheetButtonGradient: {
        padding: 18,
        alignItems: 'center',
        borderRadius: 16,
    },
    sheetButtonText: {
        color: '#0D1117',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },

    // 위기 지원 모달 (대폭 개선)
    crisisOverlay: {
        flex: 1,
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    crisisContent: {
        backgroundColor: '#1e293b',
        marginHorizontal: 20,
        borderRadius: 24,
        width: '90%',
        maxWidth: 380,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 0,
    },
    darkCrisisContent: {
        backgroundColor: '#2d3436',
    },
    crisisHeader: {
        alignItems: 'center',
        padding: 28,
        gap: 12,
    },
    crisisTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#EF4444',
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    crisisBody: {
        padding: 24,
    },
    crisisMessage: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        fontWeight: '500',
    },
    crisisHelplines: {
        gap: 12,
        marginBottom: 20,
    },
    crisisButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    crisisButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 18,
    },
    crisisButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    crisisButtonSecondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FEF2F2',
        borderRadius: 16,
        padding: 18,
        borderWidth: 2,
        borderColor: '#FCA5A5',
    },
    crisisButtonSecondaryText: {
        color: '#EF4444',
        fontSize: 16,
        fontWeight: '600',
    },

    deleteOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deleteModal: {
        backgroundColor: '#161B22',
        borderRadius: 16,
        padding: 28,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 0,
    },
    deleteHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    deleteTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 12,
    },
    deleteDescription: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    nameInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        fontSize: 17,
        color: '#FFFFFF',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textAlign: 'center',
        fontWeight: '500',
    },
    nameModalEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    nameConfirmButton: {
        borderRadius: 12,
        overflow: 'hidden',
        alignItems: 'center',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    nameConfirmGradient: {
        paddingVertical: 16,
        paddingHorizontal: 40,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    nameConfirmButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#0D1117',
        letterSpacing: 0.5,
    },
    deleteActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmDeleteButton: {
        flex: 1,
        marginLeft: 8,
        backgroundColor: 'transparent',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 0,
        overflow: 'hidden',
    },
    confirmDeleteButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    crisisDisclaimer: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 18,
    },
    crisisCloseButton: {
        backgroundColor: '#475569',
        padding: 20,
        alignItems: 'center',
    },
    crisisCloseText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },

    // 익명 위로 모달 (개선됨)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: 'transparent',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        shadowColor: 'rgba(255, 255, 255, 0.3)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
        elevation: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#475569',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: -0.3,
    },
    anonymousInput: {
        backgroundColor: 'transparent',
        borderRadius: 16,
        padding: 20,
        minHeight: 120,
        fontSize: 16,
        textAlignVertical: 'top',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        color: '#fff', // 입력 텍스트 흰색
    },
    anonymousResult: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 4,
    },
    anonymousResultGradient: {
        padding: 20,
    },
    anonymousResultText: {
        fontSize: 16,
        color: '#ffffff',
        lineHeight: 24,
        marginBottom: 12,
        fontWeight: '500',
    },
    anonymousResultAction: {
        fontSize: 14,
        color: '#7dd3fc',
        fontWeight: '600',
    },
    modalSubmitButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalSubmitButtonDisabled: {
        shadowOpacity: 0,
        elevation: 0,
    },
    gradientButton: {
        paddingHorizontal: 32,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        flexDirection: 'row',
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    // 휴지통 모달 (개선됨)
    trashCard: {
        backgroundColor: '#a0aec0',
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#8b7355',
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(139, 115, 85, 0.1)',
    },
    trashHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    trashDate: {
        fontSize: 12,
        color: 'rgba(100, 80, 60, 0.7)',
        fontWeight: '600',
    },
    trashEmotion: {
        fontSize: 13,
        color: '#8b4513',
        fontWeight: '700',
        backgroundColor: '#3d342a',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    trashText: {
        fontSize: 14,
        color: 'rgba(80, 60, 40, 0.9)',
        marginBottom: 16,
        lineHeight: 20,
    },
    trashActions: {
        flexDirection: 'row',
        gap: 12,
    },
    restoreButton: {
        flex: 1,
        backgroundColor: '#3f4f63',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    restoreText: {
        color: '#7dd3fc',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    deleteText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },

    // 토스트 메시지 (새로 추가)
    toast: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 1000,
    },
    toastError: {
        shadowColor: '#EF4444',
    },
    toastGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 12,
    },
    toastText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    
    // 앱 잠금 화면 스타일
    lockScreen: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#0D1117',
    },
    lockIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(201, 169, 98, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.25)',
        marginBottom: 24,
    },
    lockTitle: {
        fontSize: 22,
        fontWeight: '300',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    lockDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 40,
        fontWeight: '400',
    },
    unlockButton: {
        marginTop: 20,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    lockGradientButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        gap: 10,
    },
    unlockButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0D1117',
        textAlign: 'center',
    },

    // === 새로 추가 ===
    modalHeaderInline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
    },
    centeredModalTitle: {
        flex: 1,
        textAlign: 'center',
    },

    charCountContainer: {
        height: 28,                // 공간을 확보해서
        justifyContent: 'center',  // 그 공간의 중앙에 글자 수 배치
        alignItems: 'flex-end',
        marginTop: 8,
        marginBottom: 16,          // 버튼과 적당히 여유 있게
    },
    charCountAnonymous: {
        color: '#999',
    },

    // 의료 면책 조항 스타일
    medicalDisclaimer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4a2d2d',
        padding: 12,
        borderRadius: 8,
        marginTop: 16,
        gap: 8,
    },
    medicalDisclaimerText: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '600',
        flex: 1,
        lineHeight: 16,
    },

    // 다른 위로받기 버튼 스타일
    anotherComfortButton: {
        marginTop: 12,
        alignSelf: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#4a5170',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.5)',
    },
    anotherComfortText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        fontWeight: '600',
    },
    
    // 사용량 표시 스타일
    inputInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    dailyUsage: {
        color: DESIGN.colors.textMuted,
        fontSize: 13,
        fontWeight: '400',
    },
    anonymousTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    anonymousCount: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 12,
        fontWeight: '600',
        backgroundColor: '#2d3748',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    
    // 비밀번호 모달 스타일
    passwordModalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 0,
    },
    passwordModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    passwordModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    passwordModalBody: {
        padding: 20,
        gap: 12,
    },
    passwordModalSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 20,
    },
    passwordModalWarning: {
        fontSize: 12,
        color: '#F59E0B',
        textAlign: 'center',
        backgroundColor: '#4a3f2a',
        padding: 8,
        borderRadius: 8,
        fontWeight: '500',
    },
    passwordModalInput: {
        backgroundColor: '#475569',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: 'rgba(74, 222, 128, 0.3)',
        marginTop: 8,
    },
    passwordModalRule: {
        fontSize: 12,
        color: 'rgba(125, 211, 252, 0.8)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    passwordModalButtons: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        paddingTop: 12,
    },
    passwordModalButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    passwordConfirmGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    confirmButtonDisabled: {
        opacity: 0.6,
    },
    // 휴지통 구겨진 종이 효과
    trashModalContainer: {
        backgroundColor: '#f5f0e8', // 구겨진 종이 베이스 색상
        position: 'relative',
    },
    crumpledPaperOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        // 구겨진 종이 텍스처를 그라데이션으로 시뮬레이션
        opacity: 0.15,
        // 여러 겹의 그림자로 구겨진 효과
        shadowColor: '#8b7355',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        // 대각선 패턴 효과
        transform: [{ skewX: '0.5deg' }, { skewY: '0.2deg' }],
    },

    // 주간 감정 카드 스타일
    weeklyEmotionCard: {
        width: '100%',
        marginVertical: 20,
        marginBottom: 24,
    },
    weeklyEmotionGradient: {
        borderRadius: 24,
        padding: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    weeklyEmotionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    weeklyEmotionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: 0.3,
    },
    // 지난 5일 섹션 - Glassmorphism
    recentDaysSection: {
        marginVertical: DESIGN.spacing.lg,
        width: '100%',
        paddingHorizontal: DESIGN.spacing.lg,
    },
    recentDaysCard: {
        borderRadius: DESIGN.radius.xl,
        backgroundColor: DESIGN.colors.cardBg,
        paddingVertical: DESIGN.spacing.lg,
        paddingHorizontal: DESIGN.spacing.xl,
        width: '100%',
        ...DESIGN.shadows.soft,
    },
    recentDaysTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: DESIGN.colors.textPrimary,
        textAlign: 'center',
        marginBottom: DESIGN.spacing.md,
        letterSpacing: 0.2,
    },
    recentDaysList: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        gap: DESIGN.spacing.md,
    },
    recentDayItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: DESIGN.spacing.xs,
        minWidth: 56,
    },
    recentDayEmoji: {
        fontSize: 24,
    },
    recentDayDate: {
        fontSize: 11,
        color: DESIGN.colors.textMuted,
        fontWeight: '500',
        textAlign: 'center',
    },
    // AI 채팅 스타일
    turnCounter: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 4,
    },
    chatHistory: {
        flex: 1,
        marginBottom: 12,
    },
    chatHistoryContent: {
        paddingVertical: 12,
        flexGrow: 1,
    },
    emptyChatContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyChatText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
    chatBubble: {
        maxWidth: '75%',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        marginVertical: 4,
    },
    chatBubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: '#06b6d4',
        marginLeft: 60,
    },
    chatBubbleAi: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(71, 85, 105, 0.9)',
        marginRight: 60,
    },
    chatBubbleText: {
        fontSize: 15,
        lineHeight: 20,
    },
    chatBubbleTextUser: {
        color: '#ffffff',
    },
    chatBubbleTextAi: {
        color: '#ffffff',
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    chatInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#ffffff',
        fontSize: 15,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    chatSendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#06b6d4',
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatSendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    // AI 채팅 전체 화면 스타일
    chatScreenContainer: {
        flex: 1,
        padding: 20,
    },
    chatScreenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        marginBottom: 0,
    },
    chatBackButton: {
        padding: 4,
    },
    chatScreenTitle: {
        fontSize: 20,
        fontWeight: '300',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    chatScreenSubtitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
        fontWeight: '400',
    },
    noTurnsContainer: {
        marginTop: 12,
        marginBottom: 8,
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    noTurnsText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 4,
    },
    comeBackText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
    },
    chatScreenHistory: {
        flex: 1,
    },
    chatScreenHistoryContent: {
        paddingVertical: 16,
        flexGrow: 1,
    },
    chatScreenEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    chatScreenEmptyText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        fontWeight: '400',
    },
    chatScreenBubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        marginVertical: 6,
    },
    chatScreenBubbleUser: {
        alignSelf: 'flex-end',
        backgroundColor: 'rgba(201, 169, 98, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.3)',
    },
    chatScreenBubbleAi: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chatScreenBubbleText: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
    },
    chatScreenBubbleTextUser: {
        color: '#C9A962',
    },
    chatScreenBubbleTextAi: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
    chatScreenInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    chatScreenInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 12,
        color: '#ffffff',
        fontSize: 15,
        maxHeight: 120,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    chatScreenSendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#C9A962',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    chatScreenSendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        shadowOpacity: 0,
        elevation: 0,
    },
    // 채팅 기록 모달 스타일 (결과 시트와 동일)
    chatHistoryModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    chatHistoryModalContent: {
        backgroundColor: '#161B22',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    chatHistoryBgContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: '#161B22',
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    },
    chatHistoryHandle: {
        width: 48,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 16,
        marginBottom: 20,
    },
    chatHistoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 28,
        paddingBottom: 20,
        borderBottomWidth: 0,
    },
    chatHistoryTitle: {
        fontSize: 20,
        fontWeight: '300',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    chatHistoryCloseButton: {
        padding: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 18,
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatHistoryList: {
        paddingHorizontal: 28,
        paddingVertical: 16,
    },
    chatHistoryEmpty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    chatHistoryEmptyText: {
        marginTop: 16,
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    chatHistoryItemContainer: {
        marginBottom: 16,
    },
    chatHistoryItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    chatHistoryDeleteButton: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    chatHistoryItemTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#ffffff',
        lineHeight: 24,
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    chatHistoryItemDate: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
    },
    chatHistoryItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    chatHistoryItemCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
    },
    chatHistoryItemPreview: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 20,
    },

    // ============================================
    // DeepLog 홈 화면 스타일
    // ============================================
    deeplogBgLight1: {
        position: 'absolute',
        top: -100,
        right: -50,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(100, 150, 180, 0.12)',
    },
    deeplogBgLight2: {
        position: 'absolute',
        bottom: 200,
        left: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(100, 150, 180, 0.08)',
    },
    deeplogTitle: {
        fontSize: 28,
        fontWeight: '300',
        color: '#FFFFFF',
        marginTop: 32,
        marginBottom: 32,
        lineHeight: 42,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    deeplogInputCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
        minHeight: 140,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    deeplogTextInput: {
        fontSize: 17,
        color: '#FFFFFF',
        lineHeight: 26,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    deeplogCTAButton: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 20,
    },
    deeplogCTAButtonActive: {
        shadowColor: '#6B9DAD',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 24,
        elevation: 8,
    },
    deeplogCTAGradient: {
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deeplogCTAInactive: {
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deeplogCTAText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    deeplogPrivacyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 28,
    },
    deeplogPrivacyText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '400',
    },
    deeplogStreakCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    deeplogStreakText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    deeplogStreakSubtext: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '400',
    },
    deeplogRecentSection: {
        marginTop: 0,
    },
    deeplogRecentLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.4)',
        marginBottom: 14,
        marginLeft: 4,
        letterSpacing: 0.5,
    },
    deeplogRecentList: {
        flexDirection: 'row',
        gap: 12,
    },
    deeplogRecentItem: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    deeplogRecentEmoji: {
        fontSize: 30,
        marginBottom: 8,
    },
    deeplogRecentDay: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '500',
    },
});