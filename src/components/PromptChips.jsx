import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

const PromptChips = ({ onPromptSelect, language = 'ko' }) => {
  const prompts = language === 'ko' ? [
    "오늘 기분이 어때?",
    "지금 뭘 느끼고 있어?",
    "마음이 복잡해",
    "스트레스받는 일이 있었어",
    "기쁜 일이 있었어",
    "걱정이 돼",
    "외로워",
    "행복해"
  ] : [
    "How are you feeling?",
    "What's on your mind?",
    "I'm feeling complex",
    "Something stressed me",
    "Something good happened",
    "I'm worried",
    "I feel lonely",
    "I'm happy"
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {prompts.map((prompt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.chip}
            onPress={() => onPromptSelect(prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = {
  container: {
    marginVertical: 16,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    backgroundColor: '#475569',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
};

export default PromptChips;