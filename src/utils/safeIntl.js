// 안전한 Intl 래퍼 (Hermes 호환성)

const formatDateFallback = (date, isKorean = true) => {
    const d = new Date(date);
    if (isKorean) {
        return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    } else {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
    }
};

export const safeFormat = (date, locale = 'ko-KR', options = {}) => {
    // 먼저 fallback으로 처리
    const isKorean = locale.startsWith('ko');
    
    try {
        // 간단한 경우는 Intl 없이 처리
        if (!options || Object.keys(options).length === 0) {
            return formatDateFallback(date, isKorean);
        }
        
        // Intl이 있으면 사용해보되, 오류 시 fallback
        if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
            try {
                return new Intl.DateTimeFormat('default', options).format(new Date(date));
            } catch (intlError) {
                return formatDateFallback(date, isKorean);
            }
        }
        
        return formatDateFallback(date, isKorean);
    } catch (error) {
        // 최후의 fallback
        const d = new Date(date);
        return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    }
};

// 기존 코드 호환성을 위한 래퍼들
export const formatLocalizedDate = (date, options = {}, language = 'ko') => {
    const locale = language === 'ko' ? 'ko-KR' : 'en-US';
    const defaultOptions = {
        month: 'short',
        day: 'numeric',
        ...options
    };
    return safeFormat(date, locale, defaultOptions);
};

export const formatFullDate = (date, language = 'ko') => {
    const locale = language === 'ko' ? 'ko-KR' : 'en-US';
    const options = {
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return safeFormat(date, locale, options);
};