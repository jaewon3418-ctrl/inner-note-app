import { useEffect } from 'react';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import {
    registerForPushNotificationsAsync,
    scheduleDailyNotification,
    addNotificationResponseReceivedListener,
    removeNotificationListener,
} from '../services/notifications';
import analytics from '../utils/analytics';
import useAppStore from '../store';

const isExpoGo = Constants.appOwnership === 'expo';
let Notifications = null;
if (!isExpoGo) {
    try {
        Notifications = require('expo-notifications');
    } catch (error) {
        console.log('Notifications not available in Expo Go');
    }
}

export default function useNotifications({ inputRef }) {
    useEffect(() => {
        if (!isExpoGo && Notifications) {
            registerForPushNotificationsAsync();

            const setupDailyNotifications = async () => {
                const hasPermission = await registerForPushNotificationsAsync();
                if (!hasPermission) {
                    console.log('Notification permission denied, skipping scheduling');
                    return;
                }

                await Notifications.cancelAllScheduledNotificationsAsync();

                const now = new Date();
                const currentHour = now.getHours();

                if (currentHour < 18) {
                    await scheduleDailyNotification("일기 쓸 시간이야 ✨", "오늘도 수고했어, 마음 정리하고 가자", 18, 0, true);
                }
                if (currentHour < 20) {
                    await scheduleDailyNotification("감정 기록 안 했지? 🤔", "잊지 말고 오늘 하루도 정리해봐", 20, 0, true);
                }
                if (currentHour < 22) {
                    await scheduleDailyNotification("일기 작성 잊은 거 아니지? 📖", "오늘도 하루 마무리는 확실히 하자!", 22, 0, true);
                }

                console.log('Daily notifications scheduled: 6PM, 8PM, 10PM (time-checked)');
            };

            setupDailyNotifications();

            const notificationListener = Notifications.addNotificationReceivedListener(notification => {
                console.log('Notification received:', notification);
            });

            const actionListener = addNotificationResponseReceivedListener((action, data) => {
                if (action === 'quick_write') {
                    useAppStore.setState({ currentTab: 'home' });
                    setTimeout(() => {
                        if (inputRef.current) {
                            inputRef.current.focus();
                        }
                    }, 300);
                }
            });

            const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('Notification clicked:', response);
                useAppStore.setState({ currentTab: 'home' });
            });

            return () => {
                Notifications.removeNotificationSubscription(notificationListener);
                Notifications.removeNotificationSubscription(responseListener);
                removeNotificationListener(actionListener);
            };
        } else {
            console.log('Notifications disabled in Expo Go');
        }
    }, []);
}
