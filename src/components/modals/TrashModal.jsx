import React from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TRASH_TTL_DAYS } from '../../constants/helplines';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function TrashModal({
    getTrashItems,
    restoreEntry,
    deleteForever,
    formatLocalizedDate,
}) {
    const { language, translate } = useLanguage();
    const visible = useAppStore(s => s.activeModal === 'trash');
    const closeModal = useAppStore(s => s.closeModal);
    if (!visible) return null;

    const trashItems = getTrashItems();

    return (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000, backgroundColor: '#0D1117' }]}>
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* 헤더 */}
                <View style={s.header}>
                    <Text style={s.headerTitle}>{translate('trash')}</Text>
                    <TouchableOpacity onPress={() => closeModal()} style={s.closeButton}>
                        <Ionicons name="close" size={20} color="rgba(255, 255, 255, 0.6)" />
                    </TouchableOpacity>
                </View>

                {/* 자동 삭제 안내 */}
                {trashItems.length > 0 && (
                    <View style={s.notice}>
                        <Ionicons name="time-outline" size={14} color="rgba(255, 255, 255, 0.35)" />
                        <Text style={s.noticeText}>
                            {translate('trashAutoDelete', { days: TRASH_TTL_DAYS })}
                        </Text>
                    </View>
                )}

                {/* 목록 */}
                <FlatList
                    data={trashItems}
                    keyExtractor={item => item.id}
                    removeClippedSubviews={true}
                    windowSize={5}
                    maxToRenderPerBatch={5}
                    initialNumToRender={5}
                    contentContainerStyle={trashItems.length === 0
                        ? { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20 }
                        : { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 }
                    }
                    renderItem={({ item }) => (
                        <View style={s.card}>
                            {/* 카드 헤더 */}
                            <View style={s.cardHeader}>
                                <Text style={s.cardDate}>
                                    {formatLocalizedDate(item.date, {
                                        month: 'short',
                                        day: 'numeric',
                                        weekday: 'short',
                                    })}
                                </Text>
                                <View style={s.emotionBadge}>
                                    <Text style={s.emotionText}>
                                        {language === 'ko' ? (item.emotion_ko || item.emotion) : (item.emotion_en || item.emotion)}
                                    </Text>
                                </View>
                            </View>

                            {/* 본문 */}
                            <Text style={s.cardBody} numberOfLines={2}>{item.text}</Text>

                            {/* 액션 버튼 */}
                            <View style={s.actions}>
                                <TouchableOpacity
                                    style={s.restoreBtn}
                                    onPress={() => restoreEntry(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="arrow-undo-outline" size={15} color="#C9A962" />
                                    <Text style={s.restoreBtnText}>{translate('restore')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={s.deleteBtn}
                                    onPress={() => deleteForever(item.id)}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                                    <Text style={s.deleteBtnText}>{translate('deleteForever')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={s.empty}>
                            <View style={s.emptyIcon}>
                                <Ionicons name="trash-outline" size={32} color="rgba(255, 255, 255, 0.2)" />
                            </View>
                            <Text style={s.emptyTitle}>{translate('trashEmpty')}</Text>
                            <Text style={s.emptyDesc}>
                                {translate('trashAutoDelete', { days: TRASH_TTL_DAYS })}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const s = {
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '200',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    notice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    noticeText: {
        fontSize: 12,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.35)',
        letterSpacing: 0.2,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardDate: {
        fontSize: 13,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.4)',
        letterSpacing: 0.3,
    },
    emotionBadge: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.25)',
    },
    emotionText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#C9A962',
    },
    cardBody: {
        fontSize: 15,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 22,
        marginBottom: 16,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    restoreBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(201, 169, 98, 0.08)',
        borderRadius: 10,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.15)',
    },
    restoreBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#C9A962',
    },
    deleteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderRadius: 10,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    deleteBtnText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#EF4444',
    },
    empty: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '300',
        color: '#FFFFFF',
        letterSpacing: 0.3,
        marginBottom: 10,
    },
    emptyDesc: {
        fontSize: 14,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.4)',
        textAlign: 'center',
        lineHeight: 20,
    },
};
