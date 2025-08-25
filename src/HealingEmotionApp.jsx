import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

// 상수
const TRASH_TTL_DAYS = 30;
const CRISIS_PATTERNS = [
    /죽고\s*싶|자살|극단적\s*선택|생을\s*마감|죽어버리고|사라지고\s*싶/i,
    /suicide|kill\s*myself|end\s*my\s*life|self[-\s]?harm|want\s*to\s*die/i
];

// 개선된 오늘의 명언 (맥락별)
const getContextualQuote = (streak, recentEmotions, weather = 'clear') => {
    if (streak >= 7) return "7일 연속 기록 중! 꾸준함이 만드는 변화를 느껴보세요 🌱";
    if (streak >= 3) return "연속 기록 중! 마음을 돌보는 습관이 자리잡고 있어요 ✨";
    if (recentEmotions?.includes('불안해')) return "불안한 마음도 괜찮아요. 지금 이 순간에 집중해보세요 🌿";
    if (recentEmotions?.includes('슬퍼')) return "슬픔도 소중한 감정이에요. 충분히 느끼고 받아들여주세요 💙";

    const quotes = [
        "오늘도 당신의 마음을 돌보는 하루가 되길 바라요 🌸",
        "작은 감정도 소중하게 기록해보세요 ✨",
        "마음이 힘들 땐 잠시 멈춰 숨을 고르세요 🌿",
        "당신의 감정은 모두 의미가 있어요 💙"
    ];
    return quotes[new Date().getDate() % quotes.length];
};

