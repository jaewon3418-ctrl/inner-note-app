import React from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Modal,
    Alert,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { hapticSuccess } from '../../utils/safeHaptics';
import { summarizeChat } from '../../services/openai';
import { styles } from '../../styles/appStyles';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function ChatScreen({
    sendChatMessage,
    chatScrollViewRef,
}) {
    const { language, translate } = useLanguage();
    const chatHistory = useAppStore(s => s.chatHistory);
    const setChatHistory = useAppStore(s => s.setChatHistory);
    const chatInput = useAppStore(s => s.chatInput);
    const setChatInput = useAppStore(s => s.setChatInput);
    const isSubmitting = useAppStore(s => s.isSubmitting);
    const dailyChatTurns = useAppStore(s => s.dailyChatTurns);
    const sessionChatTurns = useAppStore(s => s.sessionChatTurns);
    const isPremium = useAppStore(s => s.isPremium);
    const savedChatSessions = useAppStore(s => s.savedChatSessions);
    const setSavedChatSessions = useAppStore(s => s.setSavedChatSessions);
    const showChatHistory = useAppStore(s => s.activeModal === 'chatHistory');
    const openModal = useAppStore(s => s.openModal);
    const closeModal = useAppStore(s => s.closeModal);
    const currentSessionId = useAppStore(s => s.currentSessionId);
    const setCurrentSessionId = useAppStore(s => s.setCurrentSessionId);
    const setShowAnonymousModal = useAppStore(s => s.setShowAnonymousModal);
    const setSessionChatTurns = useAppStore(s => s.setSessionChatTurns);
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
                                        {translate('anonymousComfort')}
                                    </Text>
                                </View>
                            </View>
                            <TouchableOpacity
                                onPress={() => openModal('chatHistory')}
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
                                    {translate('turnsLeft')}: {remainingTurns}
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
                                        {translate('chatEmptyTitle')}
                                    </Text>
                                    <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.3)', marginTop: 8, textAlign: 'center' }}>
                                        {translate('chatEmptyDesc')}
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
                                placeholder={translate('chatPlaceholder')}
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
                            onRequestClose={() => closeModal()}
                        >
                            <View style={styles.chatHistoryModalContainer}>
                                <View style={styles.chatHistoryModalContent}>
                                    <View style={styles.chatHistoryBgContainer}>
                                        <View style={styles.chatHistoryHandle} />

                                        <View style={styles.chatHistoryHeader}>
                                            <Text style={styles.chatHistoryTitle}>
                                                {translate('chatHistoryTitle')}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => closeModal()}
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
                                                    {translate('noChatHistory')}
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
                                                            closeModal();
                                                        }}
                                                    >
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.chatHistoryItemTitle} numberOfLines={2}>
                                                                {session.title || session.preview || translate('chatHistoryFallback')}
                                                            </Text>
                                                            <Text style={styles.chatHistoryItemDate}>
                                                                {(() => {
                                                                    const date = new Date(session.timestamp);
                                                                    // timestamp 유효성 검증
                                                                    if (isNaN(date.getTime())) {
                                                                        return translate('invalidDate');
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
                                                                    translate('deleteChatTitle'),
                                                                    translate('deleteChatMessage'),
                                                                    [
                                                                        { text: translate('cancel'), style: 'cancel' },
                                                                        {
                                                                            text: translate('delete'),
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
