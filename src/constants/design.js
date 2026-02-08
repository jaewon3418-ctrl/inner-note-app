// ============================================
// DESIGN TOKENS - Premium Minimal Dark
// ============================================
export const DESIGN = {
    colors: {
        // 배경 (깊은 다크)
        bgGradient: ['#0D1117', '#0D1117', '#0D1117'],
        bgCard: '#161B22',

        // 카드 (미묘한 구분)
        cardBg: 'rgba(255, 255, 255, 0.03)',
        cardBgSolid: '#161B22',
        cardBorder: 'rgba(255, 255, 255, 0.06)',
        cardShadow: 'rgba(0, 0, 0, 0.5)',

        // 텍스트 (화이트 계층)
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.6)',
        textMuted: 'rgba(255, 255, 255, 0.35)',
        textOnDark: '#FFFFFF',

        // 액센트 (골드 - 고급스러움)
        primary: '#C9A962',
        primaryLight: '#D4BC7D',
        accent: '#B8985A',

        // CTA 버튼
        ctaGradient: ['#C9A962', '#B8985A'],
        ctaDisabled: 'rgba(255, 255, 255, 0.08)',

        // 감정 색상 (muted)
        emotions: {
            great: '#4ADE80',
            good: '#60D4AE',
            meh: '#FBBF24',
            bad: '#F97316',
            sad: '#8B5CF6',
        },
    },

    typography: {
        // 우아한 폰트
        title: { size: 26, weight: '200', letterSpacing: 1 },
        subtitle: { size: 15, weight: '300', letterSpacing: 0.5 },
        body: { size: 15, weight: '400', lineHeight: 24 },
        caption: { size: 12, weight: '400', letterSpacing: 0.8 },
        button: { size: 14, weight: '500', letterSpacing: 1 },
    },

    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
    },

    radius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        full: 999,
    },

    shadows: {
        soft: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 6,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};

// 언어 독립적 감정 키 시스템
export const EMOTIONS = {
    JOY:     { ko: '기쁨',   en: 'Good',   color: DESIGN.colors.emotions.great, order: 1 },
    CALM:    { ko: '평온',   en: 'Calm',   color: DESIGN.colors.emotions.good, order: 2 },
    OK:      { ko: '무난',   en: 'Okay',   color: DESIGN.colors.emotions.meh, order: 3 },
    LONELY:  { ko: '외로움', en: 'Lonely', color: DESIGN.colors.emotions.meh, order: 4 },
    ANXIOUS: { ko: '불안',   en: 'Anxious', color: DESIGN.colors.emotions.bad, order: 5 },
    SAD:     { ko: '슬픔',   en: 'Sad',    color: DESIGN.colors.emotions.sad, order: 6 },
};

export const toEmotionKey = (label = '') => {
    const s = `${label}`.toLowerCase();
    if (['좋아','기쁨','행복','good','happy','great'].some(v=>s.includes(v))) return 'JOY';
    if (['평온','차분','calm','peaceful'].some(v=>s.includes(v))) return 'CALM';
    if (['괜찮','무난','ok','okay','fine'].some(v=>s.includes(v))) return 'OK';
    if (['외로','lonely'].some(v=>s.includes(v))) return 'LONELY';
    if (['불안','anxious','worried','stressed'].some(v=>s.includes(v))) return 'ANXIOUS';
    if (['슬픔','슬퍼','sad','depressed'].some(v=>s.includes(v))) return 'SAD';
    return 'OK'; // 기본값
};
