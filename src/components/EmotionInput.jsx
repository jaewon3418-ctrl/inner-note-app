import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import { View, Text } from 'react-native';
import { translations } from '../constants/translations';
import { styles } from '../styles/appStyles';
import AutoGrowInput from './AutoGrowInput';

// 감정 입력 컴포넌트 (App 밖으로 이동하여 재마운트 방지)
const EmotionInput = memo(function EmotionInput({ t, onSubmit, disabled, resetSeq, dailyCount, language, onTextChange, currentText }) {
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const inputRef = useRef(null);

    // 회전형 플레이스홀더 - 직접 translations 객체 사용
    const placeholders = useMemo(() => {
        const lang = language || 'ko';
        return [
            translations[lang].emotionPlaceholder1,
            translations[lang].emotionPlaceholder2,
            translations[lang].emotionPlaceholder3,
            translations[lang].emotionPlaceholder4,
        ];
    }, [language]);

    // resetSeq 변경 시에만 초기화
    useEffect(() => {
        if (resetSeq > 0) {
            onTextChange?.(''); // 리셋 시 부모 state도 초기화
        }
    }, [resetSeq, onTextChange]);

    // 플레이스홀더 로테이션은 별도 useEffect
    useEffect(() => {
        const interval = setInterval(() => {
            setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [placeholders.length]);

    const handleTextChange = (newText) => {
        onTextChange?.(newText);
    };


    return (
        <View style={styles.inputContainer}>
            {/* 외부 하얀 테두리 (디자인용) */}
            <View style={styles.inputBubbleOuter}>
                <AutoGrowInput
                    value={currentText}
                    onChangeText={handleTextChange}
                    minRows={1}
                    maxRows={8}
                    lineHeight={22}
                    placeholder=""
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    style={styles.emotionInputSimple}
                    maxLength={500}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    autoCorrect={false}
                    keyboardType="default"
                />
            </View>

            {/* 카운터 별도 행 */}
            <View style={styles.inputCounterRow}>
                <Text style={styles.dailyUsage}>{translations[language || 'ko'].dailyDiaryUsage}: {dailyCount}/1</Text>
                {currentText.length > 0 && (
                    <Text style={styles.charCount}>{currentText.length}/500</Text>
                )}
            </View>
        </View>
    );
});

export default EmotionInput;
