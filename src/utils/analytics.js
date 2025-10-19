import AsyncStorage from '@react-native-async-storage/async-storage';

// 이벤트 로깅 시스템
class Analytics {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.isEnabled = true;
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 이벤트 로깅 메인 함수
  async logEvent(eventName, properties = {}) {
    if (!this.isEnabled) return;

    const event = {
      name: eventName,
      properties: {
        ...properties,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        platform: require('react-native').Platform.OS,
      }
    };

    // 메모리에 저장
    this.events.push(event);
    
    // 로컬 스토리지에 저장 (디버깅용)
    try {
      const existingEvents = await AsyncStorage.getItem('analytics_events');
      const allEvents = existingEvents ? JSON.parse(existingEvents) : [];
      allEvents.push(event);
      
      // 최대 1000개만 보관
      if (allEvents.length > 1000) {
        allEvents.splice(0, allEvents.length - 1000);
      }
      
      await AsyncStorage.setItem('analytics_events', JSON.stringify(allEvents));
    } catch (error) {
      console.log('Analytics storage error:', error);
    }

    // 콘솔에 출력 (개발용)
    console.log(`📊 Event: ${eventName}`, properties);
  }

  // P0 필수 이벤트들
  async logAppOpen() {
    await this.logEvent('app_open');
  }

  async logWriteStart() {
    await this.logEvent('write_start');
  }

  async logWriteSubmit(emotionText, wordCount = 0) {
    await this.logEvent('write_submit', {
      word_count: wordCount,
      has_emotion: emotionText && emotionText.length > 0
    });
  }

  async logAiReplyView(emotion, replyLength = 0) {
    await this.logEvent('ai_reply_view', {
      emotion: emotion,
      reply_length: replyLength
    });
  }

  async logPaywallView(source = 'unknown') {
    await this.logEvent('paywall_view', {
      source: source // 'onboarding', 'home', 'feature_limit' 등
    });
  }

  async logStartTrial(plan = 'monthly') {
    await this.logEvent('start_trial', {
      plan: plan
    });
  }

  async logWidgetTap() {
    await this.logEvent('widget_tap');
  }

  async logStreakIncrement(newStreakCount) {
    await this.logEvent('streak_increment', {
      streak_count: newStreakCount
    });
  }

  async logWeeklyReportView() {
    await this.logEvent('weekly_report_view');
  }

  async logReferralShare(method = 'unknown') {
    await this.logEvent('referral_share', {
      share_method: method // 'image', 'link', 'social' 등
    });
  }

  // 유틸리티 함수들
  async getEvents() {
    try {
      const events = await AsyncStorage.getItem('analytics_events');
      return events ? JSON.parse(events) : [];
    } catch (error) {
      return [];
    }
  }

  async clearEvents() {
    try {
      await AsyncStorage.removeItem('analytics_events');
      this.events = [];
    } catch (error) {
      console.log('Error clearing events:', error);
    }
  }

  // 개발용: 이벤트 통계 보기
  async getEventStats() {
    const events = await this.getEvents();
    const stats = {};
    
    events.forEach(event => {
      stats[event.name] = (stats[event.name] || 0) + 1;
    });
    
    console.log('📊 Event Stats:', stats);
    return stats;
  }
}

// 싱글톤 인스턴스
const analytics = new Analytics();

export default analytics;