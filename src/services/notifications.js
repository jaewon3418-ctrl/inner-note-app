import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Expo Go 환경 체크
const isExpoGo = Constants.appOwnership === 'expo';

// 조건부로 알림 모듈 import
let Notifications = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    
    // 알림 카테고리 설정 (액션 버튼용)
    if (Platform.OS === 'ios') {
      Notifications.setNotificationCategoryAsync('QUICK_WRITE', [
        {
          identifier: 'QUICK_WRITE_ACTION',
          buttonTitle: '빠른 기록',
          options: {
            opensAppToForeground: true,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'DISMISS_ACTION',
          buttonTitle: '나중에',
          options: {
            opensAppToForeground: false,
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);
    }
    
    // 알림 표시 설정
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (error) {
    console.log('Notifications not available in Expo Go');
  }
}

// 푸시 토큰 가져오기
export async function registerForPushNotificationsAsync() {
  if (isExpoGo || !Notifications) {
    console.log('Push notifications are not available in Expo Go');
    return null;
  }
  
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return false;
    }
    
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push token:', token);
      
      // 토큰 저장
      await AsyncStorage.setItem('pushToken', token);
    } catch (error) {
      console.log('Error getting push token:', error);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

  return finalStatus === 'granted';
}

// 로컬 알림 예약
export async function scheduleLocalNotification(title, body, trigger = null) {
  if (isExpoGo || !Notifications) {
    console.log('Local notifications are not available in Expo Go');
    return null;
  }
  
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { timestamp: new Date().toISOString() },
      sound: 'default',
    },
    trigger: trigger || { seconds: 1 },
  });
  
  return notificationId;
}

// 액션 버튼이 있는 알림 예약
export async function scheduleActionNotification(title, body, trigger = null) {
  if (isExpoGo || !Notifications) {
    console.log('Action notifications are not available in Expo Go');
    return null;
  }
  
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      data: { 
        timestamp: new Date().toISOString(),
        action: 'quick_write'
      },
      sound: 'default',
      categoryIdentifier: 'QUICK_WRITE',
    },
    trigger: trigger || { seconds: 1 },
  });
  
  return notificationId;
}

// 특정 시간에 알림 예약 (매일 반복)
export async function scheduleDailyNotification(title, body, hour, minute, withAction = false) {
  if (isExpoGo || !Notifications) {
    console.log('Daily notifications are not available in Expo Go');
    return null;
  }
  
  // 각 요일(1-7, 일요일=1)에 대해 알림 설정
  const notificationIds = [];
  
  for (let weekday = 1; weekday <= 7; weekday++) {
    const trigger = {
      weekday: weekday,
      hour: hour,
      minute: minute,
      repeats: true,
    };
    
    let notificationId;
    if (withAction) {
      notificationId = await scheduleActionNotification(title, body, trigger);
    } else {
      notificationId = await scheduleLocalNotification(title, body, trigger);
    }
    
    if (notificationId) {
      notificationIds.push(notificationId);
    }
  }
  
  return notificationIds;
}

// 모든 알림 취소
export async function cancelAllNotifications() {
  if (isExpoGo || !Notifications) {
    console.log('Cancel notifications not available in Expo Go');
    return;
  }
  
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// 특정 알림 취소
export async function cancelNotification(notificationId) {
  if (isExpoGo || !Notifications) {
    console.log('Cancel notification not available in Expo Go');
    return;
  }
  
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

// 알림 액션 응답 처리
export function addNotificationResponseReceivedListener(callback) {
  if (isExpoGo || !Notifications) {
    console.log('Notification response listener not available in Expo Go');
    return null;
  }
  
  return Notifications.addNotificationResponseReceivedListener((response) => {
    const { actionIdentifier, notification } = response;
    const notificationData = notification.request.content.data;
    
    if (actionIdentifier === 'QUICK_WRITE_ACTION' && notificationData.action === 'quick_write') {
      callback('quick_write', notificationData);
    } else if (actionIdentifier === 'DEFAULT' && notificationData.action === 'quick_write') {
      // 알림 탭 (액션 버튼 없이)
      callback('quick_write', notificationData);
    }
  });
}

// 알림 리스너 제거
export function removeNotificationListener(subscription) {
  if (subscription) {
    subscription.remove();
  }
}

