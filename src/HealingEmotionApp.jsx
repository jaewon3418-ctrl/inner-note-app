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
    PanResponder,
    BackHandler,
    AppState,
    Keyboard,
} from 'react-native';
import LottieView from 'lottie-react-native';
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
import { analyzeEmotion } from './services/openai';
import 'react-native-get-random-values';
import { loadData as loadStorageData, saveData as saveStorageData } from './utils/storage';
import { saveEncryptedData, loadEncryptedData, checkUserConsent, checkOpenAIConsent, exportUserData, revokeConsent, deleteAllEncryptedData } from './utils/secureStorage';
import { registerForPushNotificationsAsync, scheduleLocalNotification, scheduleDailyNotification } from './services/notifications';
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
import BackgroundSelector from './components/BackgroundSelector';
import BackgroundWrapper from './components/BackgroundWrapper';
import { loadSelectedBackground, saveSelectedBackground } from './utils/backgroundManager';
import PromptChips from './components/PromptChips';
import RemainingBadge from './components/RemainingBadge';
import SparseSample from './components/SparseSample';
import CollapsibleText from './components/CollapsibleText';
import EmotionWheel from './components/EmotionWheel';
import FloatingActions from './components/FloatingActions';
// EnhancedBearCharacter removed

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

// 언어 독립적 감정 키 시스템
const EMOTIONS = {
    JOY:     { ko: '좋아',   en: 'Good',   color: '#4ADE80', order: 1 },
    CALM:    { ko: '평온해', en: 'Calm',   color: '#4ADE80', order: 2 },
    OK:      { ko: '괜찮아', en: 'Okay',   color: '#FBBF24', order: 3 },
    LONELY:  { ko: '외로워', en: 'Lonely', color: '#FBBF24', order: 4 },
    ANXIOUS: { ko: '불안해', en: 'Anxious', color: '#EF4444', order: 5 },
    SAD:     { ko: '슬퍼',   en: 'Sad',    color: '#EF4444', order: 6 },
};

