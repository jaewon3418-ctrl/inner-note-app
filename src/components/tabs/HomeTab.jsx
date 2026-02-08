import React from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DESIGN } from '../../constants/design';
import { translations } from '../../constants/translations';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';
import PromptChips from '../PromptChips';
import LastAnalysisCard from '../LastAnalysisCard';

export default function HomeTab({
    currentInputText,
    handleInputTextChange,
    submitEmotion,
    scrollViewRef,
    inputRef,
}) {
        const { language, translate } = useLanguage();
        const emotionHistory = useAppStore(s => s.emotionHistory);
        const isSubmitting = useAppStore(s => s.isSubmitting);
        const setShowAnonymousModal = useAppStore(s => s.setShowAnonymousModal);
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
        const latestEntry = emotionHistory.filter(e => !e.deletedAt)[0] || null;
        // 날짜 기반 트리거 질문 & 인사말 로테이션
        const today = new Date();
        const dayIndex = (today.getFullYear() * 366 + today.getMonth() * 31 + today.getDate());
        const triggerQuestions = translations[language]?.homeTriggerQuestions || translations.ko.homeTriggerQuestions;
        const todayQuestion = triggerQuestions[dayIndex % triggerQuestions.length];
        const greetings = translations[language]?.homeGreetings || translations.ko.homeGreetings;
        const todayGreeting = greetings[dayIndex % greetings.length];

        const handleChipSelect = (text) => {
            handleInputTextChange(text);
            setTimeout(() => inputRef?.current?.focus(), 100);
        };

        const isActive = currentInputText.trim().length > 0;

        return (
            <View style={{ flex: 1, backgroundColor: '#0D1117' }}>
                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        flexGrow: 1,
                        paddingHorizontal: 28,
                        paddingTop: 80,
                        paddingBottom: 40,
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
                            {todayGreeting}
                        </Text>
                    </View>

                    {/* 감정 프롬프트 칩 */}
                    <View style={{ marginBottom: 16 }}>
                        <PromptChips
                            onPromptSelect={handleChipSelect}
                            language={language}
                        />
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
                            placeholder={todayQuestion}
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
                                {translate('streakLabel')}
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
                                {translate('entriesLabel')}
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
                            marginBottom: 24,
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
                                {translate('openUp')}
                            </Text>
                            <Text style={{
                                fontSize: 12,
                                fontWeight: '400',
                                color: 'rgba(255, 255, 255, 0.35)',
                            }}>
                                {translate('talkFreely')}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.25)" />
                    </TouchableOpacity>

                    {/* 최근 감정 분석 / 미리보기 카드 */}
                    <LastAnalysisCard
                        latestEntry={latestEntry}
                        language={language}
                        onPress={() => {
                            if (!latestEntry) {
                                inputRef?.current?.focus();
                            }
                        }}
                    />

                </ScrollView>
            </View>
        );

}
