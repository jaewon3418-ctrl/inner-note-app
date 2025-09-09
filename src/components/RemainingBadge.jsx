import React from 'react';
import { View, Text } from 'react-native';

const RemainingBadge = ({ remaining, language = 'ko' }) => {
  if (remaining <= 0) return null;

  const text = language === 'ko' 
    ? `${remaining}회 남음` 
    : `${remaining} left`;

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
};

const styles = {
  container: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  badge: {
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
};

export default RemainingBadge;