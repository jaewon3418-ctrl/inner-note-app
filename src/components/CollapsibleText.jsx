import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const CollapsibleText = ({ 
  text, 
  maxLines = 3, 
  style, 
  textStyle, 
  language = 'ko' 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowButton, setShouldShowButton] = useState(false);

  const toggleText = () => {
    setIsExpanded(!isExpanded);
  };

  const onTextLayout = (event) => {
    if (event.nativeEvent.lines.length > maxLines) {
      setShouldShowButton(true);
    }
  };

  const buttonText = language === 'ko' 
    ? (isExpanded ? '접기' : '더보기')
    : (isExpanded ? 'Show less' : 'Show more');

  const iconName = isExpanded ? 'chevron-up' : 'chevron-down';

  return (
    <View style={style}>
      <Text
        style={textStyle}
        numberOfLines={isExpanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
      >
        {text}
      </Text>
      
      {shouldShowButton && (
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={toggleText}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.toggleText}>{buttonText}</Text>
          <Ionicons name={iconName} size={14} color="rgba(255, 255, 255, 0.7)" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = {
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  toggleText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
};

export default CollapsibleText;