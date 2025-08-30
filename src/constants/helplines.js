// 위기 지원 전화번호 (현지화)
export const HELPLINES = {
    'ko-KR': {
        emergency: '112',
        fire: '119',
        welfare: '129',
        suicide: '1393',
        youth: '1388',
    },
    'en-US': {
        emergency: '911',
        fire: '911',
        suicide: '988',
        youth: '988',
    },
    default: {
        emergency: '112',
        fire: '119',
        suicide: '1393',
        youth: '1388',
    }
};

export const TRASH_TTL_DAYS = 30;

export const CRISIS_PATTERNS = [
    /죽고\s*싶|자살|극단적\s*선택|생을\s*마감|죽어버리고|사라지고\s*싶/i,
    /suicide|kill\s*myself|end\s*my\s*life|self[-\s]?harm|want\s*to\s*die/i
];