export default function App() {
    // 상태 관리
    const [currentTab, setCurrentTab] = useState('home');
    const [characterName, setCharacterName] = useState('다니엘');
    const [characterLevel, setCharacterLevel] = useState(1);
    const [characterExp, setCharacterExp] = useState(0);
    const [characterHappiness, setCharacterHappiness] = useState(50);
    const [emotionText, setEmotionText] = useState('');
    const [emotionHistory, setEmotionHistory] = useState([]);
    const [language, setLanguage] = useState('ko');
    const [showAnonymousModal, setShowAnonymousModal] = useState(false);
    const [anonymousText, setAnonymousText] = useState('');
    const [anonymousResult, setAnonymousResult] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showResultSheet, setShowResultSheet] = useState(false);
    const [currentResult, setCurrentResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showTrash, setShowTrash] = useState(false);
    const [showCrisisModal, setShowCrisisModal] = useState(false);
    const [streak, setStreak] = useState(0);
    const [selectedFilter, setSelectedFilter] = useState('전체');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });

    // 애니메이션
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const expAnim = useRef(new Animated.Value(0)).current;
    const happinessAnim = useRef(new Animated.Value(50)).current;
    const sheetAnim = useRef(new Animated.Value(height)).current;
    const cardFadeAnim = useRef(new Animated.Value(0)).current;
    const toastAnim = useRef(new Animated.Value(-100)).current;

    // 디바운스 저장
    const saveTimeoutRef = useRef(null);

    // 맥락적 명언
    const todayQuote = getContextualQuote(
        streak,
        emotionHistory.slice(0, 3).map(e => e.emotion)
    );

    // 통일된 톤앤매너
    const translations = {
        ko: {
            appTitle: '속마음 노트',
            greeting: '안녕하세요!\n오늘도 마음을 따뜻하게 돌보는 시간을 가져보세요',
            todayQuote: '오늘의 응원',
            recentTrend: '최근 7일 감정 변화',
            emotionPrompt: '지금 어떤 기분이세요?',
            emotionPlaceholder: '지금 느끼는 감정을 자유롭게 표현해보세요...',
            submitEmotion: '마음 나누기',
            submitPending: '당신의 마음을 이해하는 중...',
            anonymousComfort: '익명으로 위로받기',
            anonymousDesc: '기록 없이 지금 바로 위로받기',
            quickEmotions: [
                { emoji: '😊', text: '기분이 좋아' },
                { emoji: '😌', text: '평온해' },
                { emoji: '😢', text: '슬퍼' },
                { emoji: '😰', text: '불안해' },
                { emoji: '😔', text: '외로워' },
                { emoji: '😫', text: '피곤해' },
            ],
            emptyHistory: '아직 기록이 없어요',
            emptyHistoryCTA: '첫 기록 남기기',
            emptyComfortCTA: '익명 위로받기',
            home: '홈',
            history: '기록',
            insights: '인사이트',
            settings: '설정',
            searchPlaceholder: '기록 검색하기',
            trash: '휴지통',
            restore: '복원',
            deleteForever: '영구 삭제',
            crisisTitle: '당신의 안전이 가장 소중해요',
            crisisMessage: '힘든 시간을 보내고 계시는군요. 혼자가 아니에요.',
            crisisContact: '지금 도움받기',
            crisisDisclaimer: '이 앱은 전문 의료 서비스가 아닙니다',
            confirm: '확인',
            cancel: '취소',
            streakMessage: '{{days}}일 연속 기록 중 🔥',
            motivationStart: '매일 기록하는 습관을 만들어보세요',
            motivationDesc: '꾸준한 기록으로 마음의 변화를 더 잘 이해할 수 있어요',
            darkMode: '다크 모드',
            dataBackup: '데이터 백업',
            appLock: '앱 잠금',
            contactUs: '문의하기',
            deleteAccount: '계정 삭제',
            crisisHelpline: '위기지원 전화: 1393 (24시간)',
            shareWeeklyReport: '주간 리포트 공유하기',
            savedToClipboard: '클립보드에 저장되었어요',
            networkError: '연결이 불안정해요. 기록은 기기에 저장했고, 연결되면 자동 전송할게요.',
            recordSaved: '기록이 저장되었어요',
            recordDeleted: '기록이 삭제되었어요',
            recordRestored: '기록이 복원되었어요',
        },
        en: {
            appTitle: 'Inner Voice',
            greeting: 'Hello!\nTake time to care for your heart today',
            todayQuote: 'Today\'s Encouragement',
            recentTrend: 'Last 7 Days Emotion Changes',
            emotionPrompt: 'How are you feeling?',
            emotionPlaceholder: 'Express your emotions freely...',
            submitEmotion: 'Share Your Heart',
            submitPending: 'Understanding your heart...',
            anonymousComfort: 'Get Anonymous Comfort',
            anonymousDesc: 'Get comfort right now without saving',
            quickEmotions: [
                { emoji: '😊', text: 'Happy' },
                { emoji: '😌', text: 'Peaceful' },
                { emoji: '😢', text: 'Sad' },
                { emoji: '😰', text: 'Anxious' },
                { emoji: '😔', text: 'Lonely' },
                { emoji: '😫', text: 'Tired' },
            ],
            // ... 나머지 번역들
        },
    };

    const t = (key, params = {}) => {
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
            value = value?.[k];
        }
        if (typeof value === 'string') {
            return value.replace(/\{\{(\w+)\}\}/g, (match, param) => params[param] || match);
        }
        return value || key;
    };

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
        ]).start(() => {
            setShowToast({ show: false, message: '', type: 'success' });
        });
    }, []);

    // 초기화
    useEffect(() => {
        loadData();
        startAnimations();
        purgeTrash();
        checkStreak();
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

    // 데이터 로드/저장
    const loadData = async () => {
        try {
            const keys = ['emotionHistory', 'characterLevel', 'characterExp', 'characterHappiness', 'streak', 'lastRecordDate', 'isDarkMode'];
            const values = await AsyncStorage.multiGet(keys);
            const data = Object.fromEntries(values);

            if (data.emotionHistory) setEmotionHistory(JSON.parse(data.emotionHistory));
            if (data.characterLevel) setCharacterLevel(parseInt(data.characterLevel));
            if (data.characterExp) setCharacterExp(parseInt(data.characterExp));
            if (data.characterHappiness) setCharacterHappiness(parseInt(data.characterHappiness));
            if (data.streak) setStreak(parseInt(data.streak));
            if (data.isDarkMode) setIsDarkMode(data.isDarkMode === 'true');
        } catch (error) {
            console.log('Load error:', error);
        }
    };

    const saveData = useCallback(() => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                const data = [
                    ['emotionHistory', JSON.stringify(emotionHistory)],
                    ['characterLevel', characterLevel.toString()],
                    ['characterExp', characterExp.toString()],
                    ['characterHappiness', characterHappiness.toString()],
                    ['streak', streak.toString()],
                    ['isDarkMode', isDarkMode.toString()],
                ];
                await AsyncStorage.multiSet(data);
            } catch (error) {
                console.log('Save error:', error);
            }
        }, 300);
    }, [emotionHistory, characterLevel, characterExp, characterHappiness, streak, isDarkMode]);

    useEffect(() => {
        saveData();
    }, [saveData]);

    // 휴지통 관리
    const purgeTrash = useCallback(() => {
        const now = Date.now();
        setEmotionHistory(prev => prev.filter(e => {
            if (!e.deletedAt) return true;
            const ageDays = (now - new Date(e.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
            return ageDays < TRASH_TTL_DAYS;
        }));
    }, []);

    const softDeleteEntry = useCallback((id) => {
        setEmotionHistory(prev =>
            prev.map(e => e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e)
        );
        showToastMessage(t('recordDeleted'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [showToastMessage, t]);

    const restoreEntry = useCallback((id) => {
        setEmotionHistory(prev =>
            prev.map(e => e.id === id ? { ...e, deletedAt: null } : e)
        );
        showToastMessage(t('recordRestored'));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [showToastMessage, t]);

    const deleteForever = useCallback((id) => {
        Alert.alert(
            t('deleteForever'),
            '이 작업은 되돌릴 수 없어요.',
            [
                { text: t('cancel'), style: 'cancel' },
                {
                    text: t('confirm'),
                    style: 'destructive',
                    onPress: () => {
                        setEmotionHistory(prev => prev.filter(e => e.id !== id));
                        showToastMessage('영구 삭제되었어요');
                    }
                }
            ]
        );
    }, [t, showToastMessage]);

    // 검색 필터링
    const normalize = (s = '') =>
        s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

    const getFilteredHistory = useCallback(() => {
        const q = normalize(searchQuery);

        return emotionHistory
            .filter(e => !e.deletedAt)
            .filter(e => {
                if (selectedFilter !== '전체' && e.emotion !== selectedFilter) return false;
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
            const emotions = t('quickEmotions');
            const emotionIndex = emotions.findIndex(e => e.text === entry.emotion);
            return {
                day: date.toLocaleDateString('ko', { month: 'short', day: 'numeric' }),
                value: Math.max(1, emotionIndex + 1),
                emotion: entry.emotion,
                color: emotionIndex >= 0 && emotionIndex <= 2 ? '#4ADE80' : emotionIndex <= 4 ? '#FBBF24' : '#EF4444'
            };
        });
    }, [emotionHistory, t]);

    // 스트릭 체크
    const checkStreak = useCallback(async () => {
        try {
            const lastDate = await AsyncStorage.getItem('lastRecordDate');
            if (!lastDate) return;

            const last = new Date(lastDate);
            const today = new Date();
            const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                setStreak(prev => prev + 1);
            } else if (diffDays > 1) {
                setStreak(0);
            }
        } catch (error) {
            console.log('Streak check error:', error);
        }
    }, []);

    // 위기 감지 (개선됨)
    const isCrisis = useCallback((text) => {
        return CRISIS_PATTERNS.some(pattern => pattern.test(text));
    }, []);

    // 개선된 감정 분석
    const analyzeEmotion = useCallback((text) => {
        const emotions = t('quickEmotions').map(e => e.text);

        // 간단한 키워드 기반 분석 (향후 AI로 대체 예정)
        let detectedEmotion = emotions[0]; // 기본값
        let intensity = 3; // 1-5 스케일

        if (text.includes('기쁘') || text.includes('행복') || text.includes('좋') || text.includes('즐거')) {
            detectedEmotion = '기분이 좋아';
            intensity = 4;
        } else if (text.includes('평온') || text.includes('차분') || text.includes('안정')) {
            detectedEmotion = '평온해';
            intensity = 3;
        } else if (text.includes('슬프') || text.includes('우울') || text.includes('눈물')) {
            detectedEmotion = '슬퍼';
            intensity = 4;
        } else if (text.includes('불안') || text.includes('걱정') || text.includes('두려')) {
            detectedEmotion = '불안해';
            intensity = 4;
        } else if (text.includes('외로') || text.includes('혼자') || text.includes('쓸쓸')) {
            detectedEmotion = '외로워';
            intensity = 3;
        } else if (text.includes('피곤') || text.includes('지쳐') || text.includes('힘들')) {
            detectedEmotion = '피곤해';
            intensity = 4;
        }

        const comfortMessages = {
            '기분이 좋아': '정말 기쁜 일이에요! 이런 순간들을 소중히 간직해보세요.',
            '평온해': '마음이 평온하다니 정말 좋아요. 이 고요함을 느껴보세요.',
            '슬퍼': '슬픈 마음을 온전히 느껴도 괜찮아요. 당신의 감정을 인정해주세요.',
            '불안해': '불안한 마음이 드는군요. 깊게 숨을 쉬며 지금 이 순간에 집중해보세요.',
            '외로워': '혼자라고 느껴져도 괜찮아요. 당신을 생각하는 사람들이 있어요.',
            '피곤해': '많이 지치셨군요. 충분한 휴식을 취하며 자신을 돌보세요.',
        };

        const actions = {
            '기분이 좋아': '이 기쁜 감정을 일기에 적거나 소중한 사람과 나누어보세요',
            '평온해': '이 평온함을 유지하기 위해 명상이나 산책을 해보세요',
            '슬퍼': '슬픈 감정을 표현할 수 있는 활동(그림, 음악 듣기)을 해보세요',
            '불안해': '5분간 깊은 호흡을 하거나 안전한 장소에서 휴식을 취해보세요',
            '외로워': '가까운 사람에게 연락하거나 따뜻한 차 한 잔을 마셔보세요',
            '피곤해': '충분한 수면과 영양 섭취로 몸과 마음을 회복시켜보세요',
        };

        return {
            emotion: detectedEmotion,
            intensity,
            comfort: comfortMessages[detectedEmotion] || '당신의 마음을 이해해요.',
            action: actions[detectedEmotion] || '잠시 휴식을 취하며 마음을 돌보세요',
        };
    }, [t]);

    // 감정 제출 (개선됨)
    const submitEmotion = useCallback(async () => {
        if (isSubmitting || !emotionText.trim()) return;

        // 위기 감지
        if (isCrisis(emotionText)) {
            setShowCrisisModal(true);
            return;
        }

        setIsSubmitting(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        try {
            // 시뮬레이션 딜레이 (향후 실제 AI API로 대체)
            await new Promise(resolve => setTimeout(resolve, 1500));

            const analysis = analyzeEmotion(emotionText);
            const newEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                text: emotionText,
                ...analysis,
                deletedAt: null,
            };

            setEmotionHistory(prev => [newEntry, ...prev]);
            setCurrentResult(analysis);

            // 캐릭터 성장 시스템
            const expGain = 10 + (analysis.intensity || 1) * 2;
            const newExp = characterExp + expGain;

            if (newExp >= 100) {
                setCharacterLevel(prev => prev + 1);
                setCharacterExp(newExp - 100);
                Animated.timing(expAnim, {
                    toValue: newExp - 100,
                    duration: 500,
                    useNativeDriver: false,
                }).start();

                Alert.alert('레벨 업! 🎉', `${characterName}이 레벨 ${characterLevel + 1}이 되었어요!`);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
                setCharacterExp(newExp);
                Animated.timing(expAnim, {
                    toValue: newExp,
                    duration: 500,
                    useNativeDriver: false,
                }).start();
            }

            // 친밀도 시스템 (논리적 근거 추가)
            let happinessChange = 0;
            if (analysis.emotion === '기분이 좋아') happinessChange = 8;
            else if (analysis.emotion === '평온해') happinessChange = 5;
            else if (analysis.emotion === '슬퍼') happinessChange = -2;
            else if (analysis.emotion === '불안해') happinessChange = -3;
            else if (analysis.emotion === '외로워') happinessChange = -1;
            else happinessChange = 2; // 기록 자체만으로도 약간의 긍정 효과

            const newHappiness = Math.max(0, Math.min(100, characterHappiness + happinessChange));
            setCharacterHappiness(newHappiness);

            Animated.timing(happinessAnim, {
                toValue: newHappiness,
                duration: 500,
                useNativeDriver: false,
            }).start();

            // 스트릭 업데이트
            await AsyncStorage.setItem('lastRecordDate', new Date().toISOString());

            // 오늘 첫 기록이면 스트릭 증가
            const today = new Date().toDateString();
            const lastRecord = emotionHistory.find(e => !e.deletedAt);
            if (!lastRecord || new Date(lastRecord.date).toDateString() !== today) {
                setStreak(prev => prev + 1);
            }

            setEmotionText('');
            showToastMessage(t('recordSaved'));

            // 결과 시트 표시
            setShowResultSheet(true);
            Animated.spring(sheetAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }).start();

        } catch (error) {
            showToastMessage(t('networkError'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    }, [emotionText, isSubmitting, isCrisis, analyzeEmotion, characterExp, characterLevel, characterName, characterHappiness, emotionHistory, showToastMessage, t]);

    // 결과 시트 닫기
    const closeResultSheet = useCallback(() => {
        Animated.timing(sheetAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowResultSheet(false);
            setCurrentResult(null);
        });
    }, []);

    // 주간 리포트 공유 (실제 구현)
    const shareWeeklyReport = useCallback(async () => {
        const weeklyData = emotionHistory
            .filter(e => !e.deletedAt)
            .slice(0, 7);

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
😊 가장 많았던 감정: ${mostFrequent?.[0]} (${mostFrequent?.[1]}회)
🔥 연속 기록: ${streak}일

💭 이번 주 나를 살린 문장:
"${weeklyData[0]?.comfort || '당신의 마음을 이해해요.'}"

#속마음노트 #감정기록 #마음돌보기`;

        try {
            await Share.share({
                message: reportText,
                title: '나의 주간 감정 리포트',
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    }, [emotionHistory, streak]);

    // 개선된 캐릭터 (더 중성적이고 친근함)
    const ImprovedCharacter = ({ size = 120 }) => {
        const isHappy = characterHappiness > 60;
        const isVeryHappy = characterHappiness > 80;
        const isSad = characterHappiness < 30;

        return (
            <View style={[styles.characterContainer, { width: size, height: size }]}>
                <View style={styles.characterWrapper}>
                    {/* 메인 바디 */}
                    <LinearGradient
                        colors={isVeryHappy ? ['#FFB347', '#FFA500'] : isHappy ? ['#87CEEB', '#4682B4'] : isSad ? ['#D3D3D3', '#A9A9A9'] : ['#98FB98', '#90EE90']}
                        style={styles.characterBody}
                    >
                        {/* 눈 */}
                        <View style={styles.characterEyes}>
                            <View style={[styles.characterEye, isSad && styles.sadEye]} />
                            <View style={[styles.characterEye, isSad && styles.sadEye]} />
                        </View>

                        {/* 입 */}
                        {isVeryHappy ? (
                            <View style={styles.bigSmile} />
                        ) : isHappy ? (
                            <View style={styles.smile} />
                        ) : isSad ? (
                            <View style={styles.frown} />
                        ) : (
                            <View style={styles.neutral} />
                        )}

                        {/* 볼 (행복할 때만) */}
                        {isVeryHappy && (
                            <>
                                <View style={[styles.cheek, styles.leftCheek]} />
                                <View style={[styles.cheek, styles.rightCheek]} />
                            </>
                        )}
                    </LinearGradient>

                    {/* 레벨 배지 */}
                    <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        style={styles.levelBadge}
                    >
                        <Text style={styles.levelText}>{characterLevel}</Text>
                    </LinearGradient>
                </View>

                {/* 상태 메시지 */}
                <Text style={[styles.characterStatus, isDarkMode && styles.darkText]}>
                    {characterHappiness >= 80 ? '아주 행복해하고 있어요!' :
                        characterHappiness >= 60 ? '당신과 함께 있어 행복해요' :
                            characterHappiness >= 40 ? '조금 쓸쓸해하고 있어요' :
                                '많이 외로워하고 있어요'}
                </Text>
            </View>
        );
    };

    // 개선된 트렌드 차트
    const ImprovedTrendChart = () => {
        const trendData = getRecentTrend();
        if (trendData.length === 0) {
            return (
                <View style={styles.emptyChart}>
                    <Text style={[styles.emptyChartText, isDarkMode && styles.darkSubText]}>
                        일주일간 기록하시면 변화를 보여드릴게요!
                    </Text>
                </View>
            );
        }

        const maxValue = Math.max(...trendData.map(d => d.value), 5);

        return (
            <View style={styles.improvedChart}>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, isDarkMode && styles.darkText]}>지난 7일</Text>
                    <Text style={[styles.chartSubtitle, isDarkMode && styles.darkSubText]}>
                        총 {trendData.length}일 기록
                    </Text>
                </View>
                <View style={styles.chartContent}>
                    {trendData.map((point, index) => (
                        <View key={index} style={styles.chartPoint}>
                            <View style={[
                                styles.chartBar,
                                {
                                    height: (point.value / maxValue) * 40,
                                    backgroundColor: point.color
                                }
                            ]} />
                            <Text style={[styles.chartLabel, isDarkMode && styles.darkSubText]}>
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

    // 홈 탭 (개선됨)
    const renderHomeTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            {/* 고정 CTA 배너 */}
            <Animated.View style={[styles.fixedCTA, { opacity: cardFadeAnim }]}>
                <TouchableOpacity
                    onPress={submitEmotion}
                    disabled={isSubmitting || !emotionText.trim()}
                    style={{ opacity: isSubmitting || !emotionText.trim() ? 0.5 : 1 }}
                >
                    <LinearGradient
                        colors={['#667eea', '#764ba2']}
                        style={styles.fixedCTAButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {isSubmitting ? (
                            <>
                                <ActivityIndicator color="#fff" size="small" />
                                <Text style={styles.fixedCTAText}>{t('submitPending')}</Text>
                            </>
                        ) : (
                            <>
                                <MaterialCommunityIcons name="heart-pulse" size={20} color="#fff" />
                                <Text style={styles.fixedCTAText}>{t('submitEmotion')}</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            {/* 스트릭 배너 */}
            {streak > 0 && (
                <Animated.View style={[styles.streakBanner, { opacity: cardFadeAnim }]}>
                    <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.streakGradient}
                    >
                        <Ionicons name="flame" size={16} color="#fff" />
                        <Text style={styles.streakText}>{t('streakMessage', { days: streak })}</Text>
                    </LinearGradient>
                </Animated.View>
            )}

            {/* 헤더 카드 */}
            <Animated.View style={[styles.headerCard, { opacity: cardFadeAnim, transform: [{ scale: scaleAnim }] }]}>
                <LinearGradient
                    colors={isDarkMode ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                    style={styles.headerGradient}
                >
                    <Text style={[styles.appTitle, isDarkMode && styles.darkText]}>{t('appTitle')}</Text>
                    <Text style={[styles.greetingText, isDarkMode && styles.darkSubText]}>{t('greeting')}</Text>
                </LinearGradient>
            </Animated.View>

            {/* 맥락적 명언 카드 */}
            <Animated.View style={[styles.quoteCard, { opacity: cardFadeAnim }]}>
                <LinearGradient
                    colors={['#f0f4ff', '#e8f2ff']}
                    style={styles.quoteGradient}
                >
                    <View style={styles.quoteHeader}>
                        <Ionicons name="bulb-outline" size={20} color="#667eea" />
                        <Text style={styles.quoteTitle}>{t('todayQuote')}</Text>
                    </View>
                    <Text style={styles.quoteText}>{todayQuote}</Text>
                </LinearGradient>
            </Animated.View>

            {/* 개선된 트렌드 카드 */}
            {emotionHistory.length > 0 && (
                <Animated.View style={[styles.trendCard, { opacity: cardFadeAnim }]}>
                    <ImprovedTrendChart />
                </Animated.View>
            )}

            {/* 캐릭터 카드 */}
            <Animated.View style={[styles.characterCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                <ImprovedCharacter size={120} />
                <Text style={[styles.characterName, isDarkMode && styles.darkText]}>{characterName}</Text>

                {/* 개선된 스탯 */}
                <View style={styles.statsContainer}>
                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, isDarkMode && styles.darkText]}>💜 레벨</Text>
                        <Text style={[styles.statValue, isDarkMode && styles.darkText]}>Lv.{characterLevel}</Text>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, isDarkMode && styles.darkText]}>⚡ 경험치</Text>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <Animated.View style={[styles.progressFill, {
                                    width: expAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%'],
                                    })
                                }]} />
                            </View>
                            <Text style={[styles.statValue, isDarkMode && styles.darkText]}>{characterExp}/100</Text>
                        </View>
                    </View>

                    <View style={styles.statRow}>
                        <Text style={[styles.statLabel, isDarkMode && styles.darkText]}>💛 친밀도</Text>
                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <Animated.View style={[styles.progressFillHappy, {
                                    width: happinessAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%'],
                                    })
                                }]} />
                            </View>
                            <Text style={[styles.statValue, isDarkMode && styles.darkText]}>{characterHappiness}%</Text>
                        </View>
                    </View>
                </View>
            </Animated.View>

            {/* 감정 입력 */}
            <Animated.View style={[styles.emotionSection, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>{t('emotionPrompt')}</Text>

                {/* 빠른 감정 선택 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickEmotions}>
                    {t('quickEmotions').map((emotion, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.quickEmotionButton,
                                emotionText === emotion.text && styles.quickEmotionButtonSelected,
                            ]}
                            onPress={() => {
                                setEmotionText(emotion.text);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Text style={styles.quickEmotionEmoji}>{emotion.emoji}</Text>
                            <Text style={[
                                styles.quickEmotionText,
                                emotionText === emotion.text && styles.quickEmotionTextSelected
                            ]} numberOfLines={2}>{emotion.text}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* 텍스트 입력 */}
                <TextInput
                    style={[styles.emotionInput, isDarkMode && styles.darkInput]}
                    multiline
                    placeholder={t('emotionPlaceholder')}
                    placeholderTextColor="#999"
                    value={emotionText}
                    onChangeText={setEmotionText}
                    maxLength={300}
                />
                <Text style={styles.charCount}>{emotionText.length}/300</Text>
            </Animated.View>

            {/* 익명 위로받기 */}
            <Animated.View style={[styles.anonymousCard, { opacity: cardFadeAnim }]}>
                <TouchableOpacity
                    style={styles.anonymousButton}
                    onPress={() => setShowAnonymousModal(true)}
                >
                    <LinearGradient
                        colors={['#f0f4ff', '#ffffff']}
                        style={styles.anonymousGradient}
                    >
                        <View style={styles.anonymousIcon}>
                            <Ionicons name="chatbubble-outline" size={24} color="#667eea" />
                        </View>
                        <View style={styles.anonymousContent}>
                            <Text style={[styles.anonymousTitle, isDarkMode && styles.darkText]}>{t('anonymousComfort')}</Text>
                            <Text style={[styles.anonymousDesc, isDarkMode && styles.darkSubText]}>{t('anonymousDesc')}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#667eea" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );

    // 기록 탭 (개선됨)
    const renderHistoryTab = () => {
        const filteredHistory = getFilteredHistory();
        const filters = ['전체', ...t('quickEmotions').map(e => e.text)];

        return (
            <View style={styles.tabContent}>
                <View style={styles.tabHeader}>
                    <Text style={[styles.tabTitle, isDarkMode && styles.darkText]}>{t('history')}</Text>
                    <TouchableOpacity onPress={() => setShowTrash(true)}>
                        <Ionicons name="trash-outline" size={24} color={isDarkMode ? "#fff" : "#666"} />
                    </TouchableOpacity>
                </View>

                {/* 검색 바 */}
                <View style={[styles.searchContainer, isDarkMode && styles.darkCard]}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={[styles.searchInput, isDarkMode && styles.darkText]}
                        placeholder={t('searchPlaceholder')}
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* 개선된 필터 칩 */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
                    {filters.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChip,
                                selectedFilter === filter && styles.filterChipActive,
                                isDarkMode && styles.darkFilterChip,
                                selectedFilter === filter && isDarkMode && styles.darkFilterChipActive
                            ]}
                            onPress={() => setSelectedFilter(filter)}
                        >
                            <Text style={[
                                styles.filterText,
                                selectedFilter === filter && styles.filterTextActive,
                                isDarkMode && styles.darkText,
                                selectedFilter === filter && { color: '#fff' }
                            ]} numberOfLines={1}>{filter}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* 기록 리스트 */}
                {filteredHistory.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>📝</Text>
                        <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>{t('emptyHistory')}</Text>
                        <TouchableOpacity
                            style={styles.emptyStateCTA}
                            onPress={() => setCurrentTab('home')}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.emptyGradient}
                            >
                                <Text style={styles.emptyCTAText}>{t('emptyHistoryCTA')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={filteredHistory}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => {
                            const hasCrisisFlag = isCrisis(item.text);
                            return (
                                <Animated.View style={[
                                    styles.historyCard,
                                    isDarkMode && styles.darkCard,
                                    hasCrisisFlag && styles.crisisCard,
                                    { opacity: cardFadeAnim }
                                ]}>
                                    <View style={styles.historyHeader}>
                                        <Text style={[styles.historyDate, isDarkMode && styles.darkSubText]}>
                                            {new Date(item.date).toLocaleDateString('ko', {
                                                month: 'short',
                                                day: 'numeric',
                                                weekday: 'short'
                                            })}
                                        </Text>
                                        <View style={styles.historyActions}>
                                            {hasCrisisFlag && (
                                                <TouchableOpacity
                                                    style={styles.crisisHelper}
                                                    onPress={() => setShowCrisisModal(true)}
                                                >
                                                    <Ionicons name="heart" size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            )}
                                            <LinearGradient
                                                colors={['#f0f4ff', '#e8f2ff']}
                                                style={styles.emotionBadge}
                                            >
                                                <Text style={styles.emotionBadgeText}>{item.emotion}</Text>
                                            </LinearGradient>
                                            <TouchableOpacity onPress={() => softDeleteEntry(item.id)}>
                                                <Ionicons name="trash-outline" size={18} color={isDarkMode ? "#fff" : "#999"} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={[styles.historyText, isDarkMode && styles.darkText]}>{item.text}</Text>
                                    {item.intensity && (
                                        <View style={styles.intensityBar}>
                                            <Text style={[styles.intensityLabel, isDarkMode && styles.darkSubText]}>강도</Text>
                                            <View style={styles.intensityDots}>
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <View key={i} style={[
                                                        styles.intensityDot,
                                                        i <= item.intensity && styles.intensityDotActive
                                                    ]} />
                                                ))}
                                            </View>
                                        </View>
                                    )}
                                </Animated.View>
                            );
                        }}
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={10}
                        removeClippedSubviews={true}
                    />
                )}
            </View>
        );
    };

    // 인사이트 탭 (개선됨)
    const renderInsightsTab = () => {
        const recentData = emotionHistory
            .filter(e => !e.deletedAt)
            .slice(0, 7);

        const emotionCounts = recentData.reduce((acc, curr) => {
            acc[curr.emotion] = (acc[curr.emotion] || 0) + 1;
            return acc;
        }, {});

        const totalRecords = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
        const weeklyInputs = emotionHistory
            .filter(e => !e.deletedAt &&
                new Date(e.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length;

        return (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
                <View style={styles.tabHeader}>
                    <Text style={[styles.tabTitle, isDarkMode && styles.darkText]}>{t('insights')}</Text>
                    <TouchableOpacity onPress={shareWeeklyReport}>
                        <Ionicons name="share-outline" size={24} color={isDarkMode ? "#fff" : "#667eea"} />
                    </TouchableOpacity>
                </View>

                {/* 핵심 지표 카드 */}
                <Animated.View style={[styles.insightCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                    <LinearGradient
                        colors={isDarkMode ? ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)'] : ['#f8f9ff', '#ffffff']}
                        style={styles.insightGradient}
                    >
                        <Text style={[styles.insightTitle, isDarkMode && styles.darkText]}>이번 주 핵심 지표</Text>

                        <View style={styles.keyMetrics}>
                            <View style={styles.metric}>
                                <Text style={styles.metricValue}>{streak}</Text>
                                <Text style={[styles.metricLabel, isDarkMode && styles.darkSubText]}>연속 기록일</Text>
                            </View>
                            <View style={styles.metric}>
                                <Text style={styles.metricValue}>{weeklyInputs}</Text>
                                <Text style={[styles.metricLabel, isDarkMode && styles.darkSubText]}>주간 입력</Text>
                            </View>
                            <View style={styles.metric}>
                                <Text style={styles.metricValue}>{characterLevel}</Text>
                                <Text style={[styles.metricLabel, isDarkMode && styles.darkSubText]}>레벨</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* 주간 감정 분포 */}
                <Animated.View style={[styles.insightCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                    <LinearGradient
                        colors={isDarkMode ? ['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)'] : ['#f8f9ff', '#ffffff']}
                        style={styles.insightGradient}
                    >
                        <Text style={[styles.insightTitle, isDarkMode && styles.darkText]}>감정 분포</Text>

                        {totalRecords === 0 ? (
                            <View style={styles.emptyInsight}>
                                <Text style={[styles.emptyInsightText, isDarkMode && styles.darkSubText]}>
                                    일주일간 꾸준히 기록하시면 감정 패턴을 분석해드릴게요!
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.emotionDistribution}>
                                    {Object.entries(emotionCounts).map(([emotion, count]) => (
                                        <View key={emotion} style={styles.emotionStat}>
                                            <Text style={[styles.emotionStatLabel, isDarkMode && styles.darkText]}>{emotion}</Text>
                                            <View style={styles.emotionStatBar}>
                                                <LinearGradient
                                                    colors={['#667eea', '#764ba2']}
                                                    style={[
                                                        styles.emotionStatFill,
                                                        { width: `${(count / totalRecords) * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={[styles.emotionStatCount, isDarkMode && styles.darkSubText]}>
                                                {count}회 ({Math.round((count / totalRecords) * 100)}%)
                                            </Text>
                                        </View>
                                    ))}
                                </View>

                                <View style={styles.insightSummary}>
                                    <Text style={[styles.insightSummaryText, isDarkMode && styles.darkText]}>
                                        가장 자주 느낀 감정: {Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0]}
                                    </Text>
                                    <Text style={[styles.insightSummaryText, isDarkMode && styles.darkText]}>
                                        총 {totalRecords}개의 소중한 기록
                                    </Text>
                                </View>
                            </>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* 나를 살린 문장 */}
                {recentData.length > 0 && (
                    <Animated.View style={[styles.insightCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                        <LinearGradient
                            colors={['#f0f9ff', '#ffffff']}
                            style={styles.insightGradient}
                        >
                            <View style={styles.quoteSectionHeader}>
                                <Text style={[styles.insightTitle, isDarkMode && styles.darkText]}>이번 주 나를 살린 문장</Text>
                                <TouchableOpacity
                                    onPress={() => showToastMessage(t('savedToClipboard'))}
                                    style={styles.saveButton}
                                >
                                    <Ionicons name="bookmark-outline" size={20} color="#667eea" />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.savedQuoteText, isDarkMode && styles.darkText]}>
                                "{recentData[0]?.comfort || '당신의 마음을 소중히 여기세요.'}"
                            </Text>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* 행동 추천 */}
                {recentData.length > 0 && (
                    <Animated.View style={[styles.insightCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                        <LinearGradient
                            colors={['#ecfdf5', '#ffffff']}
                            style={styles.insightGradient}
                        >
                            <Text style={[styles.insightTitle, isDarkMode && styles.darkText]}>이번 주 추천 활동</Text>
                            <View style={styles.recommendedActions}>
                                <View style={styles.actionItem}>
                                    <Ionicons name="leaf-outline" size={20} color="#059669" />
                                    <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
                                        3분 명상으로 마음 정리하기
                                    </Text>
                                </View>
                                <View style={styles.actionItem}>
                                    <Ionicons name="walk-outline" size={20} color="#059669" />
                                    <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
                                        산책하며 자연과 함께하기
                                    </Text>
                                </View>
                                <View style={styles.actionItem}>
                                    <Ionicons name="journal-outline" size={20} color="#059669" />
                                    <Text style={[styles.actionText, isDarkMode && styles.darkText]}>
                                        감정 일기 쓰기
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}
            </ScrollView>
        );
    };

    // 설정 탭 (대폭 개선)
    const renderSettingsTab = () => (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
            <View style={styles.tabHeader}>
                <Text style={[styles.tabTitle, isDarkMode && styles.darkText]}>{t('settings')}</Text>
            </View>

            {/* 앱 설정 */}
            <Animated.View style={[styles.settingCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                <Text style={[styles.settingCategoryTitle, isDarkMode && styles.darkText]}>앱 설정</Text>

                <View style={styles.settingRow}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="moon-outline" size={20} color={isDarkMode ? "#fff" : "#333"} />
                        <Text style={[styles.settingTitle, isDarkMode && styles.darkText]}>{t('darkMode')}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.toggleSwitch, isDarkMode && styles.toggleSwitchActive]}
                        onPress={() => setIsDarkMode(!isDarkMode)}
                    >
                        <Animated.View style={[
                            styles.toggleThumb,
                            isDarkMode && styles.toggleThumbActive
                        ]} />
                    </TouchableOpacity>
                </View>

                <View style={styles.settingDivider} />

                <View style={styles.settingRowVertical}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="language-outline" size={20} color={isDarkMode ? "#fff" : "#333"} />
                        <Text style={[styles.settingTitle, isDarkMode && styles.darkText]}>언어</Text>
                    </View>
                    <View style={styles.languageOptions}>
                        <TouchableOpacity
                            style={[
                                styles.languageOption,
                                language === 'ko' && styles.activeOption,
                                isDarkMode && styles.darkLanguageOption
                            ]}
                            onPress={() => setLanguage('ko')}
                        >
                            {language === 'ko' && (
                                <Ionicons name="checkmark-circle" size={18} color="#667eea" />
                            )}
                            <Text style={[
                                styles.languageText,
                                language === 'ko' && styles.activeText,
                                isDarkMode && styles.darkText
                            ]}>
                                한국어
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.languageOption,
                                language === 'en' && styles.activeOption,
                                isDarkMode && styles.darkLanguageOption
                            ]}
                            onPress={() => setLanguage('en')}
                        >
                            {language === 'en' && (
                                <Ionicons name="checkmark-circle" size={18} color="#667eea" />
                            )}
                            <Text style={[
                                styles.languageText,
                                language === 'en' && styles.activeText,
                                isDarkMode && styles.darkText
                            ]}>
                                English
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            {/* 데이터 관리 */}
            <Animated.View style={[styles.settingCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                <Text style={[styles.settingCategoryTitle, isDarkMode && styles.darkText]}>데이터 관리</Text>

                <TouchableOpacity style={styles.settingRowButton} onPress={() => Alert.alert('데이터 백업', '클라우드에 데이터를 백업하시겠어요?')}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="cloud-upload-outline" size={20} color={isDarkMode ? "#fff" : "#333"} />
                        <View>
                            <Text style={[styles.settingTitle, isDarkMode && styles.darkText]}>{t('dataBackup')}</Text>
                            <Text style={[styles.settingDesc, isDarkMode && styles.darkSubText]}>클라우드에 안전하게 저장</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity style={styles.settingRowButton} onPress={() => Alert.alert('앱 잠금', '생체인증으로 앱을 보호하시겠어요?')}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="finger-print-outline" size={20} color={isDarkMode ? "#fff" : "#333"} />
                        <View>
                            <Text style={[styles.settingTitle, isDarkMode && styles.darkText]}>{t('appLock')}</Text>
                            <Text style={[styles.settingDesc, isDarkMode && styles.darkSubText]}>생체인증으로 보호</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
            </Animated.View>

            {/* 도움 및 지원 */}
            <Animated.View style={[styles.settingCard, isDarkMode && styles.darkCard, { opacity: cardFadeAnim }]}>
                <Text style={[styles.settingCategoryTitle, isDarkMode && styles.darkText]}>도움 및 지원</Text>

                <TouchableOpacity
                    style={styles.settingRowButton}
                    onPress={() => setShowCrisisModal(true)}
                >
                    <View style={styles.settingInfo}>
                        <Ionicons name="heart-outline" size={20} color="#EF4444" />
                        <View>
                            <Text style={[styles.settingTitle, { color: '#EF4444' }]}>위기지원</Text>
                            <Text style={[styles.settingDesc, isDarkMode && styles.darkSubText]}>{t('crisisHelpline')}</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>

                <View style={styles.settingDivider} />

                <TouchableOpacity style={styles.settingRowButton} onPress={() => Linking.openURL('mailto:support@innernote.app')}>
                    <View style={styles.settingInfo}>
                        <Ionicons name="mail-outline" size={20} color={isDarkMode ? "#fff" : "#333"} />
                        <View>
                            <Text style={[styles.settingTitle, isDarkMode && styles.darkText]}>{t('contactUs')}</Text>
                            <Text style={[styles.settingDesc, isDarkMode && styles.darkSubText]}>의견을 들려주세요</Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
            </Animated.View>

            {/* 법적 정보 */}
            <Animated.View style={[styles.legalCard, isDarkMode && styles.darkLegalCard, { opacity: cardFadeAnim }]}>
                <Text style={[styles.legalText, isDarkMode && styles.darkSubText]}>{t('crisisDisclaimer')}</Text>
                <View style={styles.legalLinks}>
                    <TouchableOpacity onPress={() => Linking.openURL('https://example.com/privacy')}>
                        <Text style={styles.linkText}>개인정보처리방침</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Linking.openURL('https://example.com/terms')}>
                        <Text style={styles.linkText}>이용약관</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.deleteAccountButton}
                    onPress={() => Alert.alert(
                        '계정 삭제',
                        '모든 데이터가 영구 삭제됩니다. 계속하시겠어요?',
                        [
                            { text: '취소', style: 'cancel' },
                            { text: '삭제', style: 'destructive', onPress: () => console.log('Account deleted') }
                        ]
                    )}
                >
                    <Text style={styles.deleteAccountText}>{t('deleteAccount')}</Text>
                </TouchableOpacity>
            </Animated.View>
        </ScrollView>
    );

    return (
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDarkMode ? ['#1a1a2e', '#16213e', '#0f3460'] : ['#87CEEB', '#6BB6D6', '#4A90E2']}
                style={styles.background}
            >
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
                <View style={[styles.tabBar, isDarkMode && styles.darkTabBar]}>
                    <LinearGradient
                        colors={isDarkMode ? ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'] : ['#ffffff', 'rgba(255,255,255,0.95)']}
                        style={styles.tabGradient}
                    >
                        {['home', 'history', 'insights', 'settings'].map((tab) => {
                            const icons = {
                                home: currentTab === tab ? 'home' : 'home-outline',
                                history: currentTab === tab ? 'book' : 'book-outline',
                                insights: currentTab === tab ? 'stats-chart' : 'stats-chart-outline',
                                settings: currentTab === tab ? 'settings' : 'settings-outline',
                            };

                            return (
                                <TouchableOpacity
                                    key={tab}
                                    style={styles.tabItem}
                                    onPress={() => {
                                        setCurrentTab(tab);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                >
                                    <Ionicons
                                        name={icons[tab]}
                                        size={24}
                                        color={currentTab === tab ? '#667eea' : (isDarkMode ? '#ccc' : '#999')}
                                    />
                                    <Text style={[
                                        styles.tabText,
                                        currentTab === tab && styles.activeTabText,
                                        isDarkMode && styles.darkTabText,
                                        currentTab === tab && { color: '#667eea' }
                                    ]}>
                                        {t(tab)}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </LinearGradient>
                </View>

                {/* 개선된 결과 시트 */}
                {showResultSheet && (
                    <Animated.View style={[
                        styles.resultSheet,
                        isDarkMode && styles.darkSheet,
                        { transform: [{ translateY: sheetAnim }] }
                    ]}>
                        <LinearGradient
                            colors={isDarkMode ? ['#2d3436', '#636e72'] : ['#ffffff', '#f8f9fa']}
                            style={styles.sheetGradient}
                        >
                            <View style={[styles.sheetHandle, isDarkMode && styles.darkSheetHandle]} />
                            <View style={styles.sheetContent}>
                                <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    style={styles.sheetBadge}
                                >
                                    <Text style={styles.sheetBadgeText}>{currentResult?.emotion}</Text>
                                </LinearGradient>
                                <Text style={[styles.sheetMessage, isDarkMode && styles.darkText]}>{currentResult?.comfort}</Text>

                                {currentResult?.intensity && (
                                    <View style={[styles.sheetIntensity, isDarkMode && styles.darkSheetAction]}>
                                        <Text style={styles.sheetIntensityTitle}>감정 강도</Text>
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

                                <View style={[styles.sheetAction, isDarkMode && styles.darkSheetAction]}>
                                    <Text style={styles.sheetActionTitle}>💡 추천 활동</Text>
                                    <Text style={[styles.sheetActionText, isDarkMode && styles.darkSubText]}>{currentResult?.action}</Text>
                                </View>

                                <View style={styles.sheetButtons}>
                                    <TouchableOpacity
                                        style={styles.sheetButtonSecondary}
                                        onPress={() => setShowAnonymousModal(true)}
                                    >
                                        <Text style={[styles.sheetButtonSecondaryText, isDarkMode && styles.darkText]}>더 많은 위로</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.sheetButton} onPress={closeResultSheet}>
                                        <LinearGradient
                                            colors={['#667eea', '#764ba2']}
                                            style={styles.sheetButtonGradient}
                                        >
                                            <Text style={styles.sheetButtonText}>{t('confirm')}</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                )}

                {/* 개선된 위기 지원 모달 */}
                <Modal visible={showCrisisModal} transparent animationType="fade">
                    <View style={styles.crisisOverlay}>
                        <View style={[styles.crisisContent, isDarkMode && styles.darkCrisisContent]}>
                            <LinearGradient
                                colors={['#FEF2F2', '#FECACA']}
                                style={styles.crisisHeader}
                            >
                                <Ionicons name="heart" size={32} color="#EF4444" />
                                <Text style={styles.crisisTitle}>{t('crisisTitle')}</Text>
                            </LinearGradient>

                            <View style={styles.crisisBody}>
                                <Text style={[styles.crisisMessage, isDarkMode && styles.darkText]}>{t('crisisMessage')}</Text>

                                <View style={styles.crisisHelplines}>
                                    <TouchableOpacity
                                        style={styles.crisisButton}
                                        onPress={() => Linking.openURL('tel:1393')}
                                    >
                                        <LinearGradient
                                            colors={['#EF4444', '#DC2626']}
                                            style={styles.crisisButtonGradient}
                                        >
                                            <Ionicons name="call" size={20} color="#fff" />
                                            <Text style={styles.crisisButtonText}>생명의전화 1393</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.crisisButtonSecondary}
                                        onPress={() => Linking.openURL('tel:109')}
                                    >
                                        <Ionicons name="chatbubble-outline" size={20} color="#EF4444" />
                                        <Text style={styles.crisisButtonSecondaryText}>청소년전화 109</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={[styles.crisisDisclaimer, isDarkMode && styles.darkSubText]}>
                                    {t('crisisDisclaimer')}
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.crisisCloseButton}
                                onPress={() => {
                                    setShowCrisisModal(false);
                                    setEmotionText('');
                                }}
                            >
                                <Text style={[styles.crisisCloseText, isDarkMode && styles.darkText]}>{t('confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 개선된 익명 위로 모달 */}
                <Modal visible={showAnonymousModal} transparent animationType="slide">
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, isDarkMode && styles.darkCard]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>{t('anonymousComfort')}</Text>
                                <TouchableOpacity onPress={() => {
                                    setShowAnonymousModal(false);
                                    setAnonymousText('');
                                    setAnonymousResult(null);
                                }}>
                                    <Ionicons name="close" size={24} color={isDarkMode ? "#fff" : "#666"} />
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                style={[styles.anonymousInput, isDarkMode && styles.darkInput]}
                                multiline
                                placeholder={t('emotionPlaceholder')}
                                placeholderTextColor="#999"
                                value={anonymousText}
                                onChangeText={setAnonymousText}
                                maxLength={300}
                            />

                            {anonymousResult && (
                                <View style={[styles.anonymousResult, isDarkMode && styles.darkCard]}>
                                    <LinearGradient
                                        colors={['#f0f4ff', '#e8f2ff']}
                                        style={styles.anonymousResultGradient}
                                    >
                                        <Text style={styles.anonymousResultText}>{anonymousResult.comfort}</Text>
                                        <Text style={styles.anonymousResultAction}>{anonymousResult.action}</Text>
                                    </LinearGradient>
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.modalSubmitButton, (!anonymousText.trim() || isSubmitting) && styles.modalSubmitButtonDisabled]}
                                disabled={!anonymousText.trim() || isSubmitting}
                                onPress={async () => {
                                    if (anonymousText.trim()) {
                                        setIsSubmitting(true);
                                        await new Promise(resolve => setTimeout(resolve, 1000));
                                        const result = analyzeEmotion(anonymousText);
                                        setAnonymousResult(result);
                                        setIsSubmitting(false);
                                        showToastMessage('위로를 받았어요');
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    }
                                }}
                            >
                                <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    style={styles.gradientButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <Text style={styles.modalButtonText}>위로받기</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* 휴지통 모달 (개선됨) */}
                <Modal visible={showTrash} animationType="slide">
                    <View style={[styles.modalContainer, isDarkMode && styles.darkContainer]}>
                        <View style={[styles.modalHeader, isDarkMode && styles.darkCard]}>
                            <Text style={[styles.modalTitle, isDarkMode && styles.darkText]}>{t('trash')}</Text>
                            <TouchableOpacity onPress={() => setShowTrash(false)}>
                                <Ionicons name="close" size={24} color={isDarkMode ? "#fff" : "#666"} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={getTrashItems()}
                            keyExtractor={item => item.id}
                            renderItem={({ item }) => (
                                <View style={[styles.trashCard, isDarkMode && styles.darkCard]}>
                                    <View style={styles.trashHeader}>
                                        <Text style={[styles.trashDate, isDarkMode && styles.darkSubText]}>
                                            {new Date(item.date).toLocaleDateString()}
                                        </Text>
                                        <Text style={[styles.trashEmotion, isDarkMode && styles.darkText]}>{item.emotion}</Text>
                                    </View>
                                    <Text style={[styles.trashText, isDarkMode && styles.darkText]} numberOfLines={2}>{item.text}</Text>
                                    <View style={styles.trashActions}>
                                        <TouchableOpacity
                                            style={styles.restoreButton}
                                            onPress={() => restoreEntry(item.id)}
                                        >
                                            <Ionicons name="refresh" size={16} color="#667eea" />
                                            <Text style={styles.restoreText}>{t('restore')}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteButton}
                                            onPress={() => deleteForever(item.id)}
                                        >
                                            <Ionicons name="trash" size={16} color="#EF4444" />
                                            <Text style={styles.deleteText}>{t('deleteForever')}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyIcon}>🗑️</Text>
                                    <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>휴지통이 비어있어요</Text>
                                    <Text style={[styles.emptyDesc, isDarkMode && styles.darkSubText]}>
                                        삭제된 기록은 {TRASH_TTL_DAYS}일 후 자동으로 영구 삭제돼요
                                    </Text>
                                </View>
                            }
                        />
                    </View>
                </Modal>

                {/* 토스트 메시지 */}
                <ToastMessage />
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    darkInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
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
        marginBottom: 16,
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
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
    },

    // 헤더 카드 (간격 조정)
    headerCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 15,
    },
    headerGradient: {
        padding: 32,
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#333',
        marginBottom: 12,
        letterSpacing: -0.8,
    },
    greetingText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        letterSpacing: -0.2,
    },

    // 명언 카드
    quoteCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    quoteGradient: {
        padding: 24,
    },
    quoteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    quoteTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#667eea',
        letterSpacing: -0.3,
    },
    quoteText: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
        fontWeight: '500',
        fontStyle: 'italic',
    },

    // 개선된 트렌드 카드
    trendCard: {
        backgroundColor: '#fff',
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
        padding: 24,
    },
    chartHeader: {
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    chartSubtitle: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
    chartContent: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        height: 80,
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
        color: '#999',
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyChart: {
        padding: 40,
        alignItems: 'center',
    },
    emptyChartText: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
    },

    // 개선된 캐릭터
    characterCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 20,
    },
    characterContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
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
        top: -8,
        right: -8,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
        elevation: 6,
    },
    levelText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#fff',
    },
    characterName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#333',
        marginBottom: 8,
        letterSpacing: -0.4,
    },
    characterStatus: {
        fontSize: 15,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 22,
    },

    // 스탯 (개선됨)
    statsContainer: {
        width: '100%',
        gap: 20,
    },
    statRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statLabel: {
        fontSize: 15,
        color: '#666',
        width: 90,
        fontWeight: '600',
    },
    statValue: {
        fontSize: 14,
        color: '#999',
        marginLeft: 12,
        fontWeight: '700',
        minWidth: 60,
        textAlign: 'right',
    },
    progressBarContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBar: {
        flex: 1,
        height: 10,
        backgroundColor: '#f0f0f0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#667eea',
        borderRadius: 5,
    },
    progressFillHappy: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 5,
    },

    // 감정 입력 섹션
    emotionSection: {
        backgroundColor: '#fff',
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
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 24,
        letterSpacing: -0.4,
    },
    quickEmotions: {
        marginBottom: 24,
        paddingVertical: 4,
    },
    quickEmotionButton: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    quickEmotionButtonSelected: {
        backgroundColor: '#f0f4ff',
        borderColor: '#667eea',
        shadowColor: '#667eea',
        shadowOpacity: 0.2,
        elevation: 6,
    },
    quickEmotionEmoji: {
        fontSize: 28,
        marginBottom: 6,
    },
    quickEmotionText: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    quickEmotionTextSelected: {
        color: '#667eea',
        fontWeight: '700',
    },
    emotionInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 20,
        minHeight: 120,
        fontSize: 16,
        color: '#333',
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    charCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 8,
        fontWeight: '500',
    },

    // 익명 위로받기
    anonymousCard: {
        marginHorizontal: 20,
        marginBottom: 30,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
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
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
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
        color: '#333',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    anonymousDesc: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },

    // 탭 헤더
    tabHeader: {
        marginTop: Platform.OS === 'ios' ? 80 : 60,
        marginHorizontal: 20,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tabTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#333',
        letterSpacing: -1,
    },

    // 검색
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
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
        color: '#333',
        fontWeight: '500',
    },

    // 개선된 필터
    filterContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    filterChip: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        marginRight: 10,
        minWidth: 80,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
        shadowColor: '#667eea',
        shadowOpacity: 0.3,
        elevation: 6,
    },
    darkFilterChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    darkFilterChipActive: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
    },
    filterText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: '700',
    },

    // 빈 상태 (개선됨)
    emptyState: {
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyIcon: {
        fontSize: 72,
        marginBottom: 24,
    },
    emptyText: {
        fontSize: 20,
        color: '#666',
        marginBottom: 32,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    emptyDesc: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
        marginTop: 8,
    },
    emptyStateCTA: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
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
    historyCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
        borderLeftWidth: 4,
        borderLeftColor: 'transparent',
    },
    crisisCard: {
        borderLeftColor: '#EF4444',
        backgroundColor: '#FEF7F7',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    historyDate: {
        fontSize: 13,
        color: '#999',
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
        color: '#333',
        lineHeight: 22,
        fontWeight: '500',
    },
    emotionBadge: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    emotionBadgeText: {
        fontSize: 12,
        color: '#667eea',
        fontWeight: '700',
        paddingHorizontal: 12,
        paddingVertical: 6,
        letterSpacing: -0.1,
    },

    // 강도 표시 (새로 추가)
    intensityBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    intensityLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
    },
    intensityDots: {
        flexDirection: 'row',
        gap: 4,
    },
    intensityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    intensityDotActive: {
        backgroundColor: '#667eea',
    },

    // 인사이트 카드 (대폭 개선)
    insightCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 15,
    },
    insightGradient: {
        padding: 24,
    },
    insightTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 20,
        letterSpacing: -0.4,
    },

    // 핵심 지표 (새로 추가)
    keyMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    metric: {
        alignItems: 'center',
    },
    metricValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#667eea',
        marginBottom: 4,
    },
    metricLabel: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
        textAlign: 'center',
    },

    // 감정 분포 (개선됨)
    emptyInsight: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyInsightText: {
        fontSize: 16,
        color: '#999',
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
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
        color: '#666',
        width: 80,
        fontWeight: '600',
    },
    emotionStatBar: {
        flex: 1,
        height: 12,
        backgroundColor: '#f0f0f0',
        borderRadius: 6,
        overflow: 'hidden',
    },
    emotionStatFill: {
        height: '100%',
        borderRadius: 6,
    },
    emotionStatCount: {
        fontSize: 13,
        color: '#999',
        width: 80,
        textAlign: 'right',
        fontWeight: '600',
    },
    insightSummary: {
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    insightSummaryText: {
        fontSize: 15,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600',
    },

    // 나를 살린 문장 (개선됨)
    quoteSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    saveButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
    },
    savedQuoteText: {
        fontSize: 18,
        color: '#333',
        lineHeight: 26,
        fontWeight: '500',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 16,
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
        backgroundColor: 'rgba(5, 150, 105, 0.05)',
        borderRadius: 12,
    },
    actionText: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
        flex: 1,
    },

    // 설정 (대폭 개선)
    settingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    settingCategoryTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
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
        color: '#333',
        letterSpacing: -0.2,
    },
    settingDesc: {
        fontSize: 13,
        color: '#999',
        marginTop: 2,
        fontWeight: '500',
    },
    settingDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
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
        backgroundColor: '#667eea',
    },
    toggleThumb: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#fff',
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
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    activeOption: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderColor: '#667eea',
    },
    darkLanguageOption: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    languageText: {
        fontSize: 15,
        color: '#666',
        fontWeight: '600',
    },
    activeText: {
        color: '#667eea',
        fontWeight: '700',
    },

    // 법적 정보 (개선됨)
    legalCard: {
        backgroundColor: '#f8f9fa',
        marginHorizontal: 20,
        marginBottom: 40,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    darkLegalCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    legalText: {
        fontSize: 13,
        color: '#666',
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
        color: '#667eea',
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
    darkTabBar: {
        shadowColor: '#fff',
        shadowOpacity: 0.05,
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
        color: '#999',
        marginTop: 4,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    activeTabText: {
        color: '#667eea',
        fontWeight: '700',
    },
    darkTabText: {
        color: '#ccc',
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
    },
    darkSheet: {
        shadowColor: '#fff',
        shadowOpacity: 0.1,
    },
    sheetGradient: {
        flex: 1,
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
        color: '#333',
        lineHeight: 28,
        marginBottom: 20,
        fontWeight: '600',
        letterSpacing: -0.4,
    },

    // 시트 내 강도 표시
    sheetIntensity: {
        backgroundColor: 'rgba(102, 126, 234, 0.08)',
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
        color: '#667eea',
    },

    sheetAction: {
        backgroundColor: 'rgba(102, 126, 234, 0.08)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
    },
    darkSheetAction: {
        backgroundColor: 'rgba(102, 126, 234, 0.15)',
    },
    sheetActionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#667eea',
        marginBottom: 8,
        letterSpacing: -0.2,
    },
    sheetActionText: {
        fontSize: 15,
        color: '#666',
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
        backgroundColor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetButtonSecondaryText: {
        color: '#666',
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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    crisisContent: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        borderRadius: 24,
        width: '90%',
        maxWidth: 380,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 20,
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
        color: '#666',
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
    crisisDisclaimer: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        lineHeight: 18,
    },
    crisisCloseButton: {
        backgroundColor: '#f8f9fa',
        padding: 20,
        alignItems: 'center',
    },
    crisisCloseText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },

    // 익명 위로 모달 (개선됨)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        width: '90%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 15,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        letterSpacing: -0.3,
    },
    anonymousInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 20,
        minHeight: 120,
        fontSize: 16,
        textAlignVertical: 'top',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#f0f0f0',
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
        color: '#333',
        lineHeight: 24,
        marginBottom: 12,
        fontWeight: '500',
    },
    anonymousResultAction: {
        fontSize: 14,
        color: '#667eea',
        fontWeight: '600',
    },
    modalSubmitButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    modalSubmitButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0.1,
        elevation: 2,
    },
    gradientButton: {
        padding: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },

    // 휴지통 모달 (개선됨)
    trashCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 12,
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    trashHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    trashDate: {
        fontSize: 12,
        color: '#999',
        fontWeight: '600',
    },
    trashEmotion: {
        fontSize: 13,
        color: '#667eea',
        fontWeight: '700',
        backgroundColor: '#f0f4ff',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },
    trashText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    trashActions: {
        flexDirection: 'row',
        gap: 12,
    },
    restoreButton: {
        flex: 1,
        backgroundColor: '#f0f4ff',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    restoreText: {
        color: '#667eea',
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
        padding: 16,
        gap: 12,
    },
    toastText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
});