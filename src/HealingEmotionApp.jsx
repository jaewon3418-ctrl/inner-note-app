import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Alert,
    Animated,
    Platform,
    StatusBar,
    Linking,
    Share,
    PanResponder,
    ActivityIndicator,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { hapticSuccess } from './utils/safeHaptics';
import { translations } from './constants/translations';
import 'react-native-get-random-values';
import { exportUserData, revokeConsent } from './utils/secureStorage';
import ConsentScreen from './components/ConsentScreen';
import UpdatePrompt from './components/UpdatePrompt';
import analytics from './utils/analytics';
import SettingsTab from './components/SettingsTab';
import { DESIGN, EMOTIONS, toEmotionKey } from './constants/design';
import { styles } from './styles/appStyles';
import HomeTab from './components/tabs/HomeTab';
import HistoryTab from './components/tabs/HistoryTab';
import InsightsTab from './components/tabs/InsightsTab';
import LockScreen from './components/screens/LockScreen';
import ChatScreen from './components/screens/ChatScreen';
import ToastMessage from './components/ToastMessage';
import ResultSheet from './components/modals/ResultSheet';
import CrisisModal from './components/modals/CrisisModal';
import BackupPasswordModal from './components/modals/BackupPasswordModal';
import ImportPasswordModal from './components/modals/ImportPasswordModal';
import TrashModal from './components/modals/TrashModal';
import DeleteConfirmModal from './components/modals/DeleteConfirmModal';
import NameInputModal from './components/modals/NameInputModal';
import NameChangeModal from './components/modals/NameChangeModal';
import { AnonymousConfirmModal, ShortInputConfirmModal, ShortDiaryConfirmModal } from './components/modals/ConfirmModals';
import { getLocalDateKey, normalize, formatLocalizedDate as formatDate, formatFullDate as formatDateFull } from './utils/dateUtils';
import useStarAnimation from './hooks/useStarAnimation';
import useBackupRestore from './hooks/useBackupRestore';
import useNotifications from './hooks/useNotifications';
import useAppLifecycle from './hooks/useAppLifecycle';
import useAppStore from './store';
import { useTranslate } from './store/selectors';
import useAppLock from './hooks/useAppLock';
import useDataPersistence from './hooks/useDataPersistence';
import useAppInitialization from './hooks/useAppInitialization';
import useChatSession from './hooks/useChatSession';
import useEmotionAnalysis from './hooks/useEmotionAnalysis';


const { height } = Dimensions.get('window');

