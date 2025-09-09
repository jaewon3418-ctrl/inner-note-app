import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const SparseSample = ({ language = 'ko', style }) => {
  const text = language === 'ko' 
    ? '샘플 부족' 
    : 'Sample insufficient';

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="information-circle-outline" size={14} color="#f59e0b" />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 4,
  },
  text: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
};

export default SparseSample;