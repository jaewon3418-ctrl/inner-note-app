import { useCallback } from 'react';
import { Alert, Animated, Dimensions, Keyboard } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store';
import { maybeRequestReview } from '../utils/storeReview';
import { useTranslate } from '../store/selectors';
import { analyzeEmotion } from '../services/openai';
import { checkOpenAIConsent } from '../utils/secureStorage';
import { hapticSuccess, safeHapticImpact } from '../utils/safeHaptics';
import { getLocalDateKey } from '../utils/dateUtils';
import { toEmotionKey } from '../constants/design';
import analytics from '../utils/analytics';

const { height } = Dimensions.get('window');

export default function useEmotionAnalysis({
    showToastMessage,
    sheetAnim,
    scrollViewRef,
    selectedQuickEmotion,
    setSelectedQuickEmotion,
    setInputResetSeq,
    setCurrentInputText,
    anonymousText,
    setAnonymousResult,
}) {
    const translate = useTranslate();

    const performEmotionAnalysis = useCallback(async (inputText) => {
        const { dailyDiaryCount, userName } = useAppStore.getState();

        if (dailyDiaryCount >= 1) {
            showToastMessage(translate('dailyLimitReached'), 'error');
            return;
        }

        const hasOpenAIConsent = await checkOpenAIConsent();
        if (!hasOpenAIConsent) {
            Alert.alert(
                translate('consentRequiredTitle'),
                translate('consentAnalysisMessage'),
                [
                    { text: translate('cancel'), style: 'cancel' },
                    {
                        text: translate('agree'),
                        style: 'default',
                        onPress: () => useAppStore.setState({ showConsentScreen: true })
                    }
                ]
            );
            return;
        }

        useAppStore.setState({ isSubmitting: true });
        safeHapticImpact('Light');
        analytics.logWriteSubmit(inputText, inputText ? inputText.length : 0);

        try {
            const analysis = await analyzeEmotion(inputText, false, userName);

            const now = new Date();
            const newEntry = {
                id: Date.now().toString(),
                date: now.toISOString(),
                dateKey: getLocalDateKey(now),
                text: inputText,
                quickEmotion: selectedQuickEmotion,
                ...analysis,
                emotionKey: analysis?.emotionKey || toEmotionKey(analysis?.emotion || selectedQuickEmotion),
                deletedAt: null,
            };

            useAppStore.setState(state => {
                const updatedHistory = [newEntry, ...state.emotionHistory];

                const totalRecords = updatedHistory.filter(entry => !entry.deletedAt).length;
                setTimeout(() => maybeRequestReview(totalRecords, {
                    title: translate('satisfactionTitle'),
                    message: translate('satisfactionMessage'),
                    yes: translate('satisfactionYes'),
                    no: translate('satisfactionNo'),
                    feedbackSubject: translate('feedbackSubject'),
                }).catch(() => {}), 2000);

                return { emotionHistory: updatedHistory };
            });
            useAppStore.setState({ currentResult: analysis });

            analytics.logAiReplyView(
                analysis?.emotion || selectedQuickEmotion || 'unknown',
                analysis?.action ? analysis.action.length : 0
            );

            const todayKey = getLocalDateKey();
            useAppStore.setState({ dailyDiaryCount: 1, lastDiaryDate: todayKey });

            // 스트릭 업데이트
            const lastRecordDateKey = await AsyncStorage.getItem('lastRecordDateKey');
            if (lastRecordDateKey === todayKey) {
                // 이미 오늘 기록 있음
            } else {
                const yesterdayKey = getLocalDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
                if (lastRecordDateKey === yesterdayKey) {
                    useAppStore.setState(state => {
                        const newStreak = state.streak + 1;
                        analytics.logStreakIncrement(newStreak);
                        return { streak: newStreak };
                    });
                } else {
                    useAppStore.setState({ streak: 1 });
                    analytics.logStreakIncrement(1);
                }
                await AsyncStorage.setItem('lastRecordDateKey', todayKey);
            }

            setSelectedQuickEmotion(null);
            hapticSuccess();

            const surpriseMessages = translate('surpriseMessages');
            const isRandomSurprise = Math.random() < 0.2;
            const message = isRandomSurprise
                ? surpriseMessages[Math.floor(Math.random() * surpriseMessages.length)]
                : translate('recordSaved');
            showToastMessage(message);

            setInputResetSeq(s => s + 1);
            setCurrentInputText('');

            useAppStore.setState({ activeModal: 'resultSheet' });

            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 100);

            Animated.spring(sheetAnim, {
                toValue: 0,
                friction: 8,
                useNativeDriver: true,
            }).start();

        } catch (error) {
            console.error('Emotion analysis error:', error);
            if (error.message?.includes('fetch') || error.message?.includes('network') || error.name === 'TypeError') {
                showToastMessage(translate('networkError'), 'error');
            } else {
                console.log('Non-network error, analysis might have succeeded:', error);
            }
        } finally {
            useAppStore.setState({ isSubmitting: false });
        }
    }, [showToastMessage, translate, selectedQuickEmotion, sheetAnim, scrollViewRef, setSelectedQuickEmotion, setInputResetSeq, setCurrentInputText]);

    const closeResultSheet = useCallback(() => {
        const shouldShowCrisisModal = useAppStore.getState().currentResult?.isCrisis;

        Animated.timing(sheetAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            useAppStore.setState({ activeModal: null, currentResult: null });

            if (shouldShowCrisisModal) {
                setTimeout(() => {
                    useAppStore.setState({ activeModal: 'crisis' });
                }, 100);
            }
        });
    }, [sheetAnim]);

    const submitEmotion = useCallback(async (inputText) => {
        Keyboard.dismiss();
        const { isSubmitting } = useAppStore.getState();
        if (isSubmitting || !inputText?.trim()) return;

        if (inputText.trim().length < 20) {
            useAppStore.setState({ activeConfirm: 'shortDiary' });
            return;
        }

        await performEmotionAnalysis(inputText);
    }, [performEmotionAnalysis]);

    const performAnonymousAnalysis = useCallback(async () => {
        const { dailyAnonymousCount, userName } = useAppStore.getState();

        if (dailyAnonymousCount >= 3) {
            showToastMessage(translate('dailyComfortLimitReached'), 'error');
            return;
        }

        const hasOpenAIConsent = await checkOpenAIConsent();
        if (!hasOpenAIConsent) {
            Alert.alert(
                translate('consentRequiredTitle'),
                translate('consentComfortMessage'),
                [
                    { text: translate('cancel'), style: 'cancel' },
                    {
                        text: translate('agree'),
                        style: 'default',
                        onPress: () => useAppStore.setState({ showConsentScreen: true })
                    }
                ]
            );
            return;
        }

        useAppStore.setState({ isSubmitting: true });
        try {
            const result = await analyzeEmotion(anonymousText, true, userName);
            setAnonymousResult(result);
            useAppStore.setState(state => ({ dailyAnonymousCount: state.dailyAnonymousCount + 1 }));
            showToastMessage(translate('comfortReceived'));
            hapticSuccess();
        } catch (error) {
            showToastMessage(translate('retryLater'), 'error');
        } finally {
            useAppStore.setState({ isSubmitting: false });
        }
    }, [anonymousText, showToastMessage, translate, setAnonymousResult]);

    return { performEmotionAnalysis, closeResultSheet, submitEmotion, performAnonymousAnalysis };
}
