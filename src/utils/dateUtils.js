// 로컬 날짜 유틸리티

export const pad = (n) => (n < 10 ? `0${n}` : `${n}`);

// 로컬 날짜 키 생성 (YYYY-MM-DD 형태, 자정 경계 안전)
export const getLocalDateKey = (d = new Date()) => {
    const y = d.getFullYear();
    const m = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    return `${y}-${m}-${day}`;
};

// 검색 정규화 (RN/Hermes 호환)
export const normalize = (s = '') => {
    const lower = `${s}`.toLowerCase();
    try {
        return lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
        return lower;
    }
};

// 안전한 날짜 포맷터 (Intl 오류 방지)
export const formatLocalizedDate = (date, language, options = {}) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const isKorean = language === 'ko';

    try {
        if (isKorean) {
            return `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일`;
        } else {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${months[dateObj.getMonth()]} ${dateObj.getDate()}`;
        }
    } catch (error) {
        return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    }
};

export const formatFullDate = (date, language) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const isKorean = language === 'ko';

    try {
        if (isKorean) {
            const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
            const months = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
            return `${dateObj.getFullYear()}년 ${months[dateObj.getMonth()]}월 ${dateObj.getDate()}일 ${weekdays[dateObj.getDay()]}요일`;
        } else {
            const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const months = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];
            return `${weekdays[dateObj.getDay()]}, ${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
        }
    } catch (error) {
        return dateObj.toDateString();
    }
};
