import React, { useState } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

const FloatingActions = ({ onComfortPress, onHistoryPress, language = 'ko' }) => {
  const [expanded, setExpanded] = useState(false);

  const actions = [
    {
      key: 'comfort',
      icon: 'chatbubble-outline',
      label: language === 'ko' ? '고민 상담소' : 'Worry Counseling',
      colors: ['#FF8A80', '#FFAB40'],
      onPress: onComfortPress,
    },
  ];

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      {/* Action buttons */}
      {expanded && (
        <View style={styles.actionsContainer}>
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.key}
              style={[
                styles.actionButton,
                { 
                  marginBottom: 16,
                  transform: [{ 
                    translateY: expanded ? 0 : 60 * (index + 1) 
                  }] 
                }
              ]}
              onPress={action.onPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.colors}
                style={styles.actionGradient}
              >
                <Ionicons name={action.icon} size={20} color="#ffffff" />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Main FAB */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={expanded ? ['#FF6B9D', '#FF1744'] : ['#FFD93D', '#FFCC02']}
          style={styles.mainGradient}
        >
          <Ionicons 
            name={expanded ? 'close' : 'add'} 
            size={28} 
            color="#ffffff" 
            style={{
              transform: [{ rotate: expanded ? '0deg' : '0deg' }]
            }}
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  container: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    alignItems: 'flex-end',
  },
  actionsContainer: {
    alignItems: 'flex-end',
  },
  actionButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  actionLabel: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  mainButton: {
    width: 52, // 56에서 축소
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, // 그림자 약화
    shadowRadius: 12,
    elevation: 6, // 낮춤
  },
  mainGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default FloatingActions;