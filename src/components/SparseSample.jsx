import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SparseSample = ({ language = 'ko', style }) => {
  const text = language === 'ko' 
    ? '샘플 부족' 
    : 'Sample insufficient';

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="information-circle-outline" size={16} color="#fbbf24" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.5)',
    gap: 6,
  },
  text: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: '700',
  },
};

export default SparseSample;