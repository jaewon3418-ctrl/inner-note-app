import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, Share, Platform, ImageBackground } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

const WeeklyReport = ({ 
    emotionHistory = [], 
    streak = 0,
    language = 'ko',
    onReferralShare
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef();

    // 번역
    const t = (key) => {
        const translations = {
            ko: {
                weeklyReport: '주간 리포트',
                thisWeek: '이번 주',
                entries: '기록',
                days: '일',
                streak: '연속 기록',
                mostFrequent: '자주 느낀 감정',
                shareReport: '리포트 공유',
                inviteFriend: '친구 초대',
                generatingImage: '이미지 생성 중...',
                shareText: '내 감정 기록을 확인해보세요! INNER NOTE와 함께 마음 정리하고 있어요 ✨',
                referralText: 'INNER NOTE로 감정 기록하고 있어요! 당신도 함께해요 ✨\n\n✅ AI가 마음을 읽어주는 위로\n✅ 완전한 개인정보 보호\n✅ 30초로 끝나는 간편 기록\n\n'
            },
            en: {
                weeklyReport: 'Weekly Report',
                thisWeek: 'This Week',
                entries: 'entries',
                days: 'days',
                streak: 'Streak',
                mostFrequent: 'Most Frequent Emotion',
                shareReport: 'Share Report',
                inviteFriend: 'Invite Friend',
                generatingImage: 'Generating image...',
                shareText: 'Check out my emotion journal! Recording my feelings with INNER NOTE ✨',
                referralText: 'I\'m journaling my emotions with INNER NOTE! Join me ✨\n\n✅ AI that truly understands your heart\n✅ Complete privacy protection\n✅ 30-second quick journaling\n\n'
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
            Alert.alert('오류', '이미지 공유 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    // 친구 초대 링크 공유 (임시 단순 버전)
    const shareReferralLink = async () => {
        try {
            const appStoreUrl = Platform.OS === 'ios' 
                ? 'https://apps.apple.com/kr/app/inner-note-ai-%EA%B0%90%EC%A0%95%EC%9D%BC%EA%B8%B0/id6751752636'
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
            Alert.alert('오류', '공유 중 오류가 발생했습니다.');
        }
    };

    return (
        <View style={styles.container}>
            {/* 캡처할 리포트 영역 */}
            <View ref={reportRef} style={styles.reportCard}>
                <ImageBackground 
                    source={require('../../assets/weekly-report-bg.png')}
                    style={styles.backgroundImage}
                    imageStyle={styles.backgroundImageStyle}
                >
                <View style={styles.cardContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{t('weeklyReport')}</Text>
                        <Text style={styles.subtitle}>{t('thisWeek')}</Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="notebook-edit" size={24} color="#fff" />
                            <Text style={styles.statNumber}>{weeklyStats.entriesCount}</Text>
                            <Text style={styles.statLabel}>{t('entries')}</Text>
                        </View>

                        <View style={styles.statItem}>
                            <MaterialCommunityIcons name="fire" size={24} color="#FF6B35" />
                            <Text style={styles.statNumber}>{streak}</Text>
                            <Text style={styles.statLabel}>{t('days')}</Text>
                        </View>
                    </View>

                    {weeklyStats.mostFrequent && (
                        <View style={styles.emotionSection}>
                            <Text style={styles.emotionTitle}>{t('mostFrequent')}</Text>
                            <View style={styles.emotionBadge}>
                                <Text style={styles.emotionText}>{weeklyStats.mostFrequent}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.appBranding}>
                        <Text style={styles.appName}>INNER NOTE</Text>
                        <Text style={styles.appTagline}>마음을 기록하는 공간</Text>
                    </View>
                </View>
                </ImageBackground>
            </View>

            {/* 공유 버튼들 */}
            <View style={styles.shareButtons}>
                <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={shareAsImage}
                    disabled={isGenerating}
                >
                    <Ionicons name="image" size={20} color="#667eea" />
                    <Text style={styles.shareButtonText}>
                        {isGenerating ? t('generatingImage') : t('shareReport')}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.shareButton}
                    onPress={shareReferralLink}
                >
                    <Ionicons name="person-add" size={20} color="#667eea" />
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
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
    },
    backgroundImageStyle: {
        borderRadius: 20,
    },
    cardContent: {
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
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
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginVertical: 8,
    },
    statLabel: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
    },
    emotionSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    emotionTitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: 12,
    },
    emotionBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    emotionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    appBranding: {
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        paddingTop: 16,
    },
    appName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    appTagline: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    shareButtons: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 12,
    },
    shareButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    shareButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#667eea',
        marginLeft: 8,
    },
};

export default WeeklyReport;