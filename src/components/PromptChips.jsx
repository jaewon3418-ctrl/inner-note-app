import React from 'react';
import { Text, TouchableOpacity, ScrollView } from 'react-native';

const PromptChips = ({ onPromptSelect, language = 'ko' }) => {
  const prompts = language === 'ko' ? [
    { emoji: '😤', text: '짜증나는 일', fill: '😤 짜증나는 일이 있었어. ' },
    { emoji: '😴', text: '피곤한 하루', fill: '😴 피곤한 하루였어. ' },
    { emoji: '🥰', text: '좋은 일', fill: '🥰 좋은 일이 있었어. ' },
    { emoji: '😢', text: '우울한 기분', fill: '😢 우울한 기분이 들었어. ' },
    { emoji: '🤯', text: '복잡한 생각', fill: '🤯 복잡한 생각이 들었어. ' },
    { emoji: '😰', text: '불안한 마음', fill: '😰 불안한 마음이 들었어. ' },
    { emoji: '🫠', text: '무기력', fill: '🫠 무기력한 하루였어. ' },
  ] : [
    { emoji: '😤', text: 'Frustrated', fill: '😤 I felt frustrated. ' },
    { emoji: '😴', text: 'Exhausted', fill: '😴 I was exhausted. ' },
    { emoji: '🥰', text: 'Good vibes', fill: '🥰 Something good happened. ' },
    { emoji: '😢', text: 'Feeling down', fill: '😢 I felt down. ' },
    { emoji: '🤯', text: 'Overwhelmed', fill: '🤯 My mind was overwhelmed. ' },
    { emoji: '😰', text: 'Anxious', fill: '😰 I felt anxious. ' },
    { emoji: '🫠', text: 'Drained', fill: '🫠 I felt completely drained. ' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {prompts.map((prompt, index) => (
        <TouchableOpacity
          key={index}
          style={styles.chip}
          onPress={() => onPromptSelect(prompt.fill)}
          activeOpacity={0.7}
        >
          <Text style={styles.chipEmoji}>{prompt.emoji}</Text>
          <Text style={styles.chipText}>{prompt.text}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = {
  scrollContainer: {
    paddingHorizontal: 0,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 6,
  },
  chipEmoji: {
    fontSize: 14,
  },
  chipText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
};

export default PromptChips;
