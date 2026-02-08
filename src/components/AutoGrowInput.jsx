import React, { useState } from 'react';
import { TextInput } from 'react-native';

// 라인 단위로 '툭툭' 늘어나는 AutoGrow TextInput
const AutoGrowInput = ({
  value,
  onChangeText,
  minRows = 1,     // 최소 줄 수
  maxRows = 8,     // 최대 줄 수 (여기 넘으면 스크롤)
  lineHeight = 24, // 글자 라인 높이(스타일과 일치시켜야 "한 칸"이 맞음)
  style,
  ...props
}) => {
  // padding 합계(위+아래). 너 스타일에 맞춰 숫자만 바꿔주면 됨.
  const verticalPadding = 10; // emotionInputSimple.paddingVertical(5) * 2

  // 초기 높이: 최소 줄 수 기준
  const minH = minRows * lineHeight + verticalPadding;
  const maxH = maxRows * lineHeight + verticalPadding;
  const [height, setHeight] = useState(minH);

  const onSize = (e) => {
    const raw = e.nativeEvent.contentSize.height;        // 실제 텍스트 높이
    const snapped = Math.ceil(raw / lineHeight) * lineHeight; // 라인 단위 스냅
    const clamped = Math.max(minRows * lineHeight, Math.min(snapped, maxRows * lineHeight));
    setHeight(clamped + verticalPadding);
  };

  return (
    <TextInput
      multiline
      value={value}
      onChangeText={onChangeText}
      onContentSizeChange={onSize}
      // maxRows 이하면 스크롤 비활성 → 자연 확장, 초과하면 스크롤
      scrollEnabled={height >= maxH}
      style={[
        // 줄바꿈 기준이 되는 lineHeight를 반드시 스타일과 맞춰야 함
        { height, lineHeight, textAlignVertical: 'top' },
        style,
      ]}
      {...props}
    />
  );
};

export default AutoGrowInput;
