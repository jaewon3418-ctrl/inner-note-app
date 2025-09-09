import React, { useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

const TimeBasedBackground = ({ children, style }) => {
  const getTimeBasedColors = () => {
    const now = new Date();
    const hour = now.getHours();
    
    // 시간대별 그라데이션 색상
    if (hour >= 5 && hour < 12) {
      // 아침 (5-12시): 따뜻한 오렌지 → 밝은 파랑
      return ['#FFE082', '#E3F2FD', '#BBDEFB'];
    } else if (hour >= 12 && hour < 18) {
      // 오후 (12-18시): 밝은 파랑 → 하늘색
      return ['#E3F2FD', '#BBDEFB', '#90CAF9'];
    } else if (hour >= 18 && hour < 21) {
      // 저녁 (18-21시): 따뜻한 핑크 → 보라
      return ['#F8BBD9', '#E1BEE7', '#CE93D8'];
    } else {
      // 밤 (21-5시): 깊은 파랑 → 보라
      return ['#303F9F', '#512DA8', '#1A237E'];
    }
  };

  const colors = useMemo(() => getTimeBasedColors(), []);

  return (
    <LinearGradient
      colors={colors}
      style={[{ flex: 1 }, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

export default TimeBasedBackground;