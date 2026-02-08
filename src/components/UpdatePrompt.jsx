import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    Animated,
    Linking,
    Platform,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

// 디자인 토큰
const COLORS = {
    bgOverlay: 'rgba(0, 0, 0, 0.85)',
    cardBg: '#161B22',
    cardBorder: 'rgba(255, 255, 255, 0.08)',
    primary: '#C9A962',
    primaryLight: '#D4BC7D',
    accent: '#B8985A',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: 'rgba(255, 255, 255, 0.35)',
    ctaGradient: ['#C9A962', '#B8985A'],
};

// App Store ID (앱스토어 URL에서 확인)
const APP_STORE_ID = '6751752636';
const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=com.wodnjs3418.TestApp`;

import useAppStore from '../store';

const UpdatePrompt = () => {
    const language = useAppStore(s => s.language);
    const [visible, setVisible] = useState(false);
    const [latestVersion, setLatestVersion] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    const currentVersion = Constants.expoConfig?.version || '1.0.0';

    const texts = {
        ko: {
            title: '새로운 버전 출시',
            subtitle: '더 나은 경험이 준비되었어요',
            description: '최신 버전으로 업데이트하고\n새로운 기능을 만나보세요.',
            updateBtn: '업데이트',
            laterBtn: '나중에',
            newVersion: '새 버전',
        },
        en: {
            title: 'New Version Available',
            subtitle: 'A better experience awaits',
            description: 'Update to the latest version\nand discover new features.',
            updateBtn: 'Update',
            laterBtn: 'Later',
            newVersion: 'New',
        },
    };

    const t = texts[language] || texts.ko;

    useEffect(() => {
        checkForUpdate();
    }, []);

    useEffect(() => {
        if (visible) {
            // 페이드인 + 스케일 애니메이션
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();

            // 쉬머 애니메이션 (골드 반짝임)
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmerAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [visible]);

    const checkForUpdate = async () => {
        try {
            // 마지막으로 팝업 본 시간 체크 (하루에 한 번만)
            const lastPrompt = await AsyncStorage.getItem('update_prompt_last_shown');
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (lastPrompt && now - parseInt(lastPrompt) < oneDay) {
                return; // 24시간 안 지났으면 스킵
            }

            // App Store에서 최신 버전 확인
            if (Platform.OS === 'ios') {
                const response = await fetch(
                    `https://itunes.apple.com/lookup?id=${APP_STORE_ID}&country=kr`
                );
                const data = await response.json();

                if (data.results && data.results.length > 0) {
                    const storeVersion = data.results[0].version;
                    setLatestVersion(storeVersion);

                    if (isNewerVersion(storeVersion, currentVersion)) {
                        setVisible(true);
                    }
                }
            } else if (Platform.OS === 'android') {
                // Android는 Play Store API가 공개되지 않아서
                // 자체 서버나 Firebase Remote Config 사용 권장
                // 여기서는 간단히 스킵
            }
        } catch (error) {
            console.log('Update check error:', error);
        }
    };

    const isNewerVersion = (latest, current) => {
        const latestParts = latest.split('.').map(Number);
        const currentParts = current.split('.').map(Number);

        for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
            const l = latestParts[i] || 0;
            const c = currentParts[i] || 0;
            if (l > c) return true;
            if (l < c) return false;
        }
        return false;
    };

    const handleUpdate = () => {
        const url = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
        Linking.openURL(url);
        handleClose();
    };

    const handleClose = async () => {
        // 페이드아웃 애니메이션
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 0.9,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
        });

        // 마지막 표시 시간 저장
        await AsyncStorage.setItem('update_prompt_last_shown', Date.now().toString());
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <Animated.View
                style={{
                    flex: 1,
                    backgroundColor: COLORS.bgOverlay,
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: fadeAnim,
                }}
            >
                <Animated.View
                    style={{
                        width: width - 48,
                        maxWidth: 340,
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 24,
                        borderWidth: 1,
                        borderColor: COLORS.cardBorder,
                        overflow: 'hidden',
                        transform: [{ scale: scaleAnim }],
                        // 그림자
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 20 },
                        shadowOpacity: 0.5,
                        shadowRadius: 30,
                        elevation: 20,
                    }}
                >
                    {/* 상단 골드 라인 */}
                    <LinearGradient
                        colors={COLORS.ctaGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ height: 3 }}
                    />

                    {/* 컨텐츠 */}
                    <View style={{ padding: 28 }}>
                        {/* 아이콘 */}
                        <Animated.View
                            style={{
                                alignSelf: 'center',
                                marginBottom: 20,
                                opacity: shimmerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.8, 1],
                                }),
                            }}
                        >
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: 'rgba(201, 169, 98, 0.15)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <Ionicons name="sparkles" size={32} color={COLORS.primary} />
                            </View>
                        </Animated.View>

                        {/* 타이틀 */}
                        <Text
                            style={{
                                fontSize: 22,
                                fontWeight: '300',
                                color: COLORS.textPrimary,
                                textAlign: 'center',
                                letterSpacing: 0.5,
                                marginBottom: 8,
                            }}
                        >
                            {t.title}
                        </Text>

                        {/* 서브타이틀 */}
                        <Text
                            style={{
                                fontSize: 14,
                                fontWeight: '400',
                                color: COLORS.primary,
                                textAlign: 'center',
                                letterSpacing: 0.5,
                                marginBottom: 16,
                            }}
                        >
                            {t.subtitle}
                        </Text>

                        {/* 버전 배지 */}
                        {latestVersion && (
                            <View
                                style={{
                                    alignSelf: 'center',
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: 'rgba(201, 169, 98, 0.1)',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: COLORS.textMuted,
                                        marginRight: 8,
                                    }}
                                >
                                    {currentVersion}
                                </Text>
                                <Ionicons name="arrow-forward" size={12} color={COLORS.primary} />
                                <Text
                                    style={{
                                        fontSize: 12,
                                        color: COLORS.primary,
                                        fontWeight: '600',
                                        marginLeft: 8,
                                    }}
                                >
                                    {latestVersion} {t.newVersion}
                                </Text>
                            </View>
                        )}

                        {/* 설명 */}
                        <Text
                            style={{
                                fontSize: 14,
                                color: COLORS.textSecondary,
                                textAlign: 'center',
                                lineHeight: 22,
                                marginBottom: 28,
                            }}
                        >
                            {t.description}
                        </Text>

                        {/* 버튼들 */}
                        <View style={{ gap: 12 }}>
                            {/* 업데이트 버튼 */}
                            <TouchableOpacity
                                onPress={handleUpdate}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={COLORS.ctaGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{
                                        paddingVertical: 16,
                                        borderRadius: 14,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 15,
                                            fontWeight: '600',
                                            color: '#0D1117',
                                            letterSpacing: 0.5,
                                        }}
                                    >
                                        {t.updateBtn}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            {/* 나중에 버튼 */}
                            <TouchableOpacity
                                onPress={handleClose}
                                activeOpacity={0.7}
                                style={{
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 14,
                                        fontWeight: '500',
                                        color: COLORS.textMuted,
                                        letterSpacing: 0.5,
                                    }}
                                >
                                    {t.laterBtn}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

export default UpdatePrompt;
