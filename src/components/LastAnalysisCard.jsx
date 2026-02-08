import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { EMOTIONS } from '../constants/design';

const LastAnalysisCard = ({ latestEntry, language = 'ko', onPress }) => {
    const sampleData = {
        ko: {
            emotion: '불안',
            emotionKey: 'ANXIOUS',
            intensity: 3,
            comfort: '요즘 많이 불안했구나. 그 마음 충분히 이해해. 네가 느끼는 감정은 자연스러운 거야.',
            text: '내일 발표가 있는데 너무 떨려...',
        },
        en: {
            emotion: 'Anxious',
            emotionKey: 'ANXIOUS',
            intensity: 3,
            comfort: 'I can see you\'ve been feeling anxious lately. That\'s completely natural and valid.',
            text: 'I have a presentation tomorrow and I\'m so nervous...',
        },
    };

    const isEmptyState = !latestEntry;
    const data = isEmptyState ? sampleData[language] || sampleData.ko : latestEntry;

    const emotionLabel = isEmptyState
        ? data.emotion
        : (language === 'ko' ? (data.emotion_ko || data.emotion) : (data.emotion_en || data.emotion));

    const emotionKey = data.emotionKey || 'OK';
    const emotionColor = EMOTIONS[emotionKey]?.color || '#C9A962';
    const intensity = data.intensity || 1;

    const comfortText = isEmptyState
        ? data.comfort
        : (language === 'ko' ? (data.comfort_ko || data.comfort || '') : (data.comfort_en || data.comfort || ''));

    const truncatedComfort = comfortText.length > 60
        ? comfortText.substring(0, 60) + '...'
        : comfortText;

    const t = language === 'ko' ? {
        sampleBadge: '미리보기',
        sampleCTA: '나도 분석받기',
        latestLabel: '최근 분석',
        intensityLabel: '강도',
    } : {
        sampleBadge: 'Preview',
        sampleCTA: 'Try it now',
        latestLabel: 'Latest',
        intensityLabel: 'Intensity',
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.container}
        >
            <View style={styles.header}>
                <Text style={styles.label}>
                    {isEmptyState ? t.sampleBadge : t.latestLabel}
                </Text>
                <View style={[styles.emotionBadge, { borderColor: emotionColor + '40' }]}>
                    <View style={[styles.emotionDot, { backgroundColor: emotionColor }]} />
                    <Text style={[styles.emotionText, { color: emotionColor }]}>
                        {emotionLabel}
                    </Text>
                    <Text style={styles.intensityText}>
                        {t.intensityLabel} {intensity}/5
                    </Text>
                </View>
            </View>

            {isEmptyState && (
                <Text style={styles.sampleInput}>"{data.text}"</Text>
            )}

            <Text style={styles.comfortText}>{truncatedComfort}</Text>

            {isEmptyState && (
                <Text style={{
                    fontSize: 13,
                    fontWeight: '400',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginBottom: 12,
                }}>
                    💡 {language === 'ko' ? '+ 맞춤 해결방안도 함께 제공돼요' : '+ Personalized solutions included'}
                </Text>
            )}

            <View style={styles.footer}>
                <Text style={styles.ctaText}>
                    {isEmptyState ? t.sampleCTA : ''}
                </Text>
                <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="rgba(255, 255, 255, 0.25)"
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = {
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.35)',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    emotionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    emotionDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    emotionText: {
        fontSize: 13,
        fontWeight: '500',
    },
    intensityText: {
        fontSize: 11,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.35)',
    },
    sampleInput: {
        fontSize: 13,
        fontWeight: '300',
        fontStyle: 'italic',
        color: 'rgba(255, 255, 255, 0.3)',
        marginBottom: 8,
    },
    comfortText: {
        fontSize: 14,
        fontWeight: '300',
        color: 'rgba(255, 255, 255, 0.6)',
        lineHeight: 22,
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ctaText: {
        fontSize: 13,
        fontWeight: '400',
        color: '#C9A962',
    },
};

export default LastAnalysisCard;
