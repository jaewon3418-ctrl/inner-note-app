import React, { useState, memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    Platform,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, safeHapticImpact } from '../utils/safeHaptics';

const ConsentScreen = ({ onConsentGranted, onLanguageChange, language: initialLanguage = 'ko' }) => {
    const [language, setLanguage] = useState(initialLanguage);
    const [agreedItems, setAgreedItems] = useState({
        dataCollection: false,
        thirdPartySharing: false,
        medicalDisclaimer: false,
        userRights: false,
    });

    const t = language === 'ko' ? {
        title: '개인정보 처리 및 서비스 이용 동의',
        subtitle: '안전한 서비스 이용을 위해 다음 사항에 동의해주세요',
        
        dataCollectionTitle: '📊 개인정보 수집 및 이용',
        dataCollectionDesc: '• 감정 기록 텍스트 및 선택한 감정 상태\n• 앱 사용 패턴 및 기능 활용 통계\n• 캐릭터 성장 데이터 (레벨, 경험치 등)',
        dataCollectionPurpose: '목적: 개인화된 감정 분석 및 서비스 개선',
        
        thirdPartyTitle: '🤖 제3자 데이터 공유 (OpenAI)',
        thirdPartyDesc: '• 감정 분석을 위해 작성하신 텍스트를 OpenAI로 전송\n• 전송된 데이터는 AI 분석 후 즉시 삭제\n• 광고나 마케팅 목적으로 사용되지 않음',
        thirdPartyWarning: '⚠️ 민감한 개인정보는 기록하지 마세요',
        
        medicalTitle: '⚠️ 의료 면책 조항 (필수 확인)',
        medicalDesc: '본 앱은 의료 조언, 진단, 치료를 제공하지 않습니다.\n\n정신건강 전문가의 조언을 대체할 수 없으며, 심각한 감정적 어려움이나 위기 상황에서는 반드시 전문의와 상담하세요.',
        emergencyInfo: '🚨 응급상황 시:\n• 한국: 119 (응급실), 1577-0199 (생명의전화)\n• 청소년: 1388 (청소년상담)\n\n💬 상담이 필요하면 언제든 전문가에게 도움을 요청하세요.',
        
        userRightsTitle: '👤 사용자 권리',
        userRightsDesc: '• 언제든 개인정보 처리 동의를 철회할 수 있습니다\n• 수집된 데이터의 열람, 수정, 삭제를 요청할 수 있습니다\n• 설정 메뉴에서 모든 데이터를 삭제할 수 있습니다',
        
        allAgreeButton: '모두 동의',
        startButton: '동의하고 시작하기',
        disagreeButton: '동의하지 않음',
        
        incompleteAlert: '모든 항목에 동의해야 앱을 사용할 수 있습니다.',
        confirmDisagree: '동의하지 않으면 앱을 사용할 수 없습니다. 정말 종료하시겠습니까?',
        
        agree: '동의',
        disagree: '동의 안함',
        cancel: '취소',
        exit: '앱 종료',
    } : {
        title: 'Privacy Policy and Terms of Service Agreement',
        subtitle: 'Please agree to the following terms for safe service usage',
        
        dataCollectionTitle: '📊 Personal Data Collection and Usage',
        dataCollectionDesc: '• Emotion record texts and selected emotional states\n• App usage patterns and feature utilization statistics\n• Character growth data (level, experience, etc.)',
        dataCollectionPurpose: 'Purpose: Personalized emotion analysis and service improvement',
        
        thirdPartyTitle: '🤖 Third-party Data Sharing (OpenAI)',
        thirdPartyDesc: '• Text you write is sent to OpenAI for emotion analysis\n• Transmitted data is deleted immediately after AI analysis\n• Not used for advertising or marketing purposes',
        thirdPartyWarning: '⚠️ Please do not record sensitive personal information',
        
        medicalTitle: '⚠️ Medical Disclaimer (Required)',
        medicalDesc: 'This app does not provide medical advice, diagnosis, or treatment.\n\nIt cannot replace advice from mental health professionals. Please consult with a professional for serious emotional difficulties or crisis situations.',
        emergencyInfo: '🚨 Emergency contacts:\n• US: 911 (Emergency), 988 (Crisis Hotline)\n• Korea: 119 (Emergency), 1577-0199 (Lifeline)\n\n💬 Seek professional help whenever needed.',
        
        userRightsTitle: '👤 User Rights',
        userRightsDesc: '• You can withdraw consent for personal data processing at any time\n• You can request access, modification, or deletion of collected data\n• You can delete all data in the settings menu',
        
        allAgreeButton: 'Agree to All',
        startButton: 'Agree and Start',
        disagreeButton: 'Disagree',
        
        incompleteAlert: 'You must agree to all terms to use the app.',
        confirmDisagree: 'You cannot use the app without agreeing. Do you really want to exit?',
        
        agree: 'Agree',
        disagree: 'Disagree',
        cancel: 'Cancel',
        exit: 'Exit App',
    };

    const toggleLanguage = async () => {
        const newLanguage = language === 'ko' ? 'en' : 'ko';
        setLanguage(newLanguage);
        // 언어 설정을 저장
        await AsyncStorage.setItem('selectedLanguage', newLanguage);
        // 부모 컴포넌트에 언어 변경 알림
        if (onLanguageChange) {
            onLanguageChange(newLanguage);
        }
        safeHapticImpact('Light');
    };

    const toggleAgreement = (key) => {
        setAgreedItems(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
        safeHapticImpact('Light');
    };

    const agreeToAll = () => {
        setAgreedItems({
            dataCollection: true,
            thirdPartySharing: true,
            medicalDisclaimer: true,
            userRights: true,
        });
        safeHapticImpact('Medium');
    };

    const handleStart = async () => {
        const allAgreed = Object.values(agreedItems).every(agreed => agreed);
        
        if (!allAgreed) {
            Alert.alert('동의 필요', t.incompleteAlert);
            return;
        }

        try {
            // 동의 정보 저장
            await AsyncStorage.setItem('user_consent', JSON.stringify({
                ...agreedItems,
                timestamp: new Date().toISOString(),
                version: '1.0'
            }));
            
            hapticSuccess();
            onConsentGranted();
        } catch (error) {
            Alert.alert('오류', '동의 정보 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDisagree = () => {
        Alert.alert(
            '앱 사용 불가',
            t.confirmDisagree,
            [
                { text: t.cancel, style: 'cancel' },
                { 
                    text: t.exit, 
                    style: 'destructive',
                    onPress: () => {
                        // React Native에서는 앱 강제 종료가 권장되지 않음
                        // 대신 사용자에게 앱을 직접 닫도록 안내
                        Alert.alert('앱 종료', '홈 버튼을 눌러 앱을 종료해주세요.');
                    }
                }
            ]
        );
    };

    const ConsentItem = memo(({ title, description, agreed, onToggle, important = false }) => (
        <View style={[styles.consentItem, important && styles.importantItem]}>
            <TouchableOpacity 
                onPress={onToggle} 
                style={styles.consentHeader}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={[styles.consentTitle, important && styles.importantTitle]}>
                    {title}
                </Text>
                <Text style={styles.consentDescription}>{description}</Text>
                <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                    {agreed && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
            </TouchableOpacity>
        </View>
    ));

    const ConsentHeader = memo(() => (
        <View style={styles.header}>
            <TouchableOpacity 
                onPress={toggleLanguage} 
                style={styles.languageButton}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={styles.languageText}>{language === 'ko' ? 'EN' : 'KO'}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>{t.title}</Text>
            <Text style={styles.subtitle}>{t.subtitle}</Text>
        </View>
    ));

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" hidden={true} />
            <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.background}
            >
                <ScrollView 
                    style={styles.content} 
                    contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                    scrollEnabled={true}
                    keyboardShouldPersistTaps="handled">
                    <ConsentHeader />

                    <ConsentItem
                        title={t.dataCollectionTitle}
                        description={`${t.dataCollectionDesc}\n\n${t.dataCollectionPurpose}`}
                        agreed={agreedItems.dataCollection}
                        onToggle={() => toggleAgreement('dataCollection')}
                    />

                    <ConsentItem
                        title={t.thirdPartyTitle}
                        description={`${t.thirdPartyDesc}\n\n${t.thirdPartyWarning}`}
                        agreed={agreedItems.thirdPartySharing}
                        onToggle={() => toggleAgreement('thirdPartySharing')}
                    />

                    <ConsentItem
                        title={t.medicalTitle}
                        description={`${t.medicalDesc}\n\n${t.emergencyInfo}`}
                        agreed={agreedItems.medicalDisclaimer}
                        onToggle={() => toggleAgreement('medicalDisclaimer')}
                        important={true}
                    />

                    <ConsentItem
                        title={t.userRightsTitle}
                        description={t.userRightsDesc}
                        agreed={agreedItems.userRights}
                        onToggle={() => toggleAgreement('userRights')}
                    />

                    <TouchableOpacity 
                        style={styles.agreeAllButton} 
                        onPress={agreeToAll}
                        activeOpacity={0.8}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <LinearGradient
                            colors={['#667eea', '#764ba2']}
                            style={styles.agreeAllGradient}
                        >
                            <Ionicons name="checkmark-circle" size={20} color="#fff" style={styles.agreeAllIcon} />
                            <Text style={styles.agreeAllText}>{t.allAgreeButton}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={[styles.button, styles.startButton]} 
                            onPress={handleStart}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={styles.buttonGradient}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.startButtonText}>{t.startButton}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.button, styles.disagreeButton]} 
                            onPress={handleDisagree}
                        >
                            <Text style={styles.disagreeButtonText}>{t.disagreeButton}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
        paddingBottom: 100,
    },
    header: {
        marginTop: Platform.OS === 'ios' ? 20 : 40,
        marginBottom: 30,
        alignItems: 'center',
        position: 'relative',
    },
    languageButton: {
        backgroundColor: '#4a5568',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        minWidth: 50,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: -30,
        right: 0,
        zIndex: 10,
        elevation: 10,
    },
    languageText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: -0.5,
        marginTop: 20,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 22,
    },
    consentItem: {
        backgroundColor: '#334155',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: Platform.OS === 'android' ? 0.05 : 0.1,
        shadowRadius: Platform.OS === 'android' ? 4 : 8,
        elevation: Platform.OS === 'android' ? 2 : 4,
    },
    importantItem: {
        borderWidth: 2,
        borderColor: '#EF4444',
        backgroundColor: '#4a2d2d',
    },
    consentHeader: {
        padding: 5,
        alignItems: 'center',
    },
    consentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 8,
    },
    importantTitle: {
        color: '#EF4444',
    },
    consentDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 16,
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
        // 안드로이드에서만 중첩 방지를 위한 미세 조정
        ...(Platform.OS === 'android' && {
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.3)',
        }),
    },
    checkboxChecked: {
        backgroundColor: '#667eea',
        borderColor: '#667eea',
    },
    agreeAllButton: {
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    agreeAllGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 8,
    },
    agreeAllIcon: {
        marginRight: 4,
    },
    agreeAllText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: -0.3,
    },
    buttonContainer: {
        gap: 12,
        marginBottom: 80,
        marginTop: 0,
    },
    button: {
        borderRadius: 16,
        overflow: 'hidden',
        // 터치 영역 확보
        minHeight: 50,
        position: 'relative',
        zIndex: 1,
    },
    startButton: {
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        // 안드로이드에서만 미세 조정
        ...(Platform.OS === 'android' && {
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 6,
        }),
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        gap: 8,
        // 터치 이벤트 통과 보장 제거 - 버튼이 클릭되도록
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    disagreeButton: {
        backgroundColor: '#3a4556',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        padding: 18,
        alignItems: 'center',
    },
    disagreeButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.7)',
    },
};

export default ConsentScreen;