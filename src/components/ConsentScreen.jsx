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
        title: '개인정보 및 서비스 이용 동의',
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
        alertTitle: '동의 필요',
        errorTitle: '오류',
        errorMessage: '동의 정보 저장 중 오류가 발생했습니다.',
        cannotUse: '앱 사용 불가',
        exitMessage: '홈 버튼을 눌러 앱을 종료해주세요.',
        exitTitle: '앱 종료',
    } : {
        title: 'Privacy & Terms',
        subtitle: 'Please agree to the following terms for safe service usage',

        dataCollectionTitle: '📊 Data Collection',
        dataCollectionDesc: '• Emotion record texts and selected emotional states\n• App usage patterns and feature utilization statistics\n• Character growth data (level, experience, etc.)',
        dataCollectionPurpose: 'Purpose: Personalized emotion analysis and service improvement',

        thirdPartyTitle: '🤖 Third-party Sharing (OpenAI)',
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
        alertTitle: 'Agreement Required',
        errorTitle: 'Error',
        errorMessage: 'An error occurred while saving consent.',
        cannotUse: 'Cannot Use App',
        exitMessage: 'Press the home button to exit the app.',
        exitTitle: 'Exit App',
    };

    const toggleLanguage = async () => {
        const newLanguage = language === 'ko' ? 'en' : 'ko';
        setLanguage(newLanguage);
        await AsyncStorage.setItem('selectedLanguage', newLanguage);
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
            Alert.alert(t.alertTitle, t.incompleteAlert);
            return;
        }

        try {
            await AsyncStorage.setItem('user_consent', JSON.stringify({
                ...agreedItems,
                timestamp: new Date().toISOString(),
                version: '1.0'
            }));

            hapticSuccess();
            onConsentGranted();
        } catch (error) {
            Alert.alert(t.errorTitle, t.errorMessage);
        }
    };

    const handleDisagree = () => {
        Alert.alert(
            t.cannotUse,
            t.confirmDisagree,
            [
                { text: t.cancel, style: 'cancel' },
                {
                    text: t.exit,
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(t.exitTitle, t.exitMessage);
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
                <View style={styles.consentTitleRow}>
                    <Text style={[styles.consentTitle, important && styles.importantTitle]}>
                        {title}
                    </Text>
                    <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                        {agreed && <Ionicons name="checkmark" size={14} color="#0D1117" />}
                    </View>
                </View>
                <Text style={styles.consentDescription}>{description}</Text>
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
                    <View style={styles.agreeAllInner}>
                        <Ionicons name="checkmark-circle" size={18} color="#C9A962" style={styles.agreeAllIcon} />
                        <Text style={styles.agreeAllText}>{t.allAgreeButton}</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={handleStart}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#C9A962', '#B8985A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.buttonGradient}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#0D1117" />
                            <Text style={styles.startButtonText}>{t.startButton}</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.disagreeButton}
                        onPress={handleDisagree}
                    >
                        <Text style={styles.disagreeButtonText}>{t.disagreeButton}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = {
    container: {
        flex: 1,
        backgroundColor: '#0D1117',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginTop: Platform.OS === 'ios' ? 40 : 50,
        marginBottom: 32,
        alignItems: 'center',
        position: 'relative',
    },
    languageButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        position: 'absolute',
        top: -20,
        right: 0,
        zIndex: 10,
    },
    languageText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '300',
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: 0.5,
        marginTop: 20,
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        textAlign: 'center',
        lineHeight: 20,
        fontWeight: '400',
    },
    consentItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
    },
    importantItem: {
        borderColor: 'rgba(201, 169, 98, 0.3)',
        backgroundColor: 'rgba(201, 169, 98, 0.05)',
    },
    consentHeader: {
        alignItems: 'center',
    },
    consentTitleRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        marginBottom: 12,
        position: 'relative',
    },
    consentTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        paddingHorizontal: 36,
    },
    importantTitle: {
        color: '#C9A962',
    },
    consentDescription: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        lineHeight: 20,
        fontWeight: '400',
        textAlign: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        position: 'absolute',
        right: 0,
    },
    checkboxChecked: {
        backgroundColor: '#C9A962',
        borderColor: '#C9A962',
    },
    agreeAllButton: {
        borderRadius: 12,
        marginBottom: 16,
        marginTop: 8,
        backgroundColor: 'rgba(201, 169, 98, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(201, 169, 98, 0.25)',
    },
    agreeAllInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 8,
    },
    agreeAllIcon: {
        marginRight: 4,
    },
    agreeAllText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#C9A962',
    },
    buttonContainer: {
        gap: 12,
        marginBottom: 40,
    },
    startButton: {
        borderRadius: 12,
        overflow: 'hidden',
        ...(Platform.OS === 'ios' && {
            shadowColor: '#C9A962',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        }),
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    startButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#0D1117',
    },
    disagreeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        padding: 16,
        alignItems: 'center',
        borderRadius: 12,
    },
    disagreeButtonText: {
        fontSize: 14,
        fontWeight: '400',
        color: 'rgba(255, 255, 255, 0.5)',
    },
};

export default ConsentScreen;