const toEmotionKey = (label = '') => {
    const s = `${label}`.toLowerCase();
    if (['좋아','행복해','good','happy','great'].some(v=>s.includes(v))) return 'JOY';
    if (['평온','차분','calm','peaceful'].some(v=>s.includes(v))) return 'CALM';
    if (['괜찮','ok','okay','fine'].some(v=>s.includes(v))) return 'OK';
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
            {/* 입력 버블 */}
            <View style={styles.inputBubble}>
                <AutoGrowInput
                    value={currentText}
                    onChangeText={handleTextChange}
                    minRows={1}
                    maxRows={8}
                    lineHeight={22}
                    placeholder=""
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.emotionInputSimple}
                    maxLength={200}
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
                    <Text style={styles.charCount}>{currentText.length}/200</Text>
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
    const [showAnonymousModal, setShowAnonymousModal] = useState(false);
    const [anonymousText, setAnonymousText] = useState('');
    const [anonymousResult, setAnonymousResult] = useState(null);
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
    const [selectedFilter, setSelectedFilter] = useState('ALL'); // 내부적으로는 고정값 사용
    const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });
    const [showNameModal, setShowNameModal] = useState(false);
    // tempCharacterName removed
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [backupPassword, setBackupPassword] = useState('');
    const [selectedBackground, setSelectedBackground] = useState('night-sky-meteor');
    const [showBackgroundSelector, setShowBackgroundSelector] = useState(false);
    const [currentInputText, setCurrentInputText] = useState('');
    
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

    // 캐릭터 카드 애니메이션 스타일 메모이즈 (리렌더 방지)
    // characterCardStyle removed
    
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

    // 푸시 알림 설정 (Expo Go가 아닐 때만)
    useEffect(() => {
        if (!isExpoGo && Notifications) {
            // 푸시 알림 권한 요청 및 토큰 등록
            registerForPushNotificationsAsync();

            // 일일 알림 스케줄링
            const setupDailyNotifications = async () => {
                // 기존 알림들 취소하고 새로 설정
                await Notifications.cancelAllScheduledNotificationsAsync();
                
                // 저녁 6시
                await scheduleDailyNotification("일기 쓸 시간이야 ✨", "오늘도 수고했어, 마음 정리하고 가자", 18, 0);
                
                // 저녁 8시  
                await scheduleDailyNotification("감정 기록 안 했지? 🤔", "잊지 말고 오늘 하루도 정리해봐", 20, 0);
                
                // 밤 10시
                await scheduleDailyNotification("일기 작성 잊은 거 아니지? 📖", "오늘도 하루 마무리는 확실히 하자!", 22, 0);
                
                console.log('Daily notifications scheduled: 6PM, 8PM, 10PM');
            };

            setupDailyNotifications();

            // 알림 수신 리스너
            const notificationListener = Notifications.addNotificationReceivedListener(notification => {
                console.log('Notification received:', notification);
            });

            // 알림 클릭 리스너
            const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('Notification clicked:', response);
                // 알림 클릭 시 홈 탭으로 이동
                setCurrentTab('home');
            });

            return () => {
                Notifications.removeNotificationSubscription(notificationListener);
                Notifications.removeNotificationSubscription(responseListener);
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


    // 통합 초기화 함수 - 모든 삭제 버튼에서 사용
    const resetAllData = async () => {
        try {
            // 1) AsyncStorage 키 삭제
            await AsyncStorage.multiRemove(['lastRecordDateKey', 'language']);
            
            // 2) SecureStore 데이터 삭제
            await SecureStore.deleteItemAsync('appLockEnabled').catch(() => {});
            await SecureStore.deleteItemAsync('emotion_app_key').catch(() => {});
            
            // 3) 암호화된 데이터 삭제
            const { clearAllData } = require('./utils/storage');
            await clearAllData();
            await deleteAllEncryptedData();
            
            // 4) 메모리 상태 초기화
            setEmotionHistory([]);
            setStreak(0);
            setAppLockEnabled(false);
            setCompletedActivities({}); // 완료된 활동들도 초기화
            setCurrentTab('home'); // 홈 탭으로 초기화
            setDailyDiaryCount(0); // 일일 카운트 초기화
            setDailyAnonymousCount(0);
            setLastDiaryDate(''); // 마지막 기록 날짜 초기화
            
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
            
            // 선택된 배경 로드
            const backgroundId = await loadSelectedBackground();
            setSelectedBackground(backgroundId);
            
            const data = await loadStorageData();
            if (__DEV__) console.log('Loaded data:', data);
            
            // 언어 설정 로드
            const savedLang = await AsyncStorage.getItem('language');
            if (savedLang) setLanguage(savedLang);
            
            // emotionHistory는 아래에서 통합 처리
            if (data.streak) setStreak(parseInt(data.streak));
            
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
                
                await saveStorageData({
                    streak,
                    dailyAnonymousCount,
                    lastDiaryDate,
                    lastDiaryDateKey: lastDiaryDate, // 호환성을 위해 키 추가
                    completedActivities: JSON.stringify(completedActivities)
                });
            } catch (error) {
                if (__DEV__) console.log('Save error:', error);
            }
        }, 300);
    }, [emotionHistory, streak, dailyAnonymousCount, lastDiaryDate, completedActivities]);

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

    // 캐릭터 이름 변경 함수
    // handleCharacterNameChange removed

    // 감정 제출 (개선됨)
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
            '🔒 백업 옵션 선택',
            '데이터를 어떻게 백업하시겠습니까?\n\n🔐 암호화: 비밀번호로 안전하게 보호\n📄 평문: 암호화하지 않음 (주의 필요)',
            [
                { text: '취소', style: 'cancel' },
                { text: '평문 백업', style: 'default', onPress: exportPlainBackup },
                { 
                    text: '암호화 백업', 
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
            Alert.alert('비밀번호 오류', '4글자 이상의 비밀번호를 입력해주세요.');
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: '암호화 백업을 위해 인증해주세요',
                fallbackLabel: '비밀번호 사용',
            });
            
            if (!result.success) {
                Alert.alert('인증 실패', '백업을 취소합니다.');
                return;
            }

            const backup = {
                emotionHistory,
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

            const uri = FileSystem.documentDirectory + `healingemotion-encrypted-${new Date().toISOString().slice(0,10)}.json`;
            await FileSystem.writeAsStringAsync(uri, JSON.stringify(encryptedBackup, null, 2));
            
            setShowPasswordModal(false);
            setBackupPassword('');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/json',
                    dialogTitle: '🔐 암호화된 감정 백업 파일',
                });
                showToastMessage(language === 'ko' ? '🔒 암호화 백업이 완료되었습니다' : '🔒 Encrypted backup completed');
            } else {
                Alert.alert('백업 완료', '암호화된 파일이 생성되었습니다');
            }
        } catch (error) {
            console.error('Encrypted backup error:', error);
            Alert.alert('오류', '암호화 백업 중 오류가 발생했습니다.');
            setShowPasswordModal(false);
            setBackupPassword('');
        }
    };

    // 평문 백업 (기존 방식)
    const exportPlainBackup = async () => {
        Alert.alert(
            '⚠️ 평문 백업 주의',
            '암호화되지 않은 파일로 백업됩니다.\n\n개인적인 감정 기록이 포함되어 있으므로 안전한 장소에만 보관하고 신뢰할 수 있는 사람과만 공유하세요.',
            [
                { text: '취소', style: 'cancel' },
                { 
                    text: '확인 후 백업', 
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await LocalAuthentication.authenticateAsync({
                                promptMessage: '평문 백업을 위해 인증해주세요',
                                fallbackLabel: '비밀번호 사용',
                            });
                            
                            if (!result.success) {
                                Alert.alert('인증 실패', '백업을 취소합니다.');
                                return;
                            }
                            
                            const backup = {
                                emotionHistory,
                                streak,
                                language,
                                exportDate: new Date().toISOString(),
                                encrypted: false,
                            };
                            const uri = FileSystem.documentDirectory + `healingemotion-plain-${new Date().toISOString().slice(0,10)}.json`;
                            await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));
                            
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(uri, {
                                    mimeType: 'application/json',
                                    dialogTitle: '📄 평문 감정 백업 파일 (주의 필요)',
                                });
                                showToastMessage(language === 'ko' ? '평문 백업이 완료되었습니다' : 'Plain text backup completed');
                            } else {
                                Alert.alert('백업 완료', '파일이 생성되었습니다');
                            }
                        } catch (error) {
                            if (error.code === 'UserCancel') {
                                Alert.alert('취소됨', '백업을 취소했습니다.');
                            } else {
                                showToastMessage('백업 중 오류가 발생했어요', 'error');
                            }
                        }
                    }
                }
            ]
        );
    };



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
                '데이터 전송 동의 필요',
                'AI 감정 분석을 위해 OpenAI로 데이터를 전송해야 합니다.\n\n동의 화면으로 이동하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { 
                        text: '동의하기', 
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

        try {
            // 실제 OpenAI API로 감정 분석
            const analysis = await analyzeEmotion(inputText);
            
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

            setEmotionHistory(prev => [newEntry, ...prev]);
            setCurrentResult(analysis);
            
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
                    setStreak(prev => prev + 1);
                } else {
                    // 연속 기록 중단 또는 첫 기록
                    setStreak(1);
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
    }, [isSubmitting, analyzeEmotion, emotionHistory, showToastMessage, selectedQuickEmotion, language, translate]);

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
            if (showNameModal) {
                setShowNameModal(false);
                return true;
            }
            if (showPasswordModal) {
                setShowPasswordModal(false);
                return true;
            }
            if (showBackgroundSelector) {
                setShowBackgroundSelector(false);
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
    }, [showCrisisModal, showAnonymousModal, showTrash, showDeleteConfirm, showAnonymousConfirm, showResultSheet, showNameModal, showPasswordModal, showBackgroundSelector, currentTab, hasUserConsent]);


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

    // 언어 변경시 자동 저장 및 UI 업데이트
    useEffect(() => {
        AsyncStorage.setItem('language', language).catch(()=>{});
        // 언어 변경시 사용자 지정 캐릭터 이름은 보존 (덮어쓰지 않음)
        // selectedFilter는 내부 상수('ALL')로 유지
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
                '데이터 전송 동의 필요',
                'AI 위로 분석을 위해 OpenAI로 데이터를 전송해야 합니다.\n\n동의 화면으로 이동하시겠습니까?',
                [
                    { text: '취소', style: 'cancel' },
                    { 
                        text: '동의하기', 
                        style: 'default',
                        onPress: () => setShowConsentScreen(true)
                    }
                ]
            );
            return;
        }
        setIsSubmitting(true);
        try {
            const result = await analyzeEmotion(anonymousText, true);
            setAnonymousResult(result);
            setDailyAnonymousCount(prev => prev + 1);
            showToastMessage(translate('comfortReceived'));
            hapticSuccess();
        } catch (error) {
            showToastMessage(translate('retryLater'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [anonymousText, dailyAnonymousCount, showToastMessage]);

    // 주간 리포트 공유 (실제 구현)
    const shareWeeklyReport = useCallback(async () => {
        const from = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weeklyData = emotionHistory.filter(
            e => !e.deletedAt && new Date(e.date).getTime() >= from
        );

        if (weeklyData.length === 0) {
            Alert.alert('아직 기록이 부족해요', '일주일간 기록해보시면 리포트를 만들어드릴게요!');
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


    // 곰 상태 계산 함수
    const getBearMood = useCallback(() => {
        const today = getLocalDateKey();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayKey = getLocalDateKey(yesterday);
        
        // 처음 설치한 사용자 (기록이 전혀 없음) - 환영 상태
        if (emotionHistory.length === 0) return 'welcome';
        
        // 오늘 기록이 있으면 happy
        const hasRecordToday = emotionHistory.some(e => 
            !e.deletedAt && e.date && (e.dateKey === today || getLocalDateKey(new Date(e.date)) === today)
        );
        if (hasRecordToday) return 'happy';
        
        // 어제 기록이 있으면 concerned (걱정)
        const hasRecordYesterday = emotionHistory.some(e => 
            !e.deletedAt && e.date && (e.dateKey === yesterdayKey || getLocalDateKey(new Date(e.date)) === yesterdayKey)
        );
        if (hasRecordYesterday) return 'concerned';
        
        // 2일 이상 미기록이면 sad
        return 'sad';
    }, [emotionHistory]);

    // 곰 캐릭터 컴포넌트(타이핑 시 리렌더 방지)
    // ImprovedCharacter component removed



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

    // 토스트 컴포넌트
    const ToastMessage = () => {
        if (!showToast.show) return null;

        return (
            <Animated.View style={[
                styles.toast,
                { transform: [{ translateY: toastAnim }] },
                showToast.type === 'error' && styles.toastError
            ]}>
                <LinearGradient
                    colors={showToast.type === 'error' ? ['#FEF2F2', '#FCA5A5'] : ['#F0FDF4', '#86EFAC']}
                    style={styles.toastGradient}
                >
                    <Ionicons
                        name={showToast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                        size={20}
                        color={showToast.type === 'error' ? '#DC2626' : '#059669'}
                    />
                    <Text style={[
                        styles.toastText,
                        { color: showToast.type === 'error' ? '#DC2626' : '#059669' }
                    ]}>
                        {showToast.message}
                    </Text>
                </LinearGradient>
            </Animated.View>
        );
    };

    // 새로운 홈 탭 (완전 리디자인)
    const renderHomeTab = () => (
            <View style={{ flex: 1 }}>
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{ 
                        flexGrow: 1, 
                        justifyContent: showResultSheet ? 'flex-start' : 'center',
                        paddingTop: 60,
                        paddingBottom: 120,
                        minHeight: showResultSheet ? 'auto' : '100%'
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={true}
                    bounces={true}
                    onScrollBeginDrag={() => Keyboard.dismiss()}>
                {/* 중앙 정렬된 메인 컨텐츠 */}
                <View style={styles.centeredMainContent}>
                    {/* 헤더 영역 */}
                    <View style={styles.newHomeHeader}>
                        <Text style={styles.newHomeGreeting}>
                            {sessionGreeting}
                        </Text>
                    </View>

                    {/* 점선 말풍선 */}
                    <Animated.View style={[styles.dottedBubble, { opacity: cardFadeAnim }]}>
                        <Text style={styles.dottedBubbleText}>
                            {sessionGreetingSub}
                        </Text>
                    </Animated.View>

                    {/* 스트릭 배너 */}
                    {streak > 0 && (
                        <Animated.View style={[styles.newStreakBanner, { opacity: cardFadeAnim }]}>
                            <TouchableOpacity
                                onPress={() => {
                                    // TODO: 스트릭 달력 모달 추가
                                    console.log('스트릭 모달 열기');
                                }}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#E6C547', '#D4B642']} // 채도 15% 감소
                                    style={styles.newStreakGradient}
                                >
                                    <Ionicons name="flame" size={18} color="#fff" />
                                    <Text style={styles.newStreakText}>
                                        {translate('streakMessage', { days: streak })}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )}

                    {/* 입력 카드 - 단순화 */}
                    <Animated.View 
                        style={[styles.newInputSection, { opacity: cardFadeAnim }]}
                        pointerEvents="box-none"
                    >
                        <EmotionInput
                            t={t}
                            onSubmit={submitEmotion}
                            disabled={isSubmitting}
                            resetSeq={inputResetSeq}
                            dailyCount={dailyDiaryCount}
                            language={language}
                            onTextChange={handleInputTextChange}
                            currentText={currentInputText}
                        />
                    </Animated.View>

                    {/* 메인 CTA - 카드 밖으로 */}
                    <Animated.View style={[styles.mainCTASection, { opacity: cardFadeAnim }]}>
                        <TouchableOpacity
                            onPress={() => submitEmotion(currentInputText)}
                            disabled={isSubmitting || !currentInputText.trim()}
                            style={styles.mainCTAButton}
                        >
                            <LinearGradient
                                colors={(!currentInputText.trim() || isSubmitting) ? ['#6B7280', '#9CA3AF'] : ['#A78BFA', '#8B5CF6']}
                                style={styles.mainCTAGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <ActivityIndicator color="#fff" size="small" />
                                        <Text style={styles.mainCTAText}>{translate('submitPending')}</Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="heart-pulse" size={24} color="#fff" />
                                        <Text style={styles.mainCTAText}>{translate('submitEmotion')}</Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                        
                        {/* 도움말 한 줄만 */}
                        <Text style={styles.mainCTAHelper}>
                            {translate('helperText')}
                        </Text>
                    </Animated.View>
                </View>

                {/* 간소화된 트렌드 (최근 7일) */}
                {emotionHistory.length > 0 && (
                    <Animated.View style={[styles.newTrendSection, { opacity: cardFadeAnim }]}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                            style={styles.newTrendCard}
                        >
                            <ImprovedTrendChart />
                        </LinearGradient>
                    </Animated.View>
                )}

                
                {/* 하단 여백 (플러스 버튼과의 거리 확보) */}
                <View style={{ height: 80 }} />
                </ScrollView>

                {/* 플로팅 액션 버튼들 */}
                <FloatingActions
                    onComfortPress={() => setShowAnonymousModal(true)}
                    language={language}
                />
            </View>
    );

    // 기록 탭 (개선됨)
    // 기록 탭 (홈화면 스타일로 리디자인)
    const renderHistoryTab = () => {
        const filteredHistory = getFilteredHistory();
        
        return (
            <View style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={filteredHistory.length === 0 ? {
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
                        {/* 기록이 없을 때 */}
                        {filteredHistory.length === 0 ? (
                            <Animated.View style={[styles.dottedBubble, { opacity: cardFadeAnim, transform: [{ scale: 1.1 }] }]}>
                                <Text style={[styles.dottedBubbleText, { fontSize: 16 }]}>
                                    {translate('emptyHistory')}
                                </Text>
                            </Animated.View>
                        ) : (
                            /* 헤더 영역 - 기록이 있을 때만 표시 */
                            <>
                                <View style={styles.newHomeHeader}>
                                    <Text style={[styles.newHomeGreeting, { fontSize: 30 }]}>
                                        {translate('tabHistory')}
                                    </Text>
                                </View>
                                {/* 검색 영역 */}
                                <Animated.View 
                                    style={{ 
                                        opacity: cardFadeAnim, 
                                        width: '90%',            // 기록 카드랑 동일
                                        alignSelf: 'center', 
                                        marginVertical: 16 
                                    }}
                                >
                                    <View style={{ 
                                        width: '100%',           // 내부도 꽉 차게
                                        backgroundColor: 'rgba(255,255,255,0.1)', 
                                        borderRadius: 16, 
                                        padding: 16, 
                                        marginBottom: 20, 
                                        borderWidth: 1, 
                                        borderColor: 'rgba(255, 255, 255, 0.2)',
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}>
                                        <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.6)" />
                                        <TextInput
                                            style={[styles.searchInput, { flex: 1, marginLeft: 12, color: '#fff', fontSize: 16 }]}
                                            placeholder={translate('searchPlaceholder')}
                                            placeholderTextColor="#999"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                        <TouchableOpacity 
                                            onPress={() => setShowTrash(true)}
                                            style={{ marginLeft: 12 }}
                                        >
                                            <Ionicons name="trash-outline" size={20} color="rgba(255, 255, 255, 0.6)" />
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>

                                {/* 기록 카드들 */}
                                {filteredHistory.slice(0, 10).map((item, index) => (
                                    <Animated.View key={item.id} style={{ opacity: cardFadeAnim, marginBottom: 16, width: '90%', alignSelf: 'center' }}>
                                        <LinearGradient
                                            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                                            style={{ borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
                                        >
                                            {/* 기록 헤더 */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                                                    {formatLocalizedDate(item.date, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        weekday: 'short'
                                                    })}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <View style={[styles.emotionBadge, { backgroundColor: 'rgba(102, 126, 234, 0.3)' }]}>
                                                        <Text style={[styles.emotionBadgeText, { fontSize: 12 }]}>
                                                            {language === 'ko' ? (item.emotion_ko || item.emotion) : (item.emotion_en || item.emotion)}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                                                        <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.5)" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            
                                            {/* 기록 내용 */}
                                            <Text style={{ color: '#fff', fontSize: 16, lineHeight: 22, marginBottom: 12 }}>
                                                {item.text}
                                            </Text>
                                            
                                            {/* 위로의 말 */}
                                            {item.comfort && (
                                                <View style={{ marginTop: 12, padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' }}>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>✨ {translate('comfortWords')}</Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 20 }}>
                                                        {language === 'ko' ? (item.comfort_ko || item.comfort) : (item.comfort_en || item.comfort)}
                                                    </Text>
                                                </View>
                                            )}
                                        </LinearGradient>
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
                        <Text style={[styles.newHomeGreeting, { fontSize: 30 }]}>
                            {translate('insights')}
                        </Text>
                    </View>

                    {/* 핵심 지표 카드 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '90%', alignSelf: 'center' }}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                            style={{ borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
                        >
                            <Text style={[styles.insightTitle, { color: '#fff', fontSize: 19 }]}>{translate('thisWeekKeyMetrics')}</Text>

                            <View style={styles.keyMetrics}>
                                <View style={styles.metric}>
                                    <Text style={styles.metricValue}>{streak}</Text>
                                    <Text style={[styles.metricLabel, null]}>{translate('consecutiveDays')}</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricValue}>{weeklyInputs}</Text>
                                    <Text style={[styles.metricLabel, null]}>{translate('weeklyInputs')}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                </Animated.View>

                    {/* 주간 감정 분포 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '90%', alignSelf: 'center' }}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                            style={{ borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
                        >
                        <View style={{ alignItems: 'center', marginBottom: 8 }}>
                            <Text style={[styles.insightTitle, { color: '#fff', fontSize: 19, textAlign: 'center' }]}>{translate('emotionDistribution')}</Text>
                            {totalRecords > 0 && totalRecords < 3 && (
                                <View style={{ marginTop: 8 }}>
                                    <SparseSample language={language} />
                                </View>
                            )}
                        </View>

                        {totalRecords === 0 ? (
                            <View style={styles.emptyInsight}>
                                <Text style={[styles.emptyInsightText, null]}>
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
                                                    colors={['#667eea', '#764ba2']}
                                                    style={[
                                                        styles.emotionStatFill,
                                                        { width: `${(count / totalRecords) * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                                <Text style={[styles.emotionStatCount, null]}>
                                                    {language === 'ko' ? `${count}회` : `${count} ${count === 1 ? 'time' : 'times'}`} ({Math.round((count / totalRecords) * 100)}%)
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
                                    <Text style={styles.insightSummaryText}>
                                        {translate('totalPreciousRecords', { count: totalRecords })}
                                    </Text>
                                </View>
                            </>
                        )}
                        </LinearGradient>
                    </Animated.View>

                    {/* 나를 살린 문장 */}
                    {recentData.length > 0 && (
                        <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '90%', alignSelf: 'center' }}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                                style={{ borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
                            >
                                <View style={styles.quoteSectionHeader}>
                                    <Text style={[styles.insightTitle, { textAlign: 'center', color: '#fff', fontSize: 19 }]}>{translate('weeklyQuote')}</Text>
                                </View>

                                <View style={styles.quoteCenterBox}>
                                    <Text style={styles.savedQuoteText}>
                                        "{language === 'ko' ? (recentData[0]?.comfort_ko || recentData[0]?.comfort || '당신의 마음을 소중히 여기세요.') : (recentData[0]?.comfort_en || recentData[0]?.comfort || 'Take care of your precious heart.')}"
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    )}

                    {/* 행동 추천 */}
                    {recentData.length > 0 && (
                        <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '90%', alignSelf: 'center' }}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.03)']}
                                style={{ borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
                            >
                            <Text style={[styles.insightTitle, { color: '#fff', fontSize: 19 }]}>{translate('weeklyRecommendedActivities')}</Text>
                            <View style={styles.recommendedActions}>
                                {getDailyActivities.map((activity) => (
                                    <TouchableOpacity 
                                        key={activity.id}
                                        style={styles.actionItem}
                                        onPress={() => toggleActivityCompletion(activity.id)}
                                    >
                                        <View style={styles.actionIcon}>
                                            <Ionicons name={activity.icon} size={20} color="rgba(255, 255, 255, 0.8)" />
                                        </View>
                                        <Text style={styles.actionText}>
                                            {activity.text}
                                        </Text>
                                        <TouchableOpacity 
                                            style={[styles.checkbox, completedActivities[activity.id] && styles.checkboxCompleted]}
                                            onPress={() => toggleActivityCompletion(activity.id)}
                                        >
                                            {completedActivities[activity.id] && (
                                                <Ionicons name="checkmark" size={16} color="#ffffff" />
                                            )}
                                        </TouchableOpacity>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            </LinearGradient>
                        </Animated.View>
                    )}
                </View>
            </ScrollView>
        );
    };

    // 설정 탭 (대폭 개선)
    const renderSettingsTab = () => (
        <ScrollView 
            keyboardShouldPersistTaps="never" 
            style={styles.tabContent} 
            showsVerticalScrollIndicator={false} 
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} 
            onTouchStart={Keyboard.dismiss} 
            onScrollBeginDrag={Keyboard.dismiss}
            contentContainerStyle={{
                paddingTop: 60,
                paddingBottom: 120,
                paddingHorizontal: 20,
                alignItems: 'center'
            }}
        >
            <Text style={[styles.tabTitle, { fontSize: 30, fontWeight: 'bold', color: 'white', marginBottom: 30, textAlign: 'center' }]}>{translate('settings')}</Text>

            {/* 앱 설정 */}
            <Animated.View style={[{
                width: '90%',
                backgroundColor: 'transparent',
                borderRadius: 20,
                marginBottom: 20,
                overflow: 'hidden'
            }, { opacity: cardFadeAnim }]}>
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                    style={{
                        flex: 1,
                        borderWidth: 1.5,
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 20,
                        padding: 20
                    }}
                >
                <Text style={[styles.settingCategoryTitle, null]}>{translate('appSettings')}</Text>


                <View style={styles.settingRowVertical}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="language-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                        <Text style={[styles.settingTitle, null]}>{translate('language')}</Text>
                    </View>
                    <View style={styles.languageOptions}>
                        <TouchableOpacity
                            style={[
                                styles.languageOption,
                                language === 'ko' && styles.activeOption,
                                                            ]}
                            onPress={() => setLanguage('ko')}
                        >
                            {language === 'ko' && (
                                <Ionicons name="checkmark-circle" size={18} color="#7dd3fc" />
                            )}
                            <Text style={[
                                styles.languageText,
                                language === 'ko' && styles.activeText,
                                null
                            ]}>
                                한국어
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.languageOption,
                                language === 'en' && styles.activeOption,
                                                            ]}
                            onPress={() => setLanguage('en')}
                        >
                            {language === 'en' && (
                                <Ionicons name="checkmark-circle" size={18} color="#7dd3fc" />
                            )}
                            <Text style={[
                                styles.languageText,
                                language === 'en' && styles.activeText,
                                null
                            ]}>
                                English
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                </LinearGradient>
            </Animated.View>

            {/* 데이터 관리 */}
            <Animated.View style={[{
                width: '90%',
                backgroundColor: 'transparent',
                borderRadius: 20,
                marginBottom: 20,
                overflow: 'hidden'
            }, { opacity: cardFadeAnim }]}>
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                    style={{
                        flex: 1,
                        borderWidth: 1.5,
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 20,
                        padding: 20
                    }}
                >
                <Text style={[styles.settingCategoryTitle, null]}>{translate('dataManagement')}</Text>

                <TouchableOpacity 
                    style={styles.settingRowButton} 
                    onPress={exportSecureBackup}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="cloud-upload-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                        <View>
                            <Text style={[styles.settingTitle, null]}>{translate('dataBackup')}</Text>
                            <Text style={[styles.settingDesc, null]}>{translate('fileExport')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity
                    style={styles.settingRowButton}
                    onPress={async () => {
                        try {
                            const userData = await exportUserData();
                            
                            const dataStr = JSON.stringify(userData, null, 2);
                            const uri = FileSystem.documentDirectory + `my-emotion-data-${new Date().toISOString().slice(0,10)}.json`;
                            await FileSystem.writeAsStringAsync(uri, dataStr, { encoding: FileSystem.EncodingType.UTF8 });
                            
                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(uri, {
                                    mimeType: 'application/json',
                                    dialogTitle: '내 감정 데이터 내보내기',
                                });
                            }
                            showToastMessage(language === 'ko' ? '데이터 내보내기 완료' : 'Data export completed');
                        } catch (error) {
                            Alert.alert('오류', '데이터 내보내기 중 오류가 발생했습니다.');
                        }
                    }}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="download-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                        <View>
                            <Text style={[styles.settingTitle, null]}>{translate('exportMyData')}</Text>
                            <Text style={[styles.settingDesc, null]}>{translate('dataPortabilityDesc')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity
                    style={styles.settingRowButton}
                    onPress={() => {
                        Alert.alert(
                            '동의 철회',
                            '⚠️ 주의사항\n\n• OpenAI 데이터 전송 동의를 철회합니다\n• AI 감정 분석 기능을 사용할 수 없습니다\n• 기존 감정 기록은 유지됩니다\n• 언제든 다시 동의할 수 있습니다\n\n정말 철회하시겠습니까?',
                            [
                                { text: '취소', style: 'cancel' },
                                {
                                    text: '철회',
                                    style: 'destructive',
                                    onPress: async () => {
                                        try {
                                            await revokeConsent();
                                            
                                            // 동의 상태만 변경, 데이터는 유지
                                            setHasUserConsent(false);
                                            
                                            // 안내 메시지
                                            Alert.alert(
                                                '동의 철회 완료',
                                                '개인정보 처리 동의가 철회되었습니다.\n\n• 기존 감정 기록은 안전하게 보관됩니다\n• AI 기능 사용 시 다시 동의를 요청합니다\n• 설정에서 언제든 재동의할 수 있습니다',
                                                [{ text: '확인', style: 'default' }]
                                            );
                                            
                                            showToastMessage(language === 'ko' ? '동의가 철회되었습니다 (데이터는 보존됨)' : 'Consent revoked (data preserved)');
                                        } catch (error) {
                                            Alert.alert('오류', '동의 철회 중 오류가 발생했습니다.');
                                        }
                                    }
                                }
                            ]
                        );
                    }}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#FFA500" />
                        <View>
                            <Text style={[styles.settingTitle, null]}>{translate('privacyConsentManagement')}</Text>
                            <Text style={[styles.settingDesc, null]}>
                                {hasUserConsent ? translate('revokeConsent') : translate('reAgree')}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                {/* 동의하지 않은 상태에서 다시 동의하기 버튼 */}
                {!hasUserConsent && (
                    <>
                        <View style={styles.settingDivider} />
                        <TouchableOpacity
                            style={styles.settingRowButton}
                            onPress={() => {
                                setShowConsentScreen(true);
                            }}
                        >
                            <View style={styles.settingInfo}>
                                <Ionicons name="checkmark-circle-outline" size={20} color="#4ADE80" />
                                <View>
                                    <Text style={[styles.settingTitle, { color: '#4ADE80' }]}>개인정보 처리 재동의</Text>
                                    <Text style={[styles.settingDesc, null]}>AI 감정 분석 기능 사용하기</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#999" />
                        </TouchableOpacity>
                    </>
                )}

                <View style={styles.settingDivider} />

                <TouchableOpacity
                    style={styles.settingRowButton}
                    onPress={() => {
                        Alert.alert(
                            translate('deleteAllDataTitle'),
                            translate('deleteAllDataWarning'),
                            [
                                { text: translate('cancel'), style: 'cancel' },
                                {
                                    text: translate('deleteComplete'),
                                    style: 'destructive',
                                    onPress: resetAllData
                                }
                            ]
                        );
                    }}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <View>
                            <Text style={[styles.settingTitle, { color: '#EF4444' }]}>{translate('deleteAllData')}</Text>
                            <Text style={[styles.settingDesc, null]}>{translate('deleteAllDataDesc')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity 
                    style={styles.settingRowButton} 
                    onPress={async () => {
                        try {
                            if (!appLockEnabled) {
                                // 켜기 플로우
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
                                // 끄기 플로우
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
                    }}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="finger-print-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                        <View>
                            <Text style={[styles.settingTitle, null]}>{translate('appLock')}</Text>
                            <Text style={[styles.settingDesc, null]}>{appLockEnabled ? translate('appLockOn') : translate('appLockOff')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
                </LinearGradient>
            </Animated.View>

            {/* 도움 및 지원 */}
            <Animated.View style={[{
                width: '90%',
                backgroundColor: 'transparent',
                borderRadius: 20,
                marginBottom: 20,
                overflow: 'hidden'
            }, { opacity: cardFadeAnim }]}>
                <LinearGradient
                    colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.03)']}
                    style={{
                        flex: 1,
                        borderWidth: 1.5,
                        borderColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 20,
                        padding: 20
                    }}
                >
                <Text style={[styles.settingCategoryTitle, null]}>{translate('helpSupport')}</Text>


                <TouchableOpacity
                    style={styles.settingRowButton}
                    onPress={() => setShowCrisisModal(true)}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="heart-outline" size={20} color="#EF4444" />
                        <View>
                            <Text style={[styles.settingTitle, { color: '#EF4444' }]}>{translate('crisisSupport')}</Text>
                            <Text style={[styles.settingDesc, null]}>{translate('crisisHelpline')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.settingDivider} />


                <TouchableOpacity style={styles.settingRowButton} onPress={() => openSafeURL('mailto:jaewon3418@gmail.com', '메일 앱을 열 수 없어요. 직접 jaewon3418@gmail.com로 연락해주세요.')}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="mail-outline" size={20} color="rgba(255, 255, 255, 0.8)" />
                        <View>
                            <Text style={[styles.settingTitle, null]}>{translate('contactUs')}</Text>
                            <Text style={[styles.settingDesc, null]}>{translate('feedbackRequest')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
                </LinearGradient>
            </Animated.View>

            {/* 법적 정보 */}
            <Animated.View style={[styles.legalCard, { opacity: cardFadeAnim }]}>
                <Text style={[styles.legalText, null]}>{translate('crisisDisclaimer')}</Text>
                <View style={styles.legalLinks}>
                    <TouchableOpacity onPress={() => Alert.alert(
                        translate('privacyPolicyTitle'),
                        translate('privacyPolicyContent'),
                        [{ text: '확인', style: 'default' }]
                    )}>
                        <Text style={styles.linkText}>{translate('privacyPolicyTitle')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Alert.alert(
                        translate('termsTitle'),
                        translate('termsContent'),
                        [{ text: '확인', style: 'default' }]
                    )}>
                        <Text style={styles.linkText}>{translate('termsTitle')}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.deleteAccountButton}
                    onPress={() => Alert.alert(
                        '⚠️ 모든 데이터 삭제',
                        '동의 상태와 캐릭터 이름을 포함한 모든 데이터를 삭제하여 최초 실행 상태로 돌아갑니다.\n\n이 작업은 되돌릴 수 없습니다.',
                        [
                            { text: translate('cancel'), style: 'cancel' },
                            { 
                                text: '완전 삭제', 
                                style: 'destructive', 
                                onPress: resetAllData
                            }
                        ]
                    )}
                >
                    <Text style={styles.deleteAccountText}>{translate('deleteAccount')}</Text>
                </TouchableOpacity>

            </Animated.View>
        </ScrollView>
    );

    // 초기화 중일 때 로딩 화면
    if (isInitializing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <BackgroundWrapper
                    backgroundId={selectedBackground}
                    style={styles.background}
                >
                    <ActivityIndicator size="large" color="#667eea" />
                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', marginTop: 16, fontSize: 16 }}>
                        {language === 'ko' ? '로딩중...' : 'Loading...'}
                    </Text>
                </BackgroundWrapper>
            </View>
        );
    }

    // 동의 화면 (최우선)
    if (showConsentScreen) {
        return (
            <ConsentScreen
                onConsentGranted={async () => {
                    if (__DEV__) console.log('🔵 동의 완료 - 캐릭터 이름 확인 시작');
                    setShowConsentScreen(false);
                    setHasUserConsent(true);
                    
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
            <View style={styles.container}>
                    <StatusBar barStyle="light-content" hidden={true} />
                    <BackgroundWrapper
                        backgroundId={selectedBackground}
                        style={styles.background}
                    >
                    <View style={styles.lockScreen}>
                        <Ionicons name="lock-closed" size={80} color="rgba(255, 255, 255, 0.8)" />
                        <Text style={styles.lockTitle}>앱이 잠겨있습니다</Text>
                        <Text style={styles.lockDescription}>사용하려면 인증이 필요합니다</Text>
                        
                        <TouchableOpacity
                            style={styles.unlockButton}
                            onPress={async () => {
                                try {
                                    const result = await LocalAuthentication.authenticateAsync({
                                        promptMessage: '앱을 사용하려면 인증해주세요',
                                        cancelLabel: '취소',
                                        disableDeviceFallback: false,
                                    });
                                    
                                    if (result.success) {
                                        setIsAppLocked(false);
                                    }
                                } catch (error) {
                                    showToastMessage('인증에 실패했습니다', 'error');
                                }
                            }}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.gradientButton}
                            >
                                <Ionicons name="finger-print" size={24} color="#fff" />
                                <Text style={styles.unlockButtonText}>잠금 해제</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </BackgroundWrapper>
            </View>
        );
    }
    
    return (
        <View style={styles.container}>
                <StatusBar barStyle="light-content" hidden={true} />
                <BackgroundWrapper
                    backgroundId={selectedBackground}
                    style={styles.background}
                >
                {/* 별빛 효과 (밤에만 표시) */}
                {stars.length > 0 && (
                    <View style={styles.starsContainer} pointerEvents="none">
                        {stars.map((star) => (
                            <Animated.View
                                key={star.id}
                                style={[
                                    star.isSpecial ? styles.specialStar : styles.star,
                                    {
                                        left: `${star.x}%`,
                                        top: `${star.y}%`,
                                        width: star.size,
                                        height: star.size,
                                        opacity: star.opacity,
                                    },
                                ]}
                            />
                        ))}
                    </View>
                )}
                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
                        {currentTab === 'home' && renderHomeTab()}
                        {currentTab === 'history' && renderHistoryTab()}
                        {currentTab === 'insights' && renderInsightsTab()}
                        {currentTab === 'settings' && renderSettingsTab()}
                    </Animated.View>
                </KeyboardAvoidingView>

                {/* 개선된 탭 바 */}
                <View style={[styles.tabBar, ]}>
                    <LinearGradient
                        colors={['#334155', '#1e293b']}
                        style={styles.tabGradient}
                    >
                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => handleTabSwitch('home')}
                        >
                            <Ionicons
                                name={currentTab === 'home' ? 'home' : 'home-outline'}
                                size={24}
                                color={currentTab === 'home' ? '#667eea' : '#999'}
                            />
                            <Text style={[styles.tabText, currentTab === 'home' && { color: '#667eea' }]}>
                                {translate('tabHome')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => handleTabSwitch('history')}
                        >
                            <Ionicons
                                name={currentTab === 'history' ? 'book' : 'book-outline'}
                                size={24}
                                color={currentTab === 'history' ? '#667eea' : '#999'}
                            />
                            <Text style={[styles.tabText, currentTab === 'history' && { color: '#667eea' }]}>
                                {translate('tabHistory')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => handleTabSwitch('insights')}
                        >
                            <Ionicons
                                name={currentTab === 'insights' ? 'stats-chart' : 'stats-chart-outline'}
                                size={24}
                                color={currentTab === 'insights' ? '#667eea' : '#999'}
                            />
                            <Text style={[styles.tabText, currentTab === 'insights' && { color: '#667eea' }]}>
                                {translate('tabInsights')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.tabItem}
                            onPress={() => handleTabSwitch('settings')}
                        >
                            <Ionicons
                                name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
                                size={24}
                                color={currentTab === 'settings' ? '#667eea' : '#999'}
                            />
                            <Text style={[styles.tabText, currentTab === 'settings' && { color: '#667eea' }]}>
                                {translate('tabSettings')}
                            </Text>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>

                {/* 개선된 결과 시트 */}
                {showResultSheet && (
                    <Animated.View
                        {...panResponder.panHandlers}
                        style={[
                            styles.resultSheet,
                            { transform: [{ translateY: sheetAnim }] }
                        ]}>

                        <LinearGradient
                            colors={['#334155', '#1F2937']}
                            style={[styles.sheetGradient, styles.sheetOpaque]}
                        >
                            <View
                                style={[styles.sheetHandle, ]}
                            />
                            <View style={styles.sheetContent}>
                                <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    style={styles.sheetBadge}
                                >
                                    <Text style={styles.sheetBadgeText}>
                                        {language === 'ko' ? (currentResult?.emotion_ko || currentResult?.emotion) : (currentResult?.emotion_en || currentResult?.emotion)}
                                    </Text>
                                </LinearGradient>
                                <Text style={[styles.sheetMessage, null]}>
                                    {language === 'ko' ? (currentResult?.comfort_ko || currentResult?.comfort) : (currentResult?.comfort_en || currentResult?.comfort)}
                                </Text>

                                {currentResult?.intensity && (
                                    <View style={[styles.sheetIntensity, ]}>
                                        <Text style={styles.sheetIntensityTitle}>{translate('intensity')}</Text>
                                        <View style={styles.intensityDots}>
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <View key={i} style={[
                                                    styles.intensityDot,
                                                    i <= currentResult.intensity && styles.intensityDotActive
                                                ]} />
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <View style={[styles.sheetAction, ]}>
                                    <Text style={styles.sheetActionTitle}>💡 {language === 'ko' ? '추천 활동' : 'Recommended Activity'}</Text>
                                    <Text style={[styles.sheetActionText, null]}>
                                        {language === 'ko' ? (currentResult?.action_ko || currentResult?.action) : (currentResult?.action_en || currentResult?.action)}
                                    </Text>
                                </View>

                                <View style={styles.sheetButtons}>
                                    <TouchableOpacity style={styles.sheetButton} onPress={closeResultSheet}>
                                        <LinearGradient
                                            colors={['#667eea', '#764ba2']}
                                            style={styles.sheetButtonGradient}
                                        >
                                            <Text style={styles.sheetButtonText}>{translate('recordDone')}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* 개선된 위기 지원 모달 - 커스텀 오버레이 */}
                {showCrisisModal && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                        <View style={[styles.crisisOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                            <View style={[styles.crisisContent, { backgroundColor: 'rgba(30, 41, 59, 0.95)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }]}>
                            <LinearGradient
                                colors={['#FEF2F2', '#FECACA']}
                                style={styles.crisisHeader}
                            >
                                <Ionicons name="heart" size={32} color="#EF4444" />
                                <Text style={styles.crisisTitle}>{translate('crisisTitle')}</Text>
                            </LinearGradient>

                            <View style={styles.crisisBody}>
                                <Text style={[styles.crisisMessage, null]}>{translate('crisisMessage')}</Text>

                                <View style={styles.crisisHelplines}>
                                    <TouchableOpacity
                                        style={styles.crisisButton}
                                        onPress={() => {
                                            const helplines = language === 'en' ? HELPLINES['en-US'] : HELPLINES['ko-KR'];
                                            openSafeURL(`tel:${helplines.suicide}`, '전화 앱을 열 수 없어요');
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
                                            openSafeURL(`tel:${helplines.youth}`, '전화 앱을 열 수 없어요');
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
                                            '⚠️ 본 앱은 의료 조언을 제공하지 않습니다. 전문의와 상담하세요.' :
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

                {/* 캐릭터 이름 변경 모달 - 커스텀 오버레이 */}
                {showNameModal && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                        <View style={styles.modalOverlay}>
                            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                                <View style={styles.nameModalContent}>
                                <View style={styles.nameModalHeader}>
                                    <Ionicons name="heart" size={24} color="#FF6B9D" />
                                    <Text style={styles.nameModalTitle}>{translate('changeCharacterName')}</Text>
                                </View>
                                
                                <View style={styles.nameModalBody}>
                                    <Text style={styles.nameModalSubtitle}>
                                        캐릭터 이름 기능이 제거되었습니다
                                    </Text>
                                    <Text style={styles.nameModalSubtitle}>
                                        {translate('newNamePrompt')}
                                    </Text>
                                    
                                    <TextInput
                                        style={styles.nameModalInput}
                                        value={tempCharacterName}
                                        onChangeText={setTempCharacterName}
                                        placeholder="새로운 이름 입력"
                                        placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                        maxLength={8}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={handleCharacterNameChange}
                                    />
                                    
                                    <Text style={styles.nameModalRule}>
                                        한글, 영문, 숫자만 사용 가능
                                    </Text>
                                </View>
                                
                                <View style={styles.nameModalButtons}>
                                    <TouchableOpacity
                                        style={[styles.nameModalButton, styles.cancelButton]}
                                        onPress={() => setShowNameModal(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>취소</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity
                                        style={[styles.nameModalButton, styles.confirmButton]}
                                        onPress={handleCharacterNameChange}
                                    >
                                        <Text style={styles.confirmButtonText}>변경</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            </KeyboardAvoidingView>
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
                                        백업 파일을 보호할 비밀번호를 입력하세요
                                    </Text>
                                    <Text style={styles.passwordModalWarning}>
                                        ⚠️ 비밀번호를 분실하면 데이터를 복구할 수 없습니다
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

                {/* 개선된 익명 위로 모달 - 커스텀 오버레이 */}
                {showAnonymousModal && (
                  <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                      <View style={styles.modalOverlay}>
                        <Image 
                          source={require('../assets/moonlight-ocean-bg.png')}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
                        />
                        <View style={styles.modalContent}>
                      {/* ⬇️ 기존 styles.modalHeader 대신 inline 헤더 사용 */}
                      <View style={[styles.modalHeaderInline, {marginBottom: 20}]}>
                        <View style={{ width: 24 }} />{/* 좌측 더미(가운데 정렬 보정) */}
                        <Text style={[styles.modalTitle, styles.centeredModalTitle]}>
                          {translate('anonymousComfort')}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            try {
                              setShowAnonymousModal(false);
                              setAnonymousText('');
                              setAnonymousResult(null);
                            } catch (error) {
                              if (__DEV__) console.log('Close modal error:', error);
                            }
                          }}
                        >
                          <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={[styles.anonymousInput, null]}
                        multiline
                        placeholder={translate('emotionPlaceholder')}
                        placeholderTextColor="#999"
                        value={anonymousText}
                        onChangeText={setAnonymousText}
                        maxLength={100}
                      />

                      {/* ⬇️ 글자 수를 '입력창-버튼' 사이 중앙 느낌으로 배치 */}
                      <View style={styles.charCountContainer}>
                        <Text style={[styles.charCount, styles.charCountAnonymous]}>
                          {anonymousText.length}/100
                        </Text>
                      </View>

                      {anonymousResult && (
                        <View style={[styles.anonymousResult, null]}>
                          <LinearGradient
                            colors={['#475569', '#3f4f63']}
                            style={styles.anonymousResultGradient}
                          >
                            <CollapsibleText
                                text={language === 'ko' ? (anonymousResult.comfort_ko || anonymousResult.comfort) : (anonymousResult.comfort_en || anonymousResult.comfort)}
                                textStyle={styles.anonymousResultText}
                                language={language}
                                maxLines={3}
                            />
                            <CollapsibleText
                                text={language === 'ko' ? (anonymousResult.action_ko || anonymousResult.action) : (anonymousResult.action_en || anonymousResult.action)}
                                textStyle={styles.anonymousResultAction}
                                language={language}
                                maxLines={2}
                            />
                          </LinearGradient>
                          
                        </View>
                      )}

                      <Pressable
                        disabled={(!anonymousText.trim() || isSubmitting) && !anonymousResult}
                        onPress={async () => {
                          if (!anonymousResult && (!anonymousText.trim() || isSubmitting)) return;
                          // 버튼 누르면 즉시 키보드 내리기
                          Keyboard.dismiss();

                          // 결과가 있으면 초기화, 없으면 분석 진행
                          if (anonymousResult) {
                            setAnonymousText('');
                            setAnonymousResult(null);
                            return;
                          }

                          // 입력 길이 체크 (20자 이하면 확인 모달)
                          if (anonymousText.trim().length > 0 && anonymousText.trim().length <= 20) {
                            setShowShortInputConfirm(true);
                            return;
                          }
                          
                          await performAnonymousAnalysis();
                        }}
                      >
                        <LinearGradient
                          colors={(!anonymousText.trim() || isSubmitting) && !anonymousResult 
                            ? ['#6B7280', '#9CA3AF'] 
                            : ['#667eea', '#764ba2']}
                          style={[
                            styles.gradientButton,
                            styles.modalSubmitButton
                          ]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={styles.modalButtonText}>
                              {anonymousResult ? (language === 'ko' ? '다른 위로받기' : 'Get Another Comfort') : translate('getComfort')}
                            </Text>
                          )}
                        </LinearGradient>
                      </Pressable>
                    </View>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                )}

                {/* 휴지통 모달 (개선됨) */}
                {showTrash && (
                  <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
                    <TouchableOpacity
                      onPress={() => setShowTrash(false)}
                      style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}
                    >
                      <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                      <View style={[styles.modalOverlay, { paddingHorizontal: 20 }]}>
                        <Image 
                          source={require('../assets/night-forest-bg.png')}
                          style={StyleSheet.absoluteFillObject}
                          resizeMode="cover"
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
                                            <Ionicons name="refresh" size={16} color="#667eea" />
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
                            
                            <Text style={styles.deleteDescription}>삭제된 기록은 휴지통에서 복원할 수 있습니다.</Text>
                            
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

                {/* 익명 위로받기 중복 확인 모달 */}
                <Modal visible={showAnonymousConfirm} transparent animationType="fade" statusBarTranslucent={true}>
                    <View style={styles.deleteOverlay}>
                        <View style={styles.deleteModal}>
                            <View style={styles.deleteHeader}>
                                <Ionicons name="refresh-outline" size={28} color="#667eea" />
                                <Text style={styles.deleteTitle}>{translate('getComfort')}</Text>
                            </View>
                            
                            <Text style={styles.deleteDescription}>같은 내용으로 다시 위로를 받으시겠어요? 일일 횟수가 차감됩니다.</Text>
                            
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
                                <Ionicons name="create-outline" size={28} color="#667eea" />
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
                                <Ionicons name="create-outline" size={28} color="#667eea" />
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
                                    <Text style={styles.confirmDeleteButtonText}>{translate('getComfortNow')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* 배경 선택 모달 */}
                <BackgroundSelector
                    visible={showBackgroundSelector}
                    onClose={() => setShowBackgroundSelector(false)}
                    onSelect={(backgroundId) => {
                        setSelectedBackground(backgroundId);
                        setShowBackgroundSelector(false);
                    }}
                    currentBackground={selectedBackground}
                    language={language}
                />

                {/* 토스트 메시지 */}
                <ToastMessage />
            </BackgroundWrapper>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    },
    content: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
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
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
        shadowColor: '#667eea',
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
                shadowColor: '#667eea',
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
        padding: 20,
    },
    chartHeader: {
        marginBottom: 12,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
        textAlign: 'center',
    },
    chartSubtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        textAlign: 'center',
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

    // 개선된 캐릭터
    characterCardShadow: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        ...Platform.select({
            android: {
                elevation: 10,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.15,
                shadowRadius: 24,
            },
        }),
    },
    characterCard: {
        backgroundColor: '#475569',
        borderRadius: 24,
        paddingHorizontal: 12,
        paddingVertical: 20,   // 24 → 20으로 줄여서 전체 카드 높이 소폭 단축
        overflow: 'hidden',
    },
    characterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,   // 20 → 12로 줄여서 캐릭터와 이름 사이 간격 단축
        marginTop: 16,
        height: 320, // 고정 높이로 캐릭터 크기에 관계없이 일정한 공간 확보
    },
    characterWrapper: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    characterBody: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    characterEyes: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 8,
    },
    characterEye: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#000',
    },
    sadEye: {
        transform: [{ rotate: '25deg' }],
    },
    bigSmile: {
        width: 28,
        height: 14,
        borderBottomWidth: 3,
        borderBottomColor: '#000',
        borderRadius: 20,
        marginTop: 4,
    },
    smile: {
        width: 20,
        height: 10,
        borderBottomWidth: 2,
        borderBottomColor: '#000',
        borderRadius: 15,
        marginTop: 4,
    },
    neutral: {
        width: 12,
        height: 2,
        backgroundColor: '#000',
        marginTop: 6,
    },
    frown: {
        width: 20,
        height: 10,
        borderTopWidth: 2,
        borderTopColor: '#000',
        borderRadius: 15,
        marginTop: 6,
    },
    cheek: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#FFB6C1',
        top: 30,
    },
    leftCheek: {
        left: 15,
    },
    rightCheek: {
        right: 15,
    },
    levelBadge: {
        position: 'absolute',
        top: -5,
        right: 30,
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 6,
    },
    sweatDrop: {
        position: 'absolute',
        top: 5,
        left: 15,
        fontSize: 20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    levelText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    characterStatus: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 24,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 22,
        width: '100%',
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
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
        borderColor: 'rgba(255, 255, 255, 0.08)',
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
        paddingTop: 72,  // 80 → 72 (10% 감소)
        paddingBottom: 10,
        alignItems: 'center',
    },
    newHomeGreeting: {
        fontSize: 36,  // 32 → 36 (더 크게)
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 8,
    },
    newHomeSubtitle: {
        fontSize: 18,
        fontWeight: '400',
        color: 'rgba(255,255,255,0.8)',  // 투명도 조정
        textAlign: 'center',
        lineHeight: 25, // 140% 행간
        letterSpacing: 0.3,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
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
        fontSize: 32,
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
    // 점선 말풍선 스타일
    dottedBubble: {
        backgroundColor: 'transparent',
        borderRadius: 999,
        padding: 16,
        marginBottom: 16,
        maxWidth: '85%',
        alignSelf: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.6)',
        borderStyle: 'dashed',
    },
    dottedBubbleText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        fontWeight: '400',
    },
    
    // ScrollView의 contentContainerStyle용 중앙 정렬
    centeredScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: 100, // 하단 여백으로 스크롤 가능하게
    },
    
    // 중앙 정렬된 메인 컨텐츠 컨테이너
    centeredMainContent: {
        paddingHorizontal: 20,
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
    // 새로운 레이아웃 스타일들
    newInputSection: {
        marginVertical: 16, // 8pt grid
        width: '100%', // 전체 넓이 사용
    },
    newInputCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24, // Card radius
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        padding: 20,
        width: '100%',
        alignSelf: 'stretch',
        flexShrink: 0,
        marginHorizontal: 16, // 좌우 여백으로 크기 조절
    },
    // 새로운 입력 컨테이너 스타일
    inputContainer: {
        width: 240, // 더 작은 고정 너비
        alignSelf: 'center',
    },
    inputBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        padding: 8,
        width: '100%', // 컨테이너 너비에 맞춤
    },
    inputCounterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16, // 여백 증가
        paddingHorizontal: 8,
    },
    emotionInputSimple: {
  textAlignVertical: 'top',
        color: '#ffffff',
        fontSize: 16,
        lineHeight: 22,
        paddingVertical: 5,
        paddingHorizontal: 10,
        width: '100%',
        alignSelf: 'stretch',
    },
    mainCTASection: {
        marginVertical: 24, // 8pt grid
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    mainCTAButton: {
        width: '100%',
        maxWidth: 327,
    },
    mainCTAGradient: {
        borderRadius: 20, // Button radius
        paddingVertical: 16,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        // 최고 고도감
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 12,
    },
    mainCTAText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    mainCTAHelper: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        marginTop: 12,
        textAlign: 'center',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
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
        marginVertical: 20,
        alignItems: 'center',
        width: '100%',
    },
    newTrendCard: {
        padding: 20,
        borderRadius: 20,
        marginHorizontal: 0,
        width: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
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
        borderColor: Platform.OS === 'android' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: Platform.OS === 'android' ? 0.02 : 0.05,
        shadowRadius: Platform.OS === 'android' ? 2 : 4,
        elevation: Platform.OS === 'android' ? 1 : 2,
    },
    quickEmotionButtonSelected: {
        backgroundColor: '#3f4f63',
        borderColor: '#7dd3fc',
        shadowColor: '#667eea',
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
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'right',
        fontWeight: '500',
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
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: Platform.OS === 'android' ? 0.2 : 0.35,
        shadowRadius: Platform.OS === 'android' ? 6 : 12,
        elevation: Platform.OS === 'android' ? 8 : 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
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
        borderColor: 'rgba(102, 126, 234, 0.2)',
        ...Platform.select({
            android: {
                elevation: 12,
                backgroundColor: 'transparent',
            },
            ios: {
                shadowColor: '#667eea',
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
        fontSize: 32,
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
        shadowColor: '#667eea',
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
                shadowColor: '#667eea',
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
        borderTopColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        gap: 6,
    },
    insightSummaryText: {
        fontSize: 22,
        color: 'rgba(255, 255, 255, 0.95)',
        marginBottom: 8,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.2,
        lineHeight: 28,
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
        backgroundColor: '#2d3748',
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
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    activeOption: {
        backgroundColor: 'transparent',
        borderColor: '#7dd3fc',
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
        color: '#7dd3fc',
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
        borderColor: 'rgba(255, 255, 255, 0.15)',
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
        color: '#EF4444',
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
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 4,
        fontWeight: '600',
        letterSpacing: -0.1,
    },

    // 결과 시트 (대폭 개선)
    resultSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.25,
        shadowRadius: 24,
        elevation: 30,
        overflow: 'hidden',
        backgroundColor: '#1F2937',
    },
    darkSheet: {
        shadowColor: '#fff',
        shadowOpacity: 0.1,
    },
    sheetGradient: {
        flex: 1,
    },
    sheetOpaque: {
        backgroundColor: '#1F2937',
    },
    sheetHandle: {
        width: 48,
        height: 4,
        backgroundColor: '#ddd',
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
        borderRadius: 24,
        alignSelf: 'flex-start',
        marginBottom: 24,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    sheetBadgeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        paddingHorizontal: 24,
        paddingVertical: 12,
        letterSpacing: -0.2,
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
        backgroundColor: '#363d5a',
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
        color: '#7dd3fc',
    },

    sheetAction: {
        backgroundColor: '#363d5a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    darkSheetAction: {
        backgroundColor: '#3f4666',
    },
    sheetActionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#7dd3fc',
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
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
    },
    sheetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
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

    // 삭제 확인 모달
    deleteOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    deleteModal: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 24,
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 0,
    },
    deleteHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    deleteTitle: {
        color: '#000000',
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 8,
    },
    deleteDescription: {
        color: 'rgba(0, 0, 0, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 20,
    },
    deleteActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
    },
    cancelButton: {
        flex: 1,
        marginRight: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    cancelButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
    confirmDeleteButton: {
        flex: 1,
        marginLeft: 8,
        backgroundColor: '#667eea',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#8b9cf0',
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
        backgroundColor: '#1e293b',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        minHeight: 120,
        fontSize: 16,
        textAlignVertical: 'top',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        backdropFilter: 'blur(20px)',
        color: '#fff', // 입력 텍스트 흰색
    },
    anonymousResult: {
        marginBottom: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
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
    },
    lockTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 20,
        marginBottom: 8,
    },
    lockDescription: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 40,
    },
    unlockButton: {
        marginTop: 20,
        borderRadius: 25,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    unlockButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginLeft: 10,
        textAlign: 'center',
        letterSpacing: -0.3,
    },

    // === 새로 추가 ===
    modalHeaderInline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        // 배경/경계선 제거 → 박스·하얀 하단선 사라짐
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
    
    // 이름 변경 모달 스타일
    nameModalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        margin: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 0,
    },
    nameModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    nameModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
    },
    nameModalBody: {
        padding: 20,
        gap: 12,
    },
    nameModalSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 20,
    },
    nameModalInput: {
        backgroundColor: '#475569',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 107, 157, 0.3)',
        marginTop: 8,
    },
    nameModalRule: {
        fontSize: 12,
        color: 'rgba(125, 211, 252, 0.8)',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    nameModalButtons: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        paddingTop: 12,
    },
    nameModalButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },
    confirmButton: {
        backgroundColor: '#FF6B9D',
    },
    confirmButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
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
        borderColor: 'rgba(102, 126, 234, 0.3)',
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
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
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
});