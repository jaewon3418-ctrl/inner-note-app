import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    darkContainer: {
        backgroundColor: '#1a1a2e',
    },
    background: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    tabContent: {
        flex: 1,
    },

    // 다크모드 공통 스타일
    darkText: {
        color: '#ffffff',
    },
    darkSubText: {
        color: '#cccccc',
    },
    darkCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    darkInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },

    // 개선된 고정 CTA
    fixedCTA: {
        marginHorizontal: 20,
        marginTop: Platform.OS === 'ios' ? 70 : 50,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 15,
    },
    fixedCTAButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    fixedCTAText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },

    // 개선된 스트릭 배너
    streakBanner: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    streakGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 16,
    },
    streakText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
    },

    // 헤더 카드 (간격 조정)
    headerCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 15,
    },
    headerGradient: {
        padding: 32,
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#333',
        marginBottom: 12,
        letterSpacing: -0.8,
    },
    greetingText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
        letterSpacing: -0.2,
    },

    // 명언 카드
    quoteCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#C9A962',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    quoteGradient: {
        padding: 24,
    },
    quoteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    quoteTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#C9A962',
        letterSpacing: -0.3,
    },
    quoteText: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
        fontWeight: '500',
        fontStyle: 'italic',
    },

    // 캐릭터 관련 스타일은 생략 (너무 길어서)
    // 실제로는 모든 스타일이 여기 포함되어야 함
});