export default function App() {
    // ── Zustand store ──
    const currentTab = useAppStore(s => s.currentTab);
    const setCurrentTab = useAppStore(s => s.setCurrentTab);
    const emotionHistory = useAppStore(s => s.emotionHistory);
    const isAppLocked = useAppStore(s => s.isAppLocked);
    const language = useAppStore(s => s.language);
    const setCompletedActivities = useAppStore(s => s.setCompletedActivities);
    const showAnonymousModal = useAppStore(s => s.showAnonymousModal);
    const showConsentScreen = useAppStore(s => s.showConsentScreen);
    const setShowConsentScreen = useAppStore(s => s.setShowConsentScreen);
    const setHasUserConsent = useAppStore(s => s.setHasUserConsent);
    const isInitializing = useAppStore(s => s.isInitializing);
    const openConfirm = useAppStore(s => s.openConfirm);
    const closeConfirm = useAppStore(s => s.closeConfirm);
    const setDeleteItemId = useAppStore(s => s.setDeleteItemId);
    const streak = useAppStore(s => s.streak);
    const selectedFilter = useAppStore(s => s.selectedFilter);
    const setSelectedFilter = useAppStore(s => s.setSelectedFilter);
    const setUserName = useAppStore(s => s.setUserName);
    const openModal = useAppStore(s => s.openModal);

    // ── 로컬 상태 (store에 넣지 않음) ──
    const [tabClickCount, setTabClickCount] = useState(0);
    const [inputResetSeq, setInputResetSeq] = useState(0);
    const [currentInputText, setCurrentInputText] = useState('');
    const [selectedQuickEmotion, setSelectedQuickEmotion] = useState(null);
    const [anonymousText, setAnonymousText] = useState('');
    const [anonymousResult, setAnonymousResult] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showToast, setShowToast] = useState({ show: false, message: '', type: 'success' });
    const [tempNameInput, setTempNameInput] = useState('');
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

    // refs
    const scrollViewRef = useRef(null);
    const chatScrollViewRef = useRef(null);
    const inputRef = useRef(null);

    // 애니메이션
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const sheetAnim = useRef(new Animated.Value(height)).current;
    const cardFadeAnim = useRef(new Animated.Value(0)).current;
    const toastAnim = useRef(new Animated.Value(-100)).current;

    // 바텀시트 드래그 제스처
    const DRAG_CLOSE_THRESHOLD = 120;
    const FLING_VELOCITY = 0.8;
    const closeResultSheetRef = useRef(null);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (e) => {
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
                    closeResultSheetRef.current?.();
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

    // 번역 함수 - useMemo로 안정화
    const translate = useTranslate();

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

    // 백업/복원 (커스텀 훅)
    const backupRestore = useBackupRestore({ showToastMessage, loadData });
    const {
        backupPassword, setBackupPassword,
        importPassword, setImportPassword,
        importFileContent, setImportFileContent,
        exportSecureBackup, exportEncryptedBackup,
        importSecureBackup,
    } = backupRestore;

    // 앱 라이프사이클 (커스텀 훅)
    useAppLifecycle({ inputRef, closeResultSheet, handleTabSwitch });

    // 푸시 알림 (커스텀 훅)
    useNotifications({ inputRef });

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


    // 앱 초기화 (커스텀 훅)
    const { loadData, resetAllData, checkStreak } = useAppInitialization({ showToastMessage });

    // 데이터 자동 저장 (커스텀 훅)
    useDataPersistence();

    const { handleAppLockToggle } = useAppLock({ showToastMessage });

    // 휴지통 주기적 정리 (하루에 한 번)
    useEffect(() => {
        const purge = () => useAppStore.getState().purgeTrash();
        const intervalId = setInterval(purge, 24 * 60 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, []);

    const confirmDelete = useCallback((id) => {
        setDeleteItemId(id);
        openConfirm('delete');
    }, []);

    const softDeleteEntry = useCallback((id) => {
        useAppStore.getState().softDeleteEntry(id);
        showToastMessage(translate('recordDeleted'));
        hapticSuccess();
        closeConfirm();
    }, [showToastMessage, translate]);

    const restoreEntry = useCallback((id) => {
        useAppStore.getState().restoreEntry(id);
        showToastMessage(translate('recordRestored'));
        hapticSuccess();
    }, [showToastMessage, translate]);

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
                        useAppStore.getState().deleteForever(id);
                        showToastMessage(translate('permanentDeleted'));
                    }
                }
            ]
        );
    }, [translate, showToastMessage]);

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
    // normalize, pad, getLocalDateKey는 src/utils/dateUtils.js에서 import

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

    // 날짜 포맷터 (dateUtils.js에서 import, language 바인딩)
    const formatLocalizedDate = (date, options = {}) => formatDate(date, language, options);
    const formatFullDate = (date) => formatDateFull(date, language);

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

    // 백업/복원 훅은 useAppLifecycle 앞에서 선언됨

    

    // 감정 분석 (커스텀 훅)
    const { performEmotionAnalysis, closeResultSheet, submitEmotion, performAnonymousAnalysis } = useEmotionAnalysis({
        showToastMessage,
        sheetAnim,
        scrollViewRef,
        selectedQuickEmotion,
        setSelectedQuickEmotion,
        setInputResetSeq,
        setCurrentInputText,
        anonymousText,
        setAnonymousResult,
    });
    closeResultSheetRef.current = closeResultSheet;

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
        useAppStore.getState().purgeTrash();
        checkStreak();
    }, []);


    useEffect(() => {
        AsyncStorage.setItem('language', language).catch(()=>{});
    }, [language]);


    // 언어 변경시 필터 초기화 (라벨 변경으로 인한 선택 상태 꼬임 방지)
    useEffect(() => {
        setSelectedFilter('ALL');
    }, [language]);

    // AI 채팅 (커스텀 훅)
    const { sendChatMessage } = useChatSession({ chatScrollViewRef, showToastMessage });

    // 주간 리포트 공유 (실제 구현)
    const shareWeeklyReport = useCallback(async () => {
        const from = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const weeklyData = emotionHistory.filter(
            e => !e.deletedAt && new Date(e.date).getTime() >= from
        );

        if (weeklyData.length === 0) {
            Alert.alert(
                translate('notEnoughRecords'),
                translate('recordForReport')
            );
            return;
        }

        const emotionCount = {};
        weeklyData.forEach(entry => {
            emotionCount[entry.emotion] = (emotionCount[entry.emotion] || 0) + 1;
        });

        const mostFrequent = Object.entries(emotionCount)
            .sort(([, a], [, b]) => b - a)[0];

        const reportText = `📊 ${translate('reportTitle')}

🗓 ${translate('weeklyPeriod')}
📝 ${translate('totalRecordsReport', { count: weeklyData.length })}
😊 ${translate('mostFrequentEmotionLabel')}: ${mostFrequent?.[0]} (${translate('emotionCount', { count: mostFrequent?.[1] })})
🔥 ${translate('streakReport', { days: streak })}

💭 ${translate('weekSavingQuote')}:
"${weeklyData[0]?.comfort || translate('defaultComfort')}"

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
                        showToastMessage(translate('allActivitiesComplete'), 'success');
                    }, 300);
                }
            }
            
            return newState;
        });
    }, [getDailyActivities, language, showToastMessage]);

    // 별빛 애니메이션 (커스텀 훅)
    const { stars } = useStarAnimation();




    // ImprovedTrendChart, ToastMessage → 별도 컴포넌트로 분리




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
                    {translate('loading')}
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
                        openModal('nameInput');
                    }

                    // 동의 후 바로 메인 데이터 로드
                    loadData();
                }}
            />
        );
    }


    // 앱 잠금 화면
    if (isAppLocked) {
        return (
            <LockScreen
                showToastMessage={showToastMessage}
            />
        );
    }


    // AI 채팅 화면 (전체 화면)
    if (showAnonymousModal) {
        return (
            <ChatScreen
                sendChatMessage={sendChatMessage}
                chatScrollViewRef={chatScrollViewRef}
            />
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
                        {currentTab === 'home' && (
                            <HomeTab
                                currentInputText={currentInputText}
                                handleInputTextChange={handleInputTextChange}
                                submitEmotion={submitEmotion}
                                scrollViewRef={scrollViewRef}
                                inputRef={inputRef}
                            />
                        )}
                        {currentTab === 'history' && (
                            <HistoryTab
                                emotionHistory={emotionHistory}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                cardFadeAnim={cardFadeAnim}
                                getFilteredHistory={getFilteredHistory}
                                confirmDelete={confirmDelete}
                                formatLocalizedDate={formatLocalizedDate}
                            />
                        )}
                        {currentTab === 'insights' && (
                            <InsightsTab
                                cardFadeAnim={cardFadeAnim}
                                toggleActivityCompletion={toggleActivityCompletion}
                                getDailyActivities={getDailyActivities}
                            />
                        )}
                        {currentTab === 'settings' && (
                            <SettingsTab
                                cardFadeAnim={cardFadeAnim}
                                setTempNameInput={setTempNameInput}
                                exportSecureBackup={exportSecureBackup}
                                importSecureBackup={importSecureBackup}
                                exportUserData={exportUserData}
                                showToastMessage={showToastMessage}
                                revokeConsent={revokeConsent}
                                resetAllData={resetAllData}
                                handleAppLockToggle={handleAppLockToggle}
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

                {/* 결과 시트 */}
                <ResultSheet
                    panResponder={panResponder}
                    sheetAnim={sheetAnim}
                    closeResultSheet={closeResultSheet}
                />

                {/* 위기 지원 모달 */}
                <CrisisModal
                    openSafeURL={openSafeURL}
                    setSelectedQuickEmotion={setSelectedQuickEmotion}
                    setInputResetSeq={setInputResetSeq}
                />

                {/* 백업 비밀번호 입력 모달 */}
                <BackupPasswordModal
                    backupPassword={backupPassword}
                    setBackupPassword={setBackupPassword}
                    exportEncryptedBackup={exportEncryptedBackup}
                />

                {/* 데이터 복원 비밀번호 입력 모달 */}
                <ImportPasswordModal
                    importPassword={importPassword}
                    setImportPassword={setImportPassword}
                    setImportFileContent={setImportFileContent}
                    importSecureBackup={importSecureBackup}
                />

                {/* 휴지통 모달 */}
                <TrashModal
                    getTrashItems={getTrashItems}
                    restoreEntry={restoreEntry}
                    deleteForever={deleteForever}
                    formatLocalizedDate={formatLocalizedDate}
                />

                {/* 삭제 확인 모달 */}
                <DeleteConfirmModal
                    softDeleteEntry={softDeleteEntry}
                />

                {/* 이름 입력 모달 */}
                <NameInputModal
                    tempNameInput={tempNameInput}
                    setTempNameInput={setTempNameInput}
                />

                {/* 이름 변경 모달 */}
                <NameChangeModal
                    tempNameInput={tempNameInput}
                    setTempNameInput={setTempNameInput}
                    showToastMessage={showToastMessage}
                />

                {/* 익명 위로받기 중복 확인 모달 */}
                <AnonymousConfirmModal
                    performAnonymousAnalysis={performAnonymousAnalysis}
                />

                {/* 짧은 입력 확인 모달 */}
                <ShortInputConfirmModal
                    performAnonymousAnalysis={performAnonymousAnalysis}
                />

                {/* 홈화면 감정일기 짧은 입력 확인 모달 */}
                <ShortDiaryConfirmModal
                    performEmotionAnalysis={performEmotionAnalysis}
                    currentInputText={currentInputText}
                />


                {/* 토스트 메시지 */}
                <ToastMessage showToast={showToast} toastAnim={toastAnim} />

                {/* 업데이트 권장 팝업 */}
                <UpdatePrompt />
            </LinearGradient>


        </SafeAreaView>
    );
}
