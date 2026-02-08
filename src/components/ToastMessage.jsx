import React from 'react';
import { Text, View, Animated } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { DESIGN } from '../constants/design';
import { styles } from '../styles/appStyles';

export default function ToastMessage({ showToast, toastAnim }) {
    if (!showToast.show) return null;

    return (
        <Animated.View style={[
            styles.toast,
            { transform: [{ translateY: toastAnim }] },
        ]}>
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: showToast.type === 'error' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(201, 169, 98, 0.15)',
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: showToast.type === 'error' ? 'rgba(220, 38, 38, 0.3)' : 'rgba(201, 169, 98, 0.3)',
            }}>
                <Ionicons
                    name={showToast.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
                    size={18}
                    color={showToast.type === 'error' ? '#F87171' : DESIGN.colors.primary}
                />
                <Text style={{
                    marginLeft: 10,
                    fontSize: 14,
                    fontWeight: '500',
                    color: showToast.type === 'error' ? '#F87171' : DESIGN.colors.primary,
                }}>
                    {showToast.message}
                </Text>
            </View>
        </Animated.View>
    );
}
