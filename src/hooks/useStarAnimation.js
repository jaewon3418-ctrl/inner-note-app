import { useState, useEffect, useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import useAppStore from '../store';

export default function useStarAnimation() {
    const currentTab = useAppStore(s => s.currentTab);
    const showResultSheet = useAppStore(s => s.activeModal === 'resultSheet');
    const [stars, setStars] = useState([]);
    const starsRunningRef = useRef(false);
    const starTimeoutsRef = useRef([]);

    const createStars = () => {
        const newStars = [];
        const starCount = 30;

        for (let i = 0; i < starCount; i++) {
            const isSpecialStar = Math.random() < 0.15;
            const star = {
                id: i,
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: isSpecialStar ? Math.random() * 4 + 3 : Math.random() * 2.5 + 1,
                opacity: new Animated.Value(Math.random() * 0.6 + 0.2),
                delay: Math.random() * 3000,
                isSpecial: isSpecialStar,
                twinkleSpeed: isSpecialStar ? 800 + Math.random() * 600 : 1200 + Math.random() * 1000,
            };
            newStars.push(star);
        }

        return newStars;
    };

    const startStarAnimation = useCallback(() => {
        if (starsRunningRef.current || stars.length === 0) return;

        starsRunningRef.current = true;
        starTimeoutsRef.current = stars.map((star) => {
            const timeoutId = setTimeout(() => {
                const animate = () => {
                    if (!starsRunningRef.current) return;

                    const maxBrightness = star.isSpecial ? 1.0 : 0.9;
                    const minBrightness = star.isSpecial ? 0.4 : 0.1;

                    Animated.sequence([
                        Animated.timing(star.opacity, {
                            toValue: maxBrightness,
                            duration: star.twinkleSpeed,
                            useNativeDriver: true,
                        }),
                        Animated.timing(star.opacity, {
                            toValue: minBrightness,
                            duration: star.twinkleSpeed,
                            useNativeDriver: true,
                        }),
                    ]).start(() => {
                        if (starsRunningRef.current) {
                            animate();
                        }
                    });
                };
                animate();
            }, star.delay);

            return timeoutId;
        });
    }, [stars]);

    const stopStarAnimation = useCallback(() => {
        starsRunningRef.current = false;

        starTimeoutsRef.current.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        starTimeoutsRef.current = [];

        stars.forEach(star => {
            star.opacity.stopAnimation?.();
        });
    }, [stars]);

    // 별빛 효과 초기화 (한 번만)
    useEffect(() => {
        const newStars = createStars();
        setStars(newStars);
    }, []);

    // 별빛 애니메이션 제어 (조건 변경 시)
    useEffect(() => {
        if (stars.length > 0 && currentTab === 'home' && !showResultSheet) {
            startStarAnimation();
        } else {
            stopStarAnimation();
        }

        return stopStarAnimation;
    }, [stars, currentTab, showResultSheet, startStarAnimation, stopStarAnimation]);

    return { stars };
}
