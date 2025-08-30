import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    Alert,
    Image,
    Keyboard,
    TouchableWithoutFeedback,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { hapticSuccess, hapticError, safeHapticImpact } from '../utils/safeHaptics';

const CharacterNamingScreen = ({ onNameSet, language = 'ko' }) => {
    const [characterName, setCharacterName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const t = language === 'ko' ? {
        title: '감정 동반자와의 첫 만남 ✨',
        subtitle: '당신의 마음을 이해할 동반자의 이름을 정해주세요',
        placeholder: '동반자의 이름을 입력해주세요',
        suggestions: ['레오', '마야', '다니엘', '코코', '조이'],
        confirmButton: '이름 지어주기',
        characterIntro: '안녕! 나는 너의 감정을 이해하고 함께 성장할 동반자야.\n마음속 이야기를 편하게 들려줘!',
        nameRules: '• 2-8글자로 지어주세요\n• 한글, 영문, 숫자 사용 가능\n• 특수문자는 사용할 수 없습니다',
        emptyNameError: '동반자의 이름을 입력해주세요!',
        invalidNameError: '이름은 2-8글자로 한글, 영문, 숫자만 사용해주세요.',
        welcome: '함께 시작해보아요!',
    } : {
        title: 'Meet Your New Friend! 🐻',
        subtitle: 'Give your bear companion a name',
        placeholder: 'Enter your bear friend\'s name',
        suggestions: ['Daniel', 'Brown', 'Teddy', 'Honey', 'Coco', 'Bear'],
        confirmButton: 'Set Name',
        characterIntro: 'Hello! I\'m a bear who will be your emotional companion.\nLet\'s grow together by sharing heart stories!',
        nameRules: '• 2-8 characters long\n• Korean, English, numbers allowed\n• Special characters not allowed',
        emptyNameError: 'Please enter your bear friend\'s name!',
        invalidNameError: 'Name should be 2-8 characters with Korean, English, or numbers only.',
        welcome: 'Nice to meet you!',
    };

    const validateName = (name) => {
        const trimmedName = name.trim();
        if (trimmedName.length < 2 || trimmedName.length > 8) {
            return false;
        }
        // 한글, 영문, 숫자만 허용
        const validPattern = /^[가-힣a-zA-Z0-9\s]+$/;
        return validPattern.test(trimmedName);
    };

    const handleNameSubmit = async () => {
        if (!characterName.trim()) {
            Alert.alert('이름 입력', t.emptyNameError);
            hapticError();
            return;
        }

        if (!validateName(characterName)) {
            Alert.alert('이름 규칙', t.invalidNameError);
            hapticError();
            return;
        }

        setIsLoading(true);
        safeHapticImpact('Medium');

        try {
            // 잠시 로딩 효과
            setTimeout(() => {
                hapticSuccess();
                onNameSet(characterName.trim());
            }, 1000);
        } catch (error) {
            Alert.alert('오류', '이름 설정 중 오류가 발생했습니다.');
            setIsLoading(false);
        }
    };

    const handleSuggestionPress = (suggestedName) => {
        setCharacterName(suggestedName);
        safeHapticImpact('Light');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" hidden={true} />
            <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.background}
            >
                <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
                    <View style={styles.content}>
                    {/* 헤더 */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{t.title}</Text>
                        <Text style={styles.subtitle}>{t.subtitle}</Text>
                    </View>

                    {/* 캐릭터 이미지 */}
                    <View style={styles.characterContainer}>
                        <View style={styles.characterImageContainer}>
                            <Image
                                source={require('../../assets/bear-character-new2.png')}
                                style={styles.characterImage}
                                resizeMode="contain"
                            />
                            <View style={styles.speechBubble}>
                                <Text style={styles.speechText}>{t.characterIntro}</Text>
                                <View style={styles.bubbleTail} />
                            </View>
                        </View>
                    </View>

                    {/* 이름 입력 섹션 */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputLabel}>동반자의 이름</Text>
                        <TextInput
                            style={styles.nameInput}
                            value={characterName}
                            onChangeText={setCharacterName}
                            placeholder={t.placeholder}
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            maxLength={8}
                            autoCapitalize="words"
                            autoCorrect={false}
                        />
                        
                        {/* 글자 수 표시 */}
                        <Text style={styles.charCount}>
                            {characterName.length}/8
                        </Text>

                        {/* 이름 규칙 */}
                        <View style={styles.rulesContainer}>
                            <Ionicons name="information-circle" size={16} color="#7dd3fc" />
                            <Text style={styles.rulesText}>{t.nameRules}</Text>
                        </View>
                    </View>

                    {/* 추천 이름들 */}
                    <View style={styles.suggestionsContainer}>
                        <Text style={styles.suggestionsTitle}>추천 이름</Text>
                        <View style={styles.suggestionsList}>
                            {t.suggestions.map((name, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.suggestionButton,
                                        characterName === name && styles.suggestionButtonSelected
                                    ]}
                                    onPress={() => handleSuggestionPress(name)}
                                >
                                    <Text style={[
                                        styles.suggestionText,
                                        characterName === name && styles.suggestionTextSelected
                                    ]}>
                                        {name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* 확인 버튼 */}
                    <TouchableOpacity
                        style={[
                            styles.confirmButton,
                            (!characterName.trim() || isLoading) && styles.confirmButtonDisabled
                        ]}
                        onPress={handleNameSubmit}
                        disabled={!characterName.trim() || isLoading}
                    >
                        <LinearGradient
                            colors={(!characterName.trim() || isLoading) 
                                ? ['rgba(102, 126, 234, 0.5)', 'rgba(118, 75, 162, 0.5)']
                                : ['#667eea', '#764ba2']
                            }
                            style={styles.confirmButtonGradient}
                        >
                            {isLoading ? (
                                <>
                                    <View style={styles.loadingSpinner} />
                                    <Text style={styles.confirmButtonText}>설정 중...</Text>
                                </>
                            ) : (
                                <Text style={styles.confirmButtonText}>{t.confirmButton}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            </LinearGradient>
        </View>
    );
};

const styles = {
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginTop: Platform.OS === 'ios' ? 20 : 40,
        marginBottom: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 22,
    },
    characterContainer: {
        alignItems: 'center',
        marginVertical: 20,
    },
    characterImageContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    characterImage: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    speechBubble: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 16,
        maxWidth: 280,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    speechText: {
        fontSize: 14,
        color: '#1e293b',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '500',
    },
    bubbleTail: {
        position: 'absolute',
        top: -8,
        left: '50%',
        marginLeft: -8,
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'rgba(255, 255, 255, 0.95)',
    },
    inputSection: {
        marginBottom: 24,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
        marginBottom: 12,
    },
    nameInput: {
        backgroundColor: 'rgba(51, 65, 85, 0.8)',
        borderRadius: 16,
        padding: 18,
        fontSize: 16,
        color: '#ffffff',
        textAlign: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: 8,
    },
    charCount: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'right',
        marginBottom: 12,
    },
    rulesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(125, 211, 252, 0.1)',
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    rulesText: {
        fontSize: 12,
        color: '#7dd3fc',
        lineHeight: 16,
        flex: 1,
    },
    suggestionsContainer: {
        marginBottom: 32,
    },
    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 12,
    },
    suggestionsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    suggestionButton: {
        backgroundColor: 'rgba(51, 65, 85, 0.6)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
    },
    suggestionButtonSelected: {
        backgroundColor: 'rgba(125, 211, 252, 0.2)',
        borderColor: '#7dd3fc',
    },
    suggestionText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    suggestionTextSelected: {
        color: '#7dd3fc',
        fontWeight: '600',
    },
    confirmButton: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        marginTop: 'auto',
        marginBottom: 20,
        // 안드로이드에서 중첩 방지를 위한 미세 조정
        ...(Platform.OS === 'android' && {
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 6,
        }),
    },
    confirmButtonDisabled: {
        shadowOpacity: 0.1,
        elevation: 2,
        ...(Platform.OS === 'android' && {
            elevation: 1,
        }),
    },
    confirmButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        gap: 8,
        pointerEvents: 'none',
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    loadingSpinner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderTopColor: '#ffffff',
        // React Native에서 회전 애니메이션은 별도 구현 필요
    },
};

export default CharacterNamingScreen;