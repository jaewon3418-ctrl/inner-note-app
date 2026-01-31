import { CRISIS_PATTERNS } from '../constants/helplines';

// 위기 감지
export const isCrisis = (text) => {
    return CRISIS_PATTERNS.some(pattern => pattern.test(text));
};

// 감정 분석
export const analyzeEmotion = (text, quickEmotions) => {
    const emotions = quickEmotions.map(e => e.text);

    // 간단한 키워드 기반 분석 (향후 AI로 대체 예정)
    let detectedEmotion = emotions[0]; // 기본값
    let intensity = 3; // 1-5 스케일

    if (text.includes('기쁘') || text.includes('행복') || text.includes('좋') || text.includes('즐거')) {
        detectedEmotion = '좋아';
        intensity = 4;
    } else if (text.includes('평온') || text.includes('차분') || text.includes('안정')) {
        detectedEmotion = '평온해';
        intensity = 3;
    } else if (text.includes('슬프') || text.includes('우울') || text.includes('눈물')) {
        detectedEmotion = '슬퍼';
        intensity = 4;
    } else if (text.includes('불안') || text.includes('걱정') || text.includes('두려')) {
        detectedEmotion = '불안해';
        intensity = 4;
    } else if (text.includes('외로') || text.includes('혼자') || text.includes('쓸쓸')) {
        detectedEmotion = '외로워';
        intensity = 3;
    } else if (text.includes('피곤') || text.includes('지쳐') || text.includes('힘들')) {
        detectedEmotion = '피곤해';
        intensity = 4;
    }

    const comfortMessages = {
        '좋아': '정말 기쁜 일이야! 이런 순간들을 소중히 간직해봐',
        '평온해': '마음이 평온하다니 정말 좋아. 이 고요함을 느껴봐',
        '슬퍼': '슬픈 마음을 온전히 느껴도 괜찮아. 네 감정을 인정해줘',
        '불안해': '불안한 마음이 드는구나. 깊게 숨을 쉬며 지금 이 순간에 집중해봐',
        '외로워': '혼자라고 느껴져도 괜찮아. 너를 생각하는 사람들이 있어',
        '피곤해': '많이 지쳤구나. 충분한 휴식을 취하며 자신을 돌봐',
    };

    const actions = {
        '좋아': '이 기쁜 감정을 일기에 적거나 소중한 사람과 나눠봐',
        '평온해': '이 평온함을 유지하기 위해 명상이나 산책을 해봐',
        '슬퍼': '슬픈 감정을 표현할 수 있는 활동(그림, 음악 듣기)을 해봐',
        '불안해': '5분간 깊은 호흡을 하거나 안전한 장소에서 휴식을 취해봐',
        '외로워': '가까운 사람에게 연락하거나 따뜻한 차 한 잔을 마셔봐',
        '피곤해': '충분한 수면과 영양 섭취로 몸과 마음을 회복시켜봐',
    };

    return {
        emotion: detectedEmotion,
        intensity,
        comfort: comfortMessages[detectedEmotion] || '네 마음을 이해해',
        action: actions[detectedEmotion] || '잠시 휴식을 취하며 마음을 돌봐',
    };
};

// 맥락적 명언 생성
export const getContextualQuote = (streak, recentEmotions, language = 'ko') => {
    const quotes = {
        ko: {
            streak7: "7일 연속 기록 중! 꾸준함이 만드는 변화를 느껴봐 🌱",
            streak3: "연속 기록 중! 마음을 돌보는 습관이 자리잡고 있어 ✨",
            anxious: "불안한 마음도 괜찮아. 지금 이 순간에 집중해봐 🌿",
            sad: "슬픔도 소중한 감정이야. 충분히 느끼고 받아들여 💜",
            general: [
                "오늘도 네 마음을 돌보는 하루가 되길 바라 🌸",
                "작은 감정도 소중하게 기록해봐 ✨",
                "마음이 힘들 땐 잠시 멈춰 숨을 골라 🌿",
                "네 감정은 모두 의미가 있어 💜"
            ]
        },
        en: {
            streak7: "7 days in a row! Feel the change that consistency brings 🌱",
            streak3: "On a streak! Your heart-caring habit is taking root ✨",
            anxious: "Anxious feelings are okay. Focus on this moment 🌿",
            sad: "Sadness is also a precious emotion. Feel it fully 💜",
            general: [
                "May today be a day to care for your heart 🌸",
                "Try jotting down even tiny feelings ✨",
                "When your heart is heavy, pause and breathe 🌿",
                "All your emotions have meaning 💜"
            ]
        }
    };

    const currentQuotes = quotes[language] || quotes.ko;
    
    if (streak >= 7) return currentQuotes.streak7;
    if (streak >= 3) return currentQuotes.streak3;
    if (recentEmotions?.includes('ANXIOUS')) return currentQuotes.anxious;
    if (recentEmotions?.includes('SAD')) return currentQuotes.sad;

    return currentQuotes.general[new Date().getDate() % currentQuotes.general.length];
};