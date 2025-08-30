import AsyncStorage from '@react-native-async-storage/async-storage';

// 강화된 레이트 리미터
export class RateLimiter {
    constructor() {
        this.HOURLY_LIMIT = 2;      // 시간당 2회
        this.DAILY_LIMIT = 5;        // 일일 5회
        this.WEEKLY_LIMIT = 20;       // 주당 20회
        this.STORAGE_KEY = 'api_usage_records';
    }

    async checkLimit() {
        try {
            const records = await this.getRecords();
            const now = Date.now();
            
            // 지난 기록 정리
            const validRecords = records.filter(r => 
                now - r < 7 * 24 * 60 * 60 * 1000 // 7일 이내
            );

            // 시간별 체크
            const hourAgo = now - 60 * 60 * 1000;
            const hourlyCount = validRecords.filter(r => r > hourAgo).length;
            if (hourlyCount >= this.HOURLY_LIMIT) {
                return { 
                    allowed: false, 
                    message: `시간당 ${this.HOURLY_LIMIT}회 제한. 잠시 후 다시 시도하세요.`,
                    resetIn: 60 - Math.floor((now - validRecords[validRecords.length - 1]) / 60000)
                };
            }

            // 일일 체크
            const dayAgo = now - 24 * 60 * 60 * 1000;
            const dailyCount = validRecords.filter(r => r > dayAgo).length;
            if (dailyCount >= this.DAILY_LIMIT) {
                return { 
                    allowed: false, 
                    message: `일일 ${this.DAILY_LIMIT}회 제한을 초과했습니다.`,
                    resetIn: Math.floor((validRecords[0] + 24 * 60 * 60 * 1000 - now) / 60000)
                };
            }

            // 주간 체크
            const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
            const weeklyCount = validRecords.filter(r => r > weekAgo).length;
            if (weeklyCount >= this.WEEKLY_LIMIT) {
                return { 
                    allowed: false, 
                    message: `주간 ${this.WEEKLY_LIMIT}회 제한을 초과했습니다.`,
                    resetIn: Math.floor((validRecords[0] + 7 * 24 * 60 * 60 * 1000 - now) / 60000)
                };
            }

            // 연속 요청 방지 (최소 30초 간격)
            if (validRecords.length > 0) {
                const lastRequest = validRecords[validRecords.length - 1];
                const timeSinceLast = (now - lastRequest) / 1000;
                if (timeSinceLast < 30) {
                    return {
                        allowed: false,
                        message: '너무 빠른 요청입니다. 30초 후 다시 시도하세요.',
                        resetIn: Math.ceil(30 - timeSinceLast)
                    };
                }
            }

            return { allowed: true };
        } catch (error) {
            console.error('Rate limiter error:', error);
            // 에러 시 보수적으로 차단
            return { 
                allowed: false, 
                message: '일시적 오류가 발생했습니다.' 
            };
        }
    }

    async recordUsage() {
        try {
            const records = await this.getRecords();
            records.push(Date.now());
            
            // 최대 100개 기록만 유지
            const trimmed = records.slice(-100);
            
            await AsyncStorage.setItem(
                this.STORAGE_KEY, 
                JSON.stringify(trimmed)
            );
        } catch (error) {
            console.error('Failed to record usage:', error);
        }
    }

    async getRecords() {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch {
            return [];
        }
    }

    // 의심스러운 패턴 감지
    async detectAnomalousUsage() {
        const records = await this.getRecords();
        const now = Date.now();
        const hourAgo = now - 60 * 60 * 1000;
        
        // 1시간 내 기록
        const recentRecords = records.filter(r => r > hourAgo);
        
        // 패턴 분석
        if (recentRecords.length >= 5) {
            // 시간 간격 계산
            const intervals = [];
            for (let i = 1; i < recentRecords.length; i++) {
                intervals.push(recentRecords[i] - recentRecords[i-1]);
            }
            
            // 너무 규칙적인 간격 (봇 의심)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, int) => sum + Math.pow(int - avgInterval, 2), 0) / intervals.length;
            
            if (variance < 1000) { // 1초 이내 편차
                return {
                    suspicious: true,
                    reason: '자동화 도구 사용 의심',
                    blockDuration: 24 * 60 * 60 * 1000 // 24시간 차단
                };
            }
        }
        
        return { suspicious: false };
    }
}

export const rateLimiter = new RateLimiter();