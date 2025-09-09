import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getBackgroundProps } from '../utils/backgroundManager';

export default function BackgroundWrapper({ backgroundId, style, children, ...props }) {
    const backgroundProps = getBackgroundProps(backgroundId);

    if (backgroundProps.type === 'image') {
        return (
            <ImageBackground
                source={backgroundProps.source}
                style={[styles.container, style]}
                resizeMode={backgroundProps.resizeMode}
                {...props}
            >
                {children}
            </ImageBackground>
        );
    }

    // 기본적으로 gradient 타입
    return (
        <LinearGradient
            colors={backgroundProps.colors}
            start={backgroundProps.start}
            end={backgroundProps.end}
            style={[styles.container, style]}
            {...props}
        >
            {children}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});