import React, { useEffect, useState } from 'react';
import { View, Text, Animated } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const EnhancedBearCharacter = ({ 
  mood = 'NEUTRAL', 
  name = '친구', 
  level = 1, 
  language = 'ko',
  onCharacterPress 
}) => {
  const [bounceAnim] = useState(new Animated.Value(0));
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // 캐릭터 바운스 애니메이션
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 글로우 효과
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const getMoodMessage = () => {
    const messages = {
      ko: {
        JOY: `${name}이 기뻐보여요! 😊`,
        EXCITED: `${name}이 신나해요! 🤩`, 
        CALM: `${name}이 평온해요 😌`,
        NEUTRAL: `${name}과 함께해요 😐`,
        ANXIOUS: `${name}을 달래줄게요 😰`,
        SAD: `${name}을 위로해줄게요 😢`,
      },
      en: {
        JOY: `${name} looks happy! 😊`,
        EXCITED: `${name} is excited! 🤩`,
        CALM: `${name} feels calm 😌`, 
        NEUTRAL: `With ${name} 😐`,
        ANXIOUS: `I'll comfort ${name} 😰`,
        SAD: `I'll cheer up ${name} 😢`,
      }
    };
    return messages[language][mood] || messages[language].NEUTRAL;
  };

  const getMoodColors = () => {
    const colorMap = {
      JOY: ['#FFD93D', '#FFCC02'],
      EXCITED: ['#FF6B9D', '#FF1744'],
      CALM: ['#6BCF7F', '#4CAF50'],
      NEUTRAL: ['#A0AEC0', '#718096'],
      ANXIOUS: ['#FF8A65', '#FF5722'],
      SAD: ['#5DADE2', '#2196F3'],
    };
    return colorMap[mood] || colorMap.NEUTRAL;
  };

  const bounceTransform = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  return (
    <View style={styles.container}>
      {/* 글로우 효과 */}
      <Animated.View 
        style={[
          styles.glowCircle,
          { 
            opacity: glowOpacity,
            shadowColor: getMoodColors()[0],
          }
        ]}
      />

      {/* 캐릭터 */}
      <Animated.View 
        style={[
          styles.characterContainer,
          { transform: [{ translateY: bounceTransform }] }
        ]}
      >
        <LottieView
          source={require('../../assets/animations/otro_oso_cropped.json')}
          autoPlay
          loop
          style={styles.character}
        />
        
        {/* 레벨 배지 */}
        <View style={styles.levelBadge}>
          <LinearGradient
            colors={getMoodColors()}
            style={styles.levelGradient}
          >
            <Text style={styles.levelText}>Lv.{level}</Text>
          </LinearGradient>
        </View>
      </Animated.View>

      {/* 말풍선 */}
      <View style={styles.speechBubble}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.speechGradient}
        >
          <Text style={styles.speechText}>{getMoodMessage()}</Text>
          <View style={styles.bubbleTail} />
        </LinearGradient>
      </View>

      {/* 감정 상태 표시 */}
      <View style={styles.moodIndicator}>
        <LinearGradient
          colors={getMoodColors()}
          style={styles.moodGradient}
        >
          <Text style={styles.moodText}>
            {language === 'ko' ? '현재 감정' : 'Current Mood'}
          </Text>
        </LinearGradient>
      </View>
    </View>
  );
};

const styles = {
  container: {
    alignItems: 'center',
    marginVertical: 20,
  },
  glowCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  characterContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  character: {
    width: 180,
    height: 120,
  },
  levelBadge: {
    position: 'absolute',
    top: -10,
    right: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  levelGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  levelText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  speechBubble: {
    marginTop: 15,
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  speechGradient: {
    padding: 16,
    borderRadius: 20,
    position: 'relative',
  },
  speechText: {
    fontSize: 15,
    color: '#2D3748',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  bubbleTail: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255,255,255,0.95)',
  },
  moodIndicator: {
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  moodGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  moodText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
};

export default EnhancedBearCharacter;