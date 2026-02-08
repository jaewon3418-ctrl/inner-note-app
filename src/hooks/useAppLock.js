import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import useAppStore from '../store';
import { useTranslate } from '../store/selectors';

export default function useAppLock({ showToastMessage }) {
    const appLockEnabled = useAppStore(s => s.appLockEnabled);
    const setAppLockEnabled = useAppStore(s => s.setAppLockEnabled);
    const translate = useTranslate();

    const handleAppLockToggle = useCallback(async () => {
        try {
            if (!appLockEnabled) {
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                if (!hasHardware) {
                    Alert.alert(translate('appLock'), translate('noHardware'));
                    return;
                }
                if (!isEnrolled) {
                    Alert.alert(translate('appLock'), translate('notEnrolled'));
                    return;
                }
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: translate('appLockSetPrompt'),
                    cancelLabel: translate('cancel'),
                });
                if (result.success) {
                    await SecureStore.setItemAsync('appLockEnabled', 'true');
                    setAppLockEnabled(true);
                    showToastMessage(translate('appLockEnabled'));
                }
            } else {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: translate('appLockDisablePrompt'),
                    cancelLabel: translate('cancel'),
                });
                if (result.success) {
                    await SecureStore.deleteItemAsync('appLockEnabled');
                    setAppLockEnabled(false);
                    showToastMessage(translate('appLockDisabled'));
                }
            }
        } catch (error) {
            Alert.alert(translate('confirm'), translate('authError'));
        }
    }, [appLockEnabled, translate, showToastMessage]);

    return { handleAppLockToggle };
}
