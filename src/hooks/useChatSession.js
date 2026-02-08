import { useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store';
import { useTranslate } from '../store/selectors';
import { chatWithAI } from '../services/openai';
import { checkOpenAIConsent } from '../utils/secureStorage';
import { hapticSuccess } from '../utils/safeHaptics';

export default function useChatSession({ chatScrollViewRef, showToastMessage }) {
    const translate = useTranslate();

    const sendChatMessage = useCallback(async () => {
        const {
            chatInput, chatHistory, dailyChatTurns, sessionChatTurns,
            isPremium, language,
        } = useAppStore.getState();

        if (!chatInput.trim()) return;

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
                        onPress: () => useAppStore.setState({ showConsentScreen: true })
                    }
                ]
            );
            return;
        }

        useAppStore.setState({ isSubmitting: true });
        const userMessage = chatInput.trim();
        useAppStore.setState({ chatInput: '' });

        try {
            const newUserMsg = { role: 'user', text: userMessage, timestamp: Date.now() };
            useAppStore.setState({ chatHistory: [...chatHistory, newUserMsg] });

            setTimeout(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            const aiResponse = await chatWithAI(userMessage, chatHistory, language);

            const currentHistory = useAppStore.getState().chatHistory;
            const newAiMsg = { role: 'ai', text: aiResponse, timestamp: Date.now() };
            useAppStore.setState({ chatHistory: [...currentHistory, newAiMsg] });

            setTimeout(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);

            const newDailyTurns = dailyChatTurns + 1;
            const newSessionTurns = sessionChatTurns + 1;
            useAppStore.setState({ dailyChatTurns: newDailyTurns, sessionChatTurns: newSessionTurns });

            await AsyncStorage.setItem('dailyChatTurns', newDailyTurns.toString());

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
            const lang = useAppStore.getState().language;

            let errorMessage = '';
            if (error.message && error.message.includes('Network request failed')) {
                errorMessage = lang === 'ko'
                    ? '인터넷 연결을 확인해봐 📡'
                    : 'Please check your internet connection 📡';
            } else if (error.message && error.message.includes('API key')) {
                errorMessage = lang === 'ko'
                    ? 'API 키 오류야. 설정을 확인해봐!'
                    : 'API key error. Please check settings.';
            } else {
                errorMessage = lang === 'ko'
                    ? '잠시 후 다시 시도해봐 🔄'
                    : 'Please try again later 🔄';
            }

            showToastMessage(errorMessage, 'error');
        } finally {
            useAppStore.setState({ isSubmitting: false });
        }
    }, [chatScrollViewRef, showToastMessage]);

    return { sendChatMessage };
}
