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
      return;
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
  }

  return token;
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

// 특정 시간에 알림 예약
export async function scheduleDailyNotification(title, body, hour, minute) {
  if (isExpoGo || !Notifications) {
    console.log('Daily notifications are not available in Expo Go');
    return null;
  }
  
  const trigger = {
    hour: hour,
    minute: minute,
    repeats: true,
  };
  
  return await scheduleLocalNotification(title, body, trigger);
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