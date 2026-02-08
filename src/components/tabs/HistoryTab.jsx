import React from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../../styles/appStyles';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function HistoryTab({
    emotionHistory,
    searchQuery,
    setSearchQuery,
    cardFadeAnim,
    getFilteredHistory,
    confirmDelete,
    formatLocalizedDate,
}) {
        const openModal = useAppStore(s => s.openModal);
        const { language, translate } = useLanguage();
        const filteredHistory = getFilteredHistory();
        const hasAnyRecords = emotionHistory.filter(e => !e.deletedAt).length > 0;

        return (
            <View style={{ flex: 1 }}>
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={!hasAnyRecords ? {
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
                        {/* 기록이 하나도 없을 때 - 따뜻한 빈 상태 */}
                        {!hasAnyRecords ? (
                            <Animated.View style={{ opacity: cardFadeAnim, alignItems: 'center', paddingHorizontal: 40 }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: 'rgba(201, 169, 98, 0.1)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 24
                                }}>
                                    <Ionicons name="book-outline" size={36} color="#C9A962" />
                                </View>
                                <Text style={{
                                    color: '#FFFFFF',
                                    fontSize: 20,
                                    fontWeight: '300',
                                    letterSpacing: 0.5,
                                    marginBottom: 12,
                                    textAlign: 'center'
                                }}>
                                    {language === 'ko' ? '아직 기록이 없어' : 'No entries yet'}
                                </Text>
                                <Text style={{
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: 15,
                                    fontWeight: '400',
                                    textAlign: 'center',
                                    lineHeight: 24
                                }}>
                                    {language === 'ko'
                                        ? '오늘 하루는 어땠어?\n첫 번째 기록을 남겨봐'
                                        : 'How was your day?\nStart your first entry'}
                                </Text>
                            </Animated.View>
                        ) : (
                            /* 헤더 영역 - 기록이 있을 때 표시 */
                            <>
                                <View style={styles.newHomeHeader}>
                                    <Text style={[styles.newHomeGreeting, { fontSize: 28, fontWeight: '200' }]}>
                                        {translate('tabHistory')}
                                    </Text>
                                </View>
                                {/* 검색 영역 */}
                                <Animated.View
                                    style={{
                                        opacity: cardFadeAnim,
                                        width: '100%',
                                        alignSelf: 'center',
                                        marginVertical: 16
                                    }}
                                >
                                    <View style={{
                                        width: '100%',
                                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                        borderRadius: 12,
                                        padding: 14,
                                        marginBottom: 20,
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                        flexDirection: 'row',
                                        alignItems: 'center'
                                    }}>
                                        <Ionicons name="search" size={18} color="rgba(255, 255, 255, 0.5)" />
                                        <TextInput
                                            style={{ flex: 1, marginLeft: 12, color: '#fff', fontSize: 15, fontWeight: '400' }}
                                            placeholder={translate('searchPlaceholder')}
                                            placeholderTextColor="rgba(255, 255, 255, 0.7)"
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                        />
                                        <TouchableOpacity
                                            onPress={() => openModal('trash')}
                                            style={{ marginLeft: 12, padding: 4 }}
                                        >
                                            <Ionicons name="trash-outline" size={18} color="rgba(255, 255, 255, 0.4)" />
                                        </TouchableOpacity>
                                    </View>
                                </Animated.View>

                                {/* 검색 결과 없을 때 */}
                                {filteredHistory.length === 0 && searchQuery.length > 0 && (
                                    <Animated.View style={{ opacity: cardFadeAnim, alignItems: 'center', paddingVertical: 40 }}>
                                        <Ionicons name="search-outline" size={48} color="rgba(255, 255, 255, 0.2)" />
                                        <Text style={{
                                            color: 'rgba(255, 255, 255, 0.5)',
                                            fontSize: 15,
                                            fontWeight: '400',
                                            marginTop: 16,
                                            textAlign: 'center'
                                        }}>
                                            {language === 'ko' ? '검색 결과가 없어' : 'No results found'}
                                        </Text>
                                    </Animated.View>
                                )}

                                {/* 기록 카드들 */}
                                {filteredHistory.slice(0, 10).map((item, index) => (
                                    <Animated.View key={item.id} style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                                        <View
                                            style={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                borderRadius: 16,
                                                padding: 20,
                                                width: '100%',
                                                borderWidth: 1,
                                                borderColor: 'rgba(255, 255, 255, 0.06)'
                                            }}
                                        >
                                            {/* 기록 헤더 */}
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '400', letterSpacing: 0.3 }}>
                                                    {formatLocalizedDate(item.date, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        weekday: 'short'
                                                    })}
                                                </Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                    <View style={{
                                                        backgroundColor: 'rgba(201, 169, 98, 0.15)',
                                                        paddingHorizontal: 12,
                                                        paddingVertical: 6,
                                                        borderRadius: 20,
                                                        borderWidth: 1,
                                                        borderColor: 'rgba(201, 169, 98, 0.25)'
                                                    }}>
                                                        <Text style={{ color: '#C9A962', fontSize: 12, fontWeight: '500' }}>
                                                            {language === 'ko' ? (item.emotion_ko || item.emotion) : (item.emotion_en || item.emotion)}
                                                        </Text>
                                                    </View>
                                                    <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                                                        <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.3)" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>

                                            {/* 기록 내용 */}
                                            <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 15, lineHeight: 24, fontWeight: '400' }}>
                                                {item.text}
                                            </Text>

                                            {/* 위로의 말 */}
                                            {item.comfort && (
                                                <View style={{
                                                    marginTop: 16,
                                                    padding: 16,
                                                    backgroundColor: 'rgba(201, 169, 98, 0.08)',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(201, 169, 98, 0.15)'
                                                }}>
                                                    <Text style={{ color: '#C9A962', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>
                                                        {language === 'ko' ? '✨ 맞춤 분석' : '✨ Analysis'}
                                                    </Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, fontWeight: '400' }}>
                                                        {language === 'ko' ? (item.comfort_ko || item.comfort) : (item.comfort_en || item.comfort)}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* 해결 방안 */}
                                            {item.solution && (
                                                <View style={{
                                                    marginTop: 12,
                                                    padding: 16,
                                                    backgroundColor: 'rgba(201, 169, 98, 0.05)',
                                                    borderRadius: 12,
                                                    borderWidth: 1,
                                                    borderColor: 'rgba(201, 169, 98, 0.1)'
                                                }}>
                                                    <Text style={{ color: '#C9A962', fontSize: 13, marginBottom: 8, fontWeight: '500' }}>
                                                        {language === 'ko' ? '💡 해결 방안' : '💡 Solutions'}
                                                    </Text>
                                                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, fontWeight: '400' }}>
                                                        {language === 'ko' ? (item.solution_ko || item.solution) : (item.solution_en || item.solution)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </Animated.View>
                                ))}
                            </>
                        )}
                    </View>
                </ScrollView>
            </View>
        );

}
