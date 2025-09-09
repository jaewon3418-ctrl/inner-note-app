import { Platform, View } from 'react-native';
import React from 'react';

export default function Card({ children, style, contentStyle, shadowStyle, elevation = 8, testMode = false }) {
  return (
    <View
      style={[
        {
          borderRadius: 24,
          // 안드로이드와 iOS 모두 불투명 배경 - AA 대비율 준수
          ...Platform.select({
            android: { 
              elevation: testMode ? 0 : elevation, 
              backgroundColor: '#475569' 
            },
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              backgroundColor: '#475569',
            },
          }),
        },
        style,
        shadowStyle,
      ]}
    >
      <View
        style={[
          {
            borderRadius: 24,
            overflow: 'hidden',
            backgroundColor: '#475569', // 불투명 배경 - AA 대비율 준수
          },
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}