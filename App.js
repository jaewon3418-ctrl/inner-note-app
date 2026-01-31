import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import HealingEmotionApp from './src/HealingEmotionApp';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
    const [appIsReady, setAppIsReady] = useState(false);

    useEffect(() => {
        async function prepare() {
            try {
                // Pre-load any resources or data here if needed
                await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 splash screen
            } catch (e) {
                console.warn(e);
            } finally {
                // Tell the application to render
                setAppIsReady(true);
            }
        }

        prepare();
    }, []);

    useEffect(() => {
        if (appIsReady) {
            // Hide the splash screen
            SplashScreen.hideAsync();
        }
    }, [appIsReady]);

    if (!appIsReady) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.splashContainer} edges={[]}>
                    <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" translucent={false} />
                    <Image
                        source={require('./assets/splash.png')}
                        style={styles.splashImage}
                        resizeMode="cover"
                    />
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <HealingEmotionApp />
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    splashContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    splashImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
});