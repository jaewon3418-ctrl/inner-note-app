import React from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    Animated,
    Platform,
    Keyboard,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { DESIGN, EMOTIONS, toEmotionKey } from '../../constants/design';
import { styles } from '../../styles/appStyles';
import WeeklyReport from '../WeeklyReport2';
import StreakCalendar from '../StreakCalendar';
import SparseSample from '../SparseSample';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';
import { getLocalDateKey } from '../../utils/dateUtils';

export default function InsightsTab({
    cardFadeAnim,
    toggleActivityCompletion,
    getDailyActivities,
}) {
        const { language, translate } = useLanguage();
        const emotionHistory = useAppStore(s => s.emotionHistory);
        const streak = useAppStore(s => s.streak);
        const recoveryTokens = useAppStore(s => s.recoveryTokens);
        const completedActivities = useAppStore(s => s.completedActivities);
        const recentData = emotionHistory
            .filter(e => !e.deletedAt)
            .slice(0, 7);

        const emotionCounts = recentData.reduce((acc, curr) => {
            const key = curr.emotionKey || toEmotionKey(curr.emotion);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});

        const totalRecords = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
        // 7일 전부터 오늘까지의 날짜 키들 생성
        const last7DaysKeys = Array.from({length: 7}, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return getLocalDateKey(date);
        });
        
        const weeklyInputs = emotionHistory
            .filter(e => !e.deletedAt && (
                (e.dateKey && last7DaysKeys.includes(e.dateKey)) ||
                (!e.dateKey && new Date(e.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            )).length;

        return (
            <ScrollView 
                keyboardShouldPersistTaps="never" 
                style={{ flex: 1 }} 
                showsVerticalScrollIndicator={false} 
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} 
                onTouchStart={Keyboard.dismiss} 
                onScrollBeginDrag={Keyboard.dismiss}
                contentContainerStyle={{ 
                    paddingTop: 20,
                    paddingBottom: 120
                }}
            >
                {/* 메인 컨텐츠 */}
                <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
                    {/* 헤더 영역 */}
                    <View style={styles.newHomeHeader}>
                        <Text style={[styles.newHomeGreeting, { fontSize: 28, fontWeight: '200' }]}>
                            {translate('insights')}
                        </Text>
                    </View>

                    {/* 주간 리포트 카드 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                        <WeeklyReport 
                            emotionHistory={emotionHistory}
                            streak={streak}
                            language={language}
                        />
                    </Animated.View>

                    {/* 스트릭 캘린더 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                        <View
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                        >
                            <StreakCalendar
                                emotionHistory={emotionHistory}
                                streak={streak}
                                recoveryTokens={recoveryTokens}
                                language={language}
                            />
                        </View>
                    </Animated.View>

                    {/* 주간 감정 분포 */}
                    <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                        <View
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                        >
                        <View style={{ alignItems: 'center', marginBottom: 16 }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300', textAlign: 'center', letterSpacing: 0.5 }}>
                                {translate('emotionDistribution')}
                            </Text>
                            {totalRecords > 0 && totalRecords < 3 && (
                                <View style={{ marginTop: 8 }}>
                                    <SparseSample language={language} />
                                </View>
                            )}
                        </View>

                        {totalRecords === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                                <View style={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 28,
                                    backgroundColor: 'rgba(201, 169, 98, 0.1)',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <Ionicons name="bar-chart-outline" size={24} color="#C9A962" />
                                </View>
                                <Text style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: 14,
                                    fontWeight: '400',
                                    textAlign: 'center',
                                    lineHeight: 22
                                }}>
                                    {translate('weeklyRecordPrompt')}
                                </Text>
                            </View>
                        ) : (
                            <>
                                <View style={styles.emotionDistribution}>
                                    {Object.entries(emotionCounts).map(([key, count]) => {
                                        const meta = EMOTIONS[key] || EMOTIONS.OK;
                                        const label = language === 'ko' ? meta.ko : meta.en;
                                        return (
                                            <View key={key} style={styles.emotionStat}>
                                                <Text style={[styles.emotionStatLabel, null]}>{label}</Text>
                                            <View style={styles.emotionStatBar}>
                                                <LinearGradient
                                                    colors={['#C9A962', '#B8985A']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={[
                                                        styles.emotionStatFill,
                                                        { width: `${(count / totalRecords) * 100}%` }
                                                    ]}
                                                />
                                            </View>
                                                <Text style={[styles.emotionStatCount, null]}>
                                                    {language === 'ko' ? `${count}회` : `${count} ${count === 1 ? 'time' : 'times'}`}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>

                                <View style={styles.insightSummary}>
                                    <Text style={styles.insightSummaryText}>
                                        {translate('mostFrequentEmotion')}: {(() => {
                                            const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
                                            if (!topEmotion) return '';
                                            const meta = EMOTIONS[topEmotion[0]] || EMOTIONS.OK;
                                            return language === 'ko' ? meta.ko : meta.en;
                                        })()}
                                    </Text>
                                </View>
                            </>
                        )}
                        </View>
                    </Animated.View>

                    {/* 나를 살린 문장 */}
                    {recentData.length > 0 && (
                        <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                            <View
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                            >
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: '400', textAlign: 'center', letterSpacing: 0.5 }}>
                                        {translate('weeklyQuote')}
                                    </Text>
                                </View>

                                <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
                                    <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 15, fontWeight: '400', lineHeight: 26, textAlign: 'center', fontStyle: 'italic' }}>
                                        "{language === 'ko' ? (recentData[0]?.comfort_ko || recentData[0]?.comfort || '네 마음을 소중히 여겨') : (recentData[0]?.comfort_en || recentData[0]?.comfort || 'Take care of your precious heart.')}"
                                    </Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}

                    {/* 행동 추천 */}
                    {recentData.length > 0 && (
                        <Animated.View style={{ opacity: cardFadeAnim, marginBottom: 16, width: '100%', alignSelf: 'center' }}>
                            <View
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 16, padding: 20, width: '100%', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' }}
                            >
                            <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 13, fontWeight: '400', marginBottom: 16, letterSpacing: 0.5 }}>
                                {translate('weeklyRecommendedActivities')}
                            </Text>
                            <View style={{ gap: 12 }}>
                                {getDailyActivities.map((activity) => (
                                    <TouchableOpacity
                                        key={activity.id}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                            borderRadius: 12,
                                            padding: 14,
                                            borderWidth: 1,
                                            borderColor: completedActivities[activity.id] ? 'rgba(201, 169, 98, 0.3)' : 'rgba(255, 255, 255, 0.06)'
                                        }}
                                        onPress={() => toggleActivityCompletion(activity.id)}
                                    >
                                        <View style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 18,
                                            backgroundColor: completedActivities[activity.id] ? 'rgba(201, 169, 98, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12
                                        }}>
                                            <Ionicons name={activity.icon} size={18} color={completedActivities[activity.id] ? '#C9A962' : 'rgba(255, 255, 255, 0.5)'} />
                                        </View>
                                        <Text style={{
                                            flex: 1,
                                            color: completedActivities[activity.id] ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
                                            fontSize: 14,
                                            fontWeight: '400'
                                        }}>
                                            {activity.text}
                                        </Text>
                                        <View style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: completedActivities[activity.id] ? '#C9A962' : 'transparent',
                                            borderWidth: 1.5,
                                            borderColor: completedActivities[activity.id] ? '#C9A962' : 'rgba(255, 255, 255, 0.2)',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {completedActivities[activity.id] && (
                                                <Ionicons name="checkmark" size={14} color="#0D1117" />
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            </View>
                        </Animated.View>
                    )}

                </View>
            </ScrollView>
        );

}
