import { useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import useAppStore from '../store';
import { useTranslate } from '../store/selectors';
import { loadData as loadStorageData } from '../utils/storage';
import { saveEncryptedData, loadEncryptedData, checkUserConsent, deleteAllEncryptedData } from '../utils/secureStorage';
import { getLocalDateKey } from '../utils/dateUtils';

export default function useAppInitialization({ showToastMessage }) {
    const translate = useTranslate();

    const loadData = useCallback(async () => {
        try {
            const consent = await checkUserConsent();
            if (!consent) {
                useAppStore.setState({ showConsentScreen: true, isInitializing: false });
                return;
            } else {
                useAppStore.setState({ hasUserConsent: true, showConsentScreen: false });
            }

            // 앱 잠금 설정 확인
            const lockEnabled = await SecureStore.getItemAsync('appLockEnabled');
            if (lockEnabled === 'true') {
                useAppStore.setState({ appLockEnabled: true, isAppLocked: true });

                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: translate('authPrompt'),
                    cancelLabel: translate('cancel'),
                    disableDeviceFallback: false,
                });

                if (result.success) {
                    useAppStore.setState({ isAppLocked: false });
                } else {
                    return;
                }
            } else {
                useAppStore.setState({ isAppLocked: false });
            }

            const data = await loadStorageData();
            if (__DEV__) console.log('Loaded data:', data);

            // 언어 설정 로드
            const savedLang = await AsyncStorage.getItem('language');
            if (savedLang) useAppStore.setState({ language: savedLang });

            // 사용자 이름 로드
            const savedName = await AsyncStorage.getItem('userName');
            if (savedName) useAppStore.setState({ userName: savedName });

            if (data.streak) useAppStore.setState({ streak: parseInt(data.streak) });
            if (data.recoveryTokens !== undefined) useAppStore.setState({ recoveryTokens: parseInt(data.recoveryTokens) });

            // 완료된 활동들 로드
            if (data.completedActivities) {
                try {
                    const activities = JSON.parse(data.completedActivities);
                    useAppStore.setState({ completedActivities: activities });
                } catch (e) {
                    if (__DEV__) console.log('Failed to parse completed activities:', e);
                }
            }

            // 일일 제한 카운트 체크 (날짜키 기반)
            const todayKey = getLocalDateKey();
            const savedDateKey = data.lastDiaryDateKey || '';
            const savedAnonymousCount = parseInt(data.dailyAnonymousCount) || 0;

            if (savedDateKey === todayKey) {
                useAppStore.setState({ dailyAnonymousCount: savedAnonymousCount, lastDiaryDate: todayKey });
            } else {
                useAppStore.setState({ dailyAnonymousCount: 0, dailyDiaryCount: 0, lastDiaryDate: todayKey });

                const today = new Date();
                const savedDate = new Date(savedDateKey + 'T00:00:00');
                if (today.getMonth() !== savedDate.getMonth() || today.getFullYear() !== savedDate.getFullYear()) {
                    useAppStore.setState({ recoveryTokens: 2 });
                }
            }

            // 감정 히스토리 로드 (암호화된 저장소 우선)
            let history = [];
            try {
                const encryptedHistory = await loadEncryptedData('emotionHistory');
                if (encryptedHistory) {
                    history = encryptedHistory;
                    if (__DEV__) console.log('Loaded encrypted emotion history:', history.length, 'records');
                } else if (data.emotionHistory) {
                    history = typeof data.emotionHistory === 'string'
                        ? JSON.parse(data.emotionHistory)
                        : data.emotionHistory;
                    if (__DEV__) console.log('Loaded legacy emotion history:', history.length, 'records');

                    if (history.length > 0) {
                        await saveEncryptedData('emotionHistory', history);
                        if (__DEV__) console.log('Migrated emotion history to encrypted storage');
                    }
                }

                useAppStore.setState({ emotionHistory: history });

                const todayEntry = history.find(entry =>
                    !entry.deletedAt &&
                    (entry.dateKey === todayKey || getLocalDateKey(new Date(entry.date)) === todayKey)
                );
                useAppStore.setState({ dailyDiaryCount: todayEntry ? 1 : 0 });
            } catch (error) {
                if (__DEV__) console.log('History load error:', error);
                useAppStore.setState({ emotionHistory: [] });
            }

            // 채팅 세션 로드 및 마이그레이션
            try {
                const loadedSessions = await loadEncryptedData('chatSessions');
                if (loadedSessions && Array.isArray(loadedSessions)) {
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

                    useAppStore.setState({ savedChatSessions: migratedSessions });

                    if (needsMigration) {
                        await saveEncryptedData('chatSessions', migratedSessions);
                        if (__DEV__) console.log('Migrated chat sessions with IDs');
                    }

                    if (__DEV__) console.log('Loaded chat sessions:', migratedSessions.length, 'sessions');
                } else {
                    useAppStore.setState({ savedChatSessions: [] });
                }
            } catch (error) {
                if (__DEV__) console.log('Chat sessions load error:', error);
                useAppStore.setState({ savedChatSessions: [] });
            }
        } catch (error) {
            if (__DEV__) console.log('Load error:', error);
            useAppStore.setState({ isAppLocked: false });
        } finally {
            useAppStore.setState({ isInitializing: false });
        }
    }, [translate]);

    const resetAllData = useCallback(async () => {
        try {
            await AsyncStorage.multiRemove(['lastRecordDateKey', 'language', 'lastChatDate', 'dailyChatTurns']);

            await SecureStore.deleteItemAsync('appLockEnabled').catch(() => {});
            await SecureStore.deleteItemAsync('emotion_app_key').catch(() => {});

            const { clearAllData } = require('../utils/storage');
            await clearAllData();
            await deleteAllEncryptedData();

            useAppStore.setState({
                emotionHistory: [],
                streak: 0,
                appLockEnabled: false,
                completedActivities: {},
                currentTab: 'home',
                dailyDiaryCount: 0,
                dailyAnonymousCount: 0,
                lastDiaryDate: '',
                dailyChatTurns: 0,
                sessionChatTurns: 0,
                chatHistory: [],
                savedChatSessions: [],
                hasUserConsent: false,
                showConsentScreen: true,
            });

            showToastMessage('✅ ' + translate('dataDeletedSuccess'));
        } catch (error) {
            console.error('Reset error:', error);
            showToastMessage(translate('deleteError'), 'error');
        }
    }, [showToastMessage, translate]);

    const checkStreak = useCallback(async () => {
        try {
            const lastRecordDateKey = await AsyncStorage.getItem('lastRecordDateKey');
            if (!lastRecordDateKey) return;
            // 앱 시작 시엔 계산만 하고 실제 증가/리셋은 기록할 때 처리
        } catch (error) {
            if (__DEV__) console.log('Streak check error:', error);
        }
    }, []);

    return { loadData, resetAllData, checkStreak };
}
