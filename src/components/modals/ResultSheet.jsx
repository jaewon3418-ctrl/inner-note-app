import React from 'react';
import { Text, View, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../../styles/appStyles';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function ResultSheet({
    panResponder,
    sheetAnim,
    closeResultSheet,
}) {
    const { language, translate } = useLanguage();
    const visible = useAppStore(s => s.activeModal === 'resultSheet');
    const currentResult = useAppStore(s => s.currentResult);
    if (!visible) return null;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.resultSheet,
                { transform: [{ translateY: sheetAnim }] }
            ]}>
            <View style={styles.sheetContainer}>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetContent}>
                    <View style={styles.sheetBadge}>
                        <Text style={styles.sheetBadgeText}>
                            {language === 'ko' ? (currentResult?.emotion_ko || currentResult?.emotion) : (currentResult?.emotion_en || currentResult?.emotion)}
                        </Text>
                    </View>

                    {/* 1. 위로 (상태 분석 포함) */}
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetSectionTitle}>✨ {language === 'ko' ? '맞춤 분석' : 'Personalized Analysis'}</Text>
                        <Text style={styles.sheetSectionText}>
                            {language === 'ko' ? (currentResult?.comfort_ko || currentResult?.comfort) : (currentResult?.comfort_en || currentResult?.comfort)}
                        </Text>
                    </View>

                    {/* 2. 해결 방안 */}
                    <View style={styles.sheetSection}>
                        <Text style={styles.sheetSectionTitle}>💡 {language === 'ko' ? '해결 방안' : 'Solutions'}</Text>
                        {(() => {
                            const solutionText = language === 'ko' ? (currentResult?.solution_ko || currentResult?.solution) : (currentResult?.solution_en || currentResult?.solution);
                            const paragraphs = solutionText.split('\n\n').filter(p => p.trim());
                            return paragraphs.map((paragraph, index) => (
                                <Text key={index} style={[styles.sheetSectionText, { marginBottom: index < paragraphs.length - 1 ? 16 : 0 }]}>
                                    {paragraph.trim()}
                                </Text>
                            ));
                        })()}
                    </View>

                    <View style={styles.sheetButtons}>
                        <TouchableOpacity style={styles.sheetButton} onPress={closeResultSheet}>
                            <LinearGradient
                                colors={['#C9A962', '#B8985A']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.sheetButtonGradient}
                            >
                                <Text style={styles.sheetButtonText}>{translate('recordDone')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}
