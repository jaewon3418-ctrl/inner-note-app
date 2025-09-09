import React, { useEffect, useState } from 'react';
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
                await new Promise(resolve => setTimeout(resolve, 1000)); // Minimal delay
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
        return null;
    }

    return <HealingEmotionApp />;
}