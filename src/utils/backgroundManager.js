import AsyncStorage from '@react-native-async-storage/async-storage';

// 배경 옵션들
export const BACKGROUND_OPTIONS = [
    {
        id: 'purple-gradient',
        type: 'gradient',
        name_ko: '보라빛 그라데이션',
        name_en: 'Purple Gradient',
        colors: ['#6b21a8', '#a855f7', '#e9d5ff'],
    },
    {
        id: 'blue-purple-gradient',
        type: 'gradient',
        name_ko: '블루-퍼플 그라데이션',
        name_en: 'Blue-Purple Gradient', 
        colors: ['#1e40af', '#7c3aed', '#c084fc'],
    },
    {
        id: 'deep-purple-gradient',
        type: 'gradient',
        name_ko: '딥 퍼플 그라데이션',
        name_en: 'Deep Purple Gradient',
        colors: ['#3b0764', '#6b21a8', '#a855f7', '#e9d5ff'],
    },
    {
        id: 'night-sky',
        type: 'image',
        name_ko: '별빛 밤하늘',
        name_en: 'Starry Night',
        source: require('../../assets/night-sky-bg.png'),
    },
    {
        id: 'bg-image-1',
        type: 'image',
        name_ko: '황금빛 파도',
        name_en: 'Golden Waves',
        source: require('../../assets/bg-image-1.png'),
    },
    {
        id: 'bg-image-2',
        type: 'image',
        name_ko: '가을 숲길',
        name_en: 'Autumn Forest',
        source: require('../../assets/bg-image-2.png'),
    },
    {
        id: 'bg-image-3',
        type: 'image',
        name_ko: '빗속의 마을',
        name_en: 'Rainy Village',
        source: require('../../assets/bg-image-3.png'),
    },
    {
        id: 'night-sky-meteor',
        type: 'image',
        name_ko: '유성이 있는 밤하늘',
        name_en: 'Night Sky with Meteor',
        source: require('../../assets/night-sky-bg.png'),
    }
];

// 저장된 배경 ID 불러오기
export const loadSelectedBackground = async () => {
    try {
        const backgroundId = await AsyncStorage.getItem('selectedBackground');
        return backgroundId || 'night-sky-meteor'; // 기본값을 밤하늘로 변경
    } catch (error) {
        console.error('배경 설정 불러오기 실패:', error);
        return 'night-sky-meteor';
    }
};

// 배경 ID 저장하기
export const saveSelectedBackground = async (backgroundId) => {
    try {
        await AsyncStorage.setItem('selectedBackground', backgroundId);
        return true;
    } catch (error) {
        console.error('배경 설정 저장 실패:', error);
        return false;
    }
};

// 배경 ID로 배경 옵션 찾기
export const getBackgroundOption = (backgroundId) => {
    return BACKGROUND_OPTIONS.find(option => option.id === backgroundId) || BACKGROUND_OPTIONS[0];
};

// 배경 적용을 위한 props 반환
export const getBackgroundProps = (backgroundId) => {
    const option = getBackgroundOption(backgroundId);
    
    if (option.type === 'gradient') {
        return {
            type: 'gradient',
            colors: option.colors,
            start: { x: 0, y: 0 },
            end: { x: 0, y: 1 }  // 수직 그라데이션으로 변경 (위에서 아래로)
        };
    } else if (option.type === 'image') {
        return {
            type: 'image',
            source: option.source,
            resizeMode: 'cover'
        };
    }
    
    return {
        type: 'gradient',
        colors: ['#3b0764', '#6b21a8', '#a855f7', '#e9d5ff'],
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 }
    };
};