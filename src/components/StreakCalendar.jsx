import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const StreakCalendar = ({ 
    emotionHistory = [], 
    streak = 0, 
    recoveryTokens = 2,
    onUseRecoveryToken,
    language = 'ko'
}) => {
    const [currentDate, setCurrentDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [showTokenHelp, setShowTokenHelp] = useState(false);

    // 번역
    const t = (key) => {
        const translations = {
            ko: {
                streak: '연속 기록',
                days: '일',
                recoveryTokens: '만회 토큰',
                remaining: '남음',
                useToken: '토큰 사용',
                tokenUsed: '토큰 사용됨',
                prevMonth: '이전 달',
                nextMonth: '다음 달',
                tokenExplanation: '기록을 빼먹은 날에 토큰을 사용해서 연속 기록을 유지해봐. 매월 2개씩 지급돼.\n\n사용법: 빼먹은 날짜를 클릭해서 토큰으로 복구하기'
            },
            en: {
                streak: 'Streak',
                days: 'days',
                recoveryTokens: 'Recovery Tokens',
                remaining: 'remaining',
                useToken: 'Use Token',
                tokenUsed: 'Token Used',
                prevMonth: 'Previous Month',
                nextMonth: 'Next Month',
                tokenExplanation: 'Use tokens to recover your streak when you\nmiss a day. You get 2 tokens per month.\n\nHow to use: Tap on missed dates to recover with token'
            }
        };
        return translations[language]?.[key] || key;
    };

    // 로컬 날짜 키 생성 (YYYY-MM-DD)
    const getLocalDateKey = (date = new Date()) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // 기록된 날짜들을 Set으로 변환
    const recordedDates = useMemo(() => {
        const dates = new Set();
        emotionHistory.forEach(entry => {
            if (!entry.deletedAt && entry.date) {
                const date = new Date(entry.date);
                // 유효한 날짜인지 확인
                if (!isNaN(date.getTime())) {
                    dates.add(getLocalDateKey(date));
                }
            }
        });
        return dates;
    }, [emotionHistory]);

    // 달력 데이터 생성
    const generateCalendarData = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // 현재 달의 첫째 날과 마지막 날
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        // 첫 주의 시작 (일요일부터)
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const days = [];
        const current = new Date(startDate);
        
        // 6주 * 7일 = 42일 생성
        for (let i = 0; i < 42; i++) {
            const dateKey = getLocalDateKey(current);
            const isCurrentMonth = current.getMonth() === month;
            const isToday = getLocalDateKey(new Date()) === dateKey;
            const hasRecord = recordedDates.has(dateKey);
            
            days.push({
                date: new Date(current),
                dateKey,
                day: current.getDate(),
                isCurrentMonth,
                isToday,
                hasRecord
            });
            
            current.setDate(current.getDate() + 1);
        }
        
        return days;
    };

    const calendarData = generateCalendarData();
    const monthName = React.useMemo(() => {
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            
            if (language === 'ko') {
                const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
                return `${year}년 ${monthNames[month]}`;
            } else {
                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                return `${monthNames[month]} ${year}`;
            }
        } catch (error) {
            console.warn('📅 Date formatting error:', error);
            return '2025년 9월';
        }
    }, [currentDate, language]);

    // 이전/다음 달로 이동
    const goToPrevMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // 요일 헤더
    const weekDays = language === 'ko' 
        ? ['일', '월', '화', '수', '목', '금', '토']
        : ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <View style={styles.container}>
            {/* 헤더 */}
            <View style={styles.header}>
                <View style={styles.streakInfo}>
                    <View style={styles.streakBadge}>
                        <MaterialCommunityIcons name="fire" size={16} color="#FF6B35" />
                        <Text style={styles.streakNumber}>{streak}</Text>
                        <Text style={styles.streakLabel}>{t('days')}</Text>
                    </View>
                    <Text style={styles.streakTitle}>{t('streak')}</Text>
                </View>

                <View style={styles.tokenInfo}>
                    <View style={styles.tokenContainer}>
                        {[...Array(2)].map((_, index) => (
                            <View key={index} style={[
                                styles.token,
                                index < recoveryTokens ? styles.tokenActive : styles.tokenUsed
                            ]}>
                                <Ionicons 
                                    name="shield-checkmark" 
                                    size={12} 
                                    color={index < recoveryTokens ? "#10B981" : "#6B7280"} 
                                />
                            </View>
                        ))}
                    </View>
                    <View style={styles.tokenLabelContainer}>
                        <Text style={styles.tokenLabel}>{t('recoveryTokens')}</Text>
                        <TouchableOpacity 
                            style={styles.helpButton}
                            onPress={() => setShowTokenHelp(!showTokenHelp)}
                        >
                            <Ionicons name="help-circle" size={14} color="#FFD700" />
                        </TouchableOpacity>
                    </View>
                    
                    {/* 도움말 툴팁 */}
                    {showTokenHelp && (
                        <TouchableOpacity 
                            style={styles.helpTooltip}
                            onPress={() => setShowTokenHelp(false)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.helpTooltipText}>
                                {t('tokenExplanation')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* 달력 헤더 */}
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={goToPrevMonth} style={styles.navButton}>
                    <Ionicons name="chevron-back" size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
                
                <Text style={styles.monthTitle}>{monthName}</Text>
                
                <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
                    <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
            </View>

            {/* 요일 헤더 */}
            <View style={styles.weekHeader}>
                {weekDays.map((day, index) => (
                    <View key={index} style={styles.weekDay}>
                        <Text style={styles.weekDayText}>{day}</Text>
                    </View>
                ))}
            </View>

            {/* 달력 그리드 */}
            <View style={styles.calendar}>
                {calendarData.map((dayData, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.dayCell,
                            !dayData.isCurrentMonth && styles.dayCellInactive,
                            dayData.isToday && styles.dayCellToday,
                            dayData.hasRecord && styles.dayCellWithRecord
                        ]}
                        activeOpacity={0.7}
                    >
                        <Text style={[
                            styles.dayText,
                            !dayData.isCurrentMonth && styles.dayTextInactive,
                            dayData.isToday && styles.dayTextToday,
                            dayData.hasRecord && styles.dayTextWithRecord
                        ]}>
                            {dayData.day || ''}
                        </Text>
                        
                        {dayData.hasRecord && (
                            <View style={styles.recordDot} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const styles = {
    container: {
        marginVertical: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 5,
    },
    streakInfo: {
        alignItems: 'center',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 4,
    },
    streakNumber: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FF6B35',
        marginLeft: 4,
        marginRight: 2,
    },
    streakLabel: {
        fontSize: 12,
        color: '#FF6B35',
        opacity: 0.8,
    },
    streakTitle: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    tokenInfo: {
        alignItems: 'center',
        position: 'relative',
        overflow: 'visible',
    },
    tokenContainer: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    token: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 2,
    },
    tokenActive: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
    },
    tokenUsed: {
        backgroundColor: 'rgba(107, 114, 128, 0.2)',
    },
    tokenLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    tokenLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    helpButton: {
        padding: 2,
    },
    helpTooltip: {
        position: 'absolute',
        top: 25,
        right: -30,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderRadius: 8,
        padding: 12,
        width: 180,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    helpTooltipText: {
        fontSize: 12,
        color: '#fff',
        lineHeight: 16,
        textAlign: 'left',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    navButton: {
        padding: 8,
        borderRadius: 8,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    weekHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    weekDay: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    weekDayText: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.6)',
    },
    calendar: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: `${100/7}%`,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 4,
    },
    dayCellInactive: {
        opacity: 0.3,
    },
    dayCellToday: {
        backgroundColor: 'rgba(167, 139, 250, 0.2)',
        borderRadius: 8,
    },
    dayCellWithRecord: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 8,
    },
    dayText: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
    },
    dayTextInactive: {
        color: 'rgba(255, 255, 255, 0.3)',
    },
    dayTextToday: {
        color: '#A78BFA',
        fontWeight: '700',
    },
    dayTextWithRecord: {
        color: '#10B981',
        fontWeight: '600',
    },
    recordDot: {
        position: 'absolute',
        bottom: 2,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#10B981',
    },
};

export default StreakCalendar;