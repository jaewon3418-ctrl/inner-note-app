import React from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as LocalAuthentication from 'expo-local-authentication';
import { styles } from '../../styles/appStyles';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function LockScreen({
    showToastMessage,
}) {
    const { translate } = useLanguage();
    const setIsAppLocked = useAppStore(s => s.setIsAppLocked);
    return (
        <SafeAreaView style={[styles.container, { backgroundColor: '#0D1117' }]} edges={[]}>
            <StatusBar barStyle="light-content" hidden={true} />
            <View style={styles.lockScreen}>
                <View style={styles.lockIconContainer}>
                    <Ionicons name="lock-closed" size={48} color="#C9A962" />
                </View>
                <Text style={styles.lockTitle}>
                    {translate('lockTitle')}
                </Text>
                <Text style={styles.lockDescription}>
                    {translate('lockDesc')}
                </Text>

                <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={async () => {
                        try {
                            const result = await LocalAuthentication.authenticateAsync({
                                promptMessage: translate('authPrompt'),
                                cancelLabel: translate('cancel'),
                                disableDeviceFallback: false,
                            });

                            if (result.success) {
                                setIsAppLocked(false);
                            }
                        } catch (error) {
                            showToastMessage(
                                translate('authFailed'),
                                'error'
                            );
                        }
                    }}
                >
                    <LinearGradient
                        colors={['#C9A962', '#B8985A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.lockGradientButton}
                    >
                        <Ionicons name="finger-print" size={22} color="#0D1117" />
                        <Text style={styles.unlockButtonText}>
                            {translate('unlock')}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );

}
