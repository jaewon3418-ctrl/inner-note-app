import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Share, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

// 감정 매핑
const EMOTIONS = {
    JOY:     { ko: '기쁨',   en: 'Good',   color: '#4ADE80', order: 1 },
    CALM:    { ko: '평온',   en: 'Calm',   color: '#4ADE80', order: 2 },
    OK:      { ko: '무난',   en: 'Okay',   color: '#FBBF24', order: 3 },
    LONELY:  { ko: '외로움', en: 'Lonely', color: '#FBBF24', order: 4 },
    ANXIOUS: { ko: '불안',   en: 'Anxious', color: '#EF4444', order: 5 },
    SAD:     { ko: '슬픔',   en: 'Sad',    color: '#EF4444', order: 6 },
};

const WeeklyReport = ({
    emotionHistory = [],
    streak = 0,
    language = 'ko',
    onReferralShare
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef();

    // 감정 텍스트를 언어에 맞게 변환
    const getEmotionLabel = (emotionText) => {
        // emotionText가 한글이든 영어든, EMOTIONS에서 찾아서 현재 language로 변환
        for (const [key, value] of Object.entries(EMOTIONS)) {
            if (value.ko === emotionText || value.en === emotionText) {
                return language === 'ko' ? value.ko : value.en;
            }
        }
        return emotionText; // 못 찾으면 원본 반환
    };

    // 번역
    const t = (key) => {
        const translations = {
            ko: {
                weeklyReport: '주간 인사이트',
                thisWeek: '이번 주',
                entries: '기록 수',
                days: '연속 기록',
                streak: '연속 기록',
                mostFrequent: '자주 느낀 감정',
                shareReport: '리포트 공유',
                inviteFriend: '친구 초대',
                generatingImage: '이미지 생성 중...',
                shareText: 'DeepLog로 매일 기록하며 성장하는 중 ✨',
                referralText: '매일 기록하며 성장하는 중 ✨\n\n✅ 감정 패턴 분석과 인사이트\n✅ AI 기반 맞춤 조언\n✅ 완벽한 프라이버시 보호\n\n'
            },
            en: {
                weeklyReport: 'Weekly Insights',
                thisWeek: 'This week',
                entries: 'Entries',
                days: 'Day streak',
                streak: 'Streak',
                mostFrequent: 'Most Frequent Emotion',
                shareReport: 'Share Report',
                inviteFriend: 'Invite Friend',
                generatingImage: 'Generating image...',
                shareText: 'Check out my emotion journal! Recording my feelings with DeepLog ✨',
                referralText: 'I\'m journaling my emotions with DeepLog! Join me ✨\n\n✅ Don\'t suffer alone, just share for 1 minute\n✅ Your secret space nobody knows\n✅ Feel the real change as you write daily\n\n'
            }
        };
        return translations[language]?.[key] || key;
    };

    // 최근 7일간 데이터 분석
    const getWeeklyStats = () => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const thisWeekEntries = emotionHistory.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekAgo && entryDate <= now && !entry.deletedAt;
        });

        // 감정 빈도 분석
        const emotionCounts = {};
        thisWeekEntries.forEach(entry => {
            if (entry.emotion) {
                emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
            }
        });

        const mostFrequent = Object.keys(emotionCounts).length > 0 
            ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b)
            : null;

        return {
            entriesCount: thisWeekEntries.length,
            mostFrequent,
            emotionCounts
        };
    };

    const weeklyStats = getWeeklyStats();

    // 이미지 생성 및 공유
    const shareAsImage = async () => {
        try {
            setIsGenerating(true);
            
            const uri = await captureRef(reportRef, {
                format: 'png',
                quality: 0.8,
                result: 'tmpfile',
            });

            // 일반 이미지 공유 (리퍼럴 임시 비활성화)
            let shareResult;
            if (Platform.OS === 'ios') {
                shareResult = await Share.share({
                    url: uri,
                    message: t('shareText'),
                });
            } else {
                const shareOptions = {
                    title: t('weeklyReport'),
                    url: uri,
                    message: t('shareText'),
                };
                shareResult = await Share.share(shareOptions);
            }

            // 분석 이벤트 로깅
            if (onReferralShare) {
                onReferralShare('image');
            }

        } catch (error) {
            console.error('Error sharing image:', error);
            Alert.alert(
                language === 'ko' ? '오류' : 'Error',
                language === 'ko' ? '이미지 공유 중 오류가 났어' : 'An error occurred while sharing the image.'
            );
        } finally {
            setIsGenerating(false);
        }
    };

    // 친구 초대 링크 공유 (임시 단순 버전)
    const shareReferralLink = async () => {
        try {
            const appStoreUrl = Platform.OS === 'ios' 
                ? 'https://apps.apple.com/kr/app/deeplog-ai/id6751752636'
                : 'https://play.google.com/store/apps/details?id=com.wodnjs3418.TestApp';
            
            const shareOptions = {
                message: t('referralText') + appStoreUrl,
                title: t('inviteFriend'),
            };

            await Share.share(shareOptions);

            // 분석 이벤트 로깅
            if (onReferralShare) {
                onReferralShare('link');
            }

        } catch (error) {
            console.error('Error sharing referral:', error);
            Alert.alert(
                language === 'ko' ? '오류' : 'Error',
                language === 'ko' ? '공유 중 오류가 났어' : 'An error occurred while sharing.'
            );
        }
    };

    return (
        <View style={styles.container}>
            {/* 캡처할 리포트 영역 */}
            <View ref={reportRef} style={styles.reportCard}>
                <View style={styles.cardContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('weeklyReport')}</Text>
                        <Text style={styles.subtitle}>{t('thisWeek')}</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="notebook-edit" size={22} color="#C9A962" />
                            <Text style={styles.statNumber}>{weeklyStats.entriesCount}</Text>
                            <Text style={styles.statLabel}>{t('entries')}</Text>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="fire" size={22} color="#C9A962" />
                            <Text style={styles.statNumber}>{streak}</Text>
                            <Text style={styles.statLabel}>{t('days')}</Text>
                        </View>
                    </View>

                    {weeklyStats.mostFrequent && (
                        <View style={styles.emotionSection}>
                            <Text style={styles.emotionTitle}>{t('mostFrequent')}</Text>
                            <View style={styles.emotionBadge}>
                                <Text style={styles.emotionText}>{getEmotionLabel(weeklyStats.mostFrequent)}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.appBranding}>
                        <Text style={styles.appName}>DeepLog</Text>
                        <Text style={styles.appTagline}>Track your patterns</Text>
                    </View>
                </View>
            </View>

            {/* 공유 버튼들 */}
            <View style={styles.shareButtons}>
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={shareAsImage}
                    disabled={isGenerating}
                >
                    <Ionicons name="image" size={18} color="#C9A962" />
                    <Text style={styles.shareButtonText}>
                        {isGenerating ? t('generatingImage') : t('shareReport')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={shareReferralLink}
                >
                    <Ionicons name="person-add" size={18} color="#C9A962" />
                    <Text style={styles.shareButtonText}>{t('inviteFriend')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = {
    container: {
        // margin 제거로 다른 카드들과 너비 통일
    },
    reportCard: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    cardContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '300',
        color: '#fff',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '400',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: '300',
        color: '#fff',
        marginVertical: 8,
    },
    statLabel: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '400',
    },
    emotionSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    emotionTitle: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 12,
        fontWeight: '400',
    },
    emotionBadge: {
        backgroundColor: 'rgba(201, 169, 98, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.25)',
    },
    emotionText: {
        fontSize: 15,
        fontWeight: '500',
        color: '#C9A962',
    },
    appBranding: {
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.06)',
        paddingTop: 16,
    },
    appName: {
        fontSize: 16,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 4,
    },
    appTagline: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.4)',
        fontWeight: '400',
    },
    shareButtons: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    shareButtonText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#C9A962',
        marginLeft: 8,
    },
};

export default WeeklyReport;