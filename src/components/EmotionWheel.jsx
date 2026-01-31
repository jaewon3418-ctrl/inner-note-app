import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EMOTIONS = [
  { key: 'JOY', emoji: '😊', label: { ko: '기쁨', en: 'Joy' }, color: ['#FFD93D', '#FFCC02'], angle: 0 },
  { key: 'EXCITED', emoji: '🤩', label: { ko: '신남', en: 'Excited' }, color: ['#FF6B9D', '#FF1744'], angle: 60 },
  { key: 'CALM', emoji: '😌', label: { ko: '평온', en: 'Calm' }, color: ['#6BCF7F', '#4CAF50'], angle: 120 },
  { key: 'NEUTRAL', emoji: '😐', label: { ko: '보통', en: 'Neutral' }, color: ['#A0AEC0', '#718096'], angle: 180 },
  { key: 'ANXIOUS', emoji: '😰', label: { ko: '불안', en: 'Anxious' }, color: ['#FF8A65', '#FF5722'], angle: 240 },
  { key: 'SAD', emoji: '😢', label: { ko: '슬픔', en: 'Sad' }, color: ['#5DADE2', '#2196F3'], angle: 300 },
];

const EmotionWheel = ({ onEmotionSelect, language = 'ko', selectedEmotion }) => {
  const [pressedEmotion, setPressedEmotion] = useState(null);
  
  const wheelSize = width * 0.75;
  const centerSize = wheelSize * 0.25;
  const emotionSize = wheelSize * 0.18;
  
  const getEmotionPosition = (angle) => {
    const radius = (wheelSize - emotionSize) / 2 - 20;
    const radian = (angle * Math.PI) / 180;
    return {
      x: radius * Math.cos(radian),
      y: radius * Math.sin(radian),
    };
  };

  return (
    <View style={[styles.wheelContainer, { width: wheelSize, height: wheelSize }]}>
      {/* 중앙 원 */}
      <LinearGradient
        colors={['#C9A962', '#B8985A']}
        style={[styles.centerCircle, { 
          width: centerSize, 
          height: centerSize,
          borderRadius: centerSize / 2 
        }]}
      >
        <Text style={styles.centerText}>
          {language === 'ko' ? '오늘의\n감정' : "Today's\nFeeling"}
        </Text>
      </LinearGradient>

      {/* 감정 버튼들 */}
      {EMOTIONS.map((emotion, index) => {
        const position = getEmotionPosition(emotion.angle);
        const isSelected = selectedEmotion === emotion.key;
        const isPressed = pressedEmotion === emotion.key;
        
        return (
          <TouchableOpacity
            key={emotion.key}
            style={[
              styles.emotionButton,
              {
                width: emotionSize,
                height: emotionSize,
                borderRadius: emotionSize / 2,
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { scale: isPressed ? 0.95 : isSelected ? 1.1 : 1.0 }
                ],
              }
            ]}
            onPress={() => onEmotionSelect(emotion.key)}
            onPressIn={() => setPressedEmotion(emotion.key)}
            onPressOut={() => setPressedEmotion(null)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={emotion.color}
              style={[styles.emotionGradient, { borderRadius: emotionSize / 2 }]}
            >
              <Text style={styles.emotionEmoji}>{emotion.emoji}</Text>
              <Text style={styles.emotionLabel}>
                {emotion.label[language]}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = {
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 20,
  },
  centerCircle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C9A962',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  centerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  emotionButton: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  emotionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  emotionEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  emotionLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
};

export default EmotionWheel;