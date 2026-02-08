import { useEffect } from 'react';
import { Platform, Linking, AppState, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateKey } from '../utils/dateUtils';
import analytics from '../utils/analytics';
import useAppStore from '../store';

let NavigationBar = null;
if (Platform.OS === 'android') {
    NavigationBar = require('expo-navigation-bar');
}

export default function useAppLifecycle({ inputRef, closeResultSheet, handleTabSwitch }) {
    // 안드로이드 네비게이션 바 숨기기
    useEffect(() => {
        const setupNavigationBar = async () => {
            if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                try {
                    await NavigationBar.setVisibilityAsync('hidden');
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
        const { appLockEnabled } = useAppStore.getState();
        if (!appLockEnabled) return;
        const sub = AppState.addEventListener('change', (state) => {
            if (state !== 'active') useAppStore.setState({ isAppLocked: true });
        });
        return () => sub.remove();
    }, [useAppStore(s => s.appLockEnabled)]);

    // 위젯 URL 처리
    useEffect(() => {
        Linking.getInitialURL().then(url => {
            if (url && url.includes('deeplogquickwrite')) {
                useAppStore.setState({ currentTab: 'home' });
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                }, 500);
                analytics.logWidgetTap();
            }
        });

        const subscription = Linking.addEventListener('url', ({ url }) => {
            if (url.includes('deeplogquickwrite')) {
                useAppStore.setState({ currentTab: 'home' });
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                }, 300);
                analytics.logWidgetTap();
            }
        });

        return () => subscription?.remove();
    }, []);

    // 포그라운드 복귀시 휴지통 정리 및 일일 제한 리셋 체크
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                if (Platform.OS === 'android' && NavigationBar?.setVisibilityAsync) {
                    NavigationBar.setVisibilityAsync('hidden').catch(() => {});
                }
                useAppStore.getState().purgeTrash();
                const today = getLocalDateKey();
                const { lastDiaryDate } = useAppStore.getState();
                if (lastDiaryDate !== today) {
                    useAppStore.setState({
                        dailyDiaryCount: 0,
                        dailyAnonymousCount: 0,
                        dailyChatTurns: 0,
                        lastDiaryDate: today,
                    });
                    AsyncStorage.setItem('lastChatDate', today).catch(err => {
                        console.error('Failed to update lastChatDate:', err);
                    });
                    AsyncStorage.setItem('dailyChatTurns', '0').catch(err => {
                        console.error('Failed to update dailyChatTurns:', err);
                    });
                }
            }
        });
        return () => subscription?.remove();
    }, []);

    // 채팅 턴 수 초기화
    useEffect(() => {
        const checkAndResetChatTurns = async () => {
            try {
                const today = (() => {
                    const d = new Date();
                    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                })();

                const lastChatDate = await AsyncStorage.getItem('lastChatDate');
                const savedDailyTurns = await AsyncStorage.getItem('dailyChatTurns');

                if (lastChatDate !== today) {
                    useAppStore.setState({ dailyChatTurns: 0 });
                    await AsyncStorage.setItem('lastChatDate', today);
                    await AsyncStorage.setItem('dailyChatTurns', '0');
                } else if (savedDailyTurns) {
                    useAppStore.setState({ dailyChatTurns: parseInt(savedDailyTurns, 10) });
                }
            } catch (error) {
                console.error('Failed to check chat turns:', error);
            }
        };

        checkAndResetChatTurns();
    }, []);

    // Android Back Handler - getState()로 항상 최신 상태 읽음
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            const s = useAppStore.getState();

            if (s.activeConfirm) {
                useAppStore.setState({ activeConfirm: null, deleteItemId: null });
                return true;
            }
            if (s.showAnonymousModal) {
                useAppStore.setState({ showAnonymousModal: false });
                return true;
            }
            if (s.activeModal === 'resultSheet') {
                closeResultSheet();
                return true;
            }
            if (s.activeModal) {
                useAppStore.setState({ activeModal: null });
                return true;
            }
            if (s.currentTab !== 'home') {
                handleTabSwitch('home');
                return true;
            }
            return false;
        });

        return () => backHandler.remove();
    }, []);
}
