// 안전한 Haptics 래퍼 (Hermes 호환성)
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// 안전한 햅틱 피드백 함수들
export const safeHapticNotification = (type = 'Success') => {
    try {
        if (Platform.OS === 'web') return; // 웹에서는 햅틱 지원 안함
        
        if (Haptics?.notificationAsync && Haptics?.NotificationFeedbackType?.[type] != null) {
            return Haptics.notificationAsync(Haptics.NotificationFeedbackType[type]).catch(() => {});
        }
    } catch (error) {
        if (__DEV__) console.log('Haptic feedback failed:', error);
    }
};

export const safeHapticImpact = (style = 'Light') => {
    try {
        if (Platform.OS === 'web') return;
        
        if (Haptics?.impactAsync && Haptics?.ImpactFeedbackType?.[style] != null) {
            return Haptics.impactAsync(Haptics.ImpactFeedbackType[style]).catch(() => {});
        }
    } catch (error) {
        if (__DEV__) console.log('Haptic impact failed:', error);
    }
};

// 기존 코드 호환성을 위한 별칭
export const hapticSuccess = () => safeHapticNotification('Success');
export const hapticError = () => safeHapticNotification('Error');
export const hapticWarning = () => safeHapticNotification('Warning');
export const hapticLight = () => safeHapticImpact('Light');
export const hapticMedium = () => safeHapticImpact('Medium');