import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { HELPLINES } from '../../constants/helplines';
import { styles } from '../../styles/appStyles';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function CrisisModal({
    openSafeURL,
    setSelectedQuickEmotion,
    setInputResetSeq,
}) {
    const { language, translate } = useLanguage();
    const visible = useAppStore(s => s.activeModal === 'crisis');
    const closeModal = useAppStore(s => s.closeModal);
    if (!visible) return null;

    return (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
            <View style={[styles.crisisOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <View style={[styles.crisisContent, { backgroundColor: 'rgba(30, 41, 59, 0.98)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' }]}>
                <LinearGradient
                    colors={['#FEF2F2', '#FECACA']}
                    style={styles.crisisHeader}
                >
                    <Ionicons name="alert-circle" size={32} color="#EF4444" />
                    <Text style={styles.crisisTitle}>{translate('crisisTitle')}</Text>
                </LinearGradient>

                <View style={styles.crisisBody}>
                    <Text style={[styles.crisisMessage, null]}>{translate('crisisMessage')}</Text>

                    <View style={styles.crisisHelplines}>
                        <TouchableOpacity
                            style={styles.crisisButton}
                            onPress={() => {
                                const helplines = language === 'en' ? HELPLINES['en-US'] : HELPLINES['ko-KR'];
                                openSafeURL(`tel:${helplines.suicide}`, '전화 앱을 열 수 없어');
                            }}
                        >
                            <LinearGradient
                                colors={['#EF4444', '#DC2626']}
                                style={styles.crisisButtonGradient}
                            >
                                <Ionicons name="call" size={20} color="#fff" />
                                <Text style={styles.crisisButtonText}>
                                    {language === 'en' ? `Crisis Hotline ${HELPLINES['en-US'].suicide}` : `생명의전화 ${HELPLINES['ko-KR'].suicide}`}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.crisisButtonSecondary}
                            onPress={() => {
                                const helplines = language === 'en' ? HELPLINES['en-US'] : HELPLINES['ko-KR'];
                                openSafeURL(`tel:${helplines.youth}`, '전화 앱을 열 수 없어');
                            }}
                        >
                            <Ionicons name="chatbubble-outline" size={20} color="#EF4444" />
                            <Text style={styles.crisisButtonSecondaryText}>
                                {language === 'en' ? `Youth Helpline ${HELPLINES['en-US'].youth}` : `청소년상담 ${HELPLINES['ko-KR'].youth}`}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.crisisDisclaimer, null]}>
                        {translate('crisisDisclaimer')}
                    </Text>

                    <View style={styles.medicalDisclaimer}>
                        <Ionicons name="warning" size={16} color="#EF4444" />
                        <Text style={styles.medicalDisclaimerText}>
                            {language === 'ko' ?
                                '⚠️ 본 앱은 의료 조언을 제공하지 않아. 전문의와 상담해!' :
                                '⚠️ This app does not provide medical advice. Please consult a professional.'
                            }
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.crisisCloseButton}
                    onPress={() => {
                        closeModal();
                        setSelectedQuickEmotion(null);
                        setInputResetSeq(s => s + 1);
                    }}
                >
                    <Text style={[styles.crisisCloseText, { color: '#fff' }]}>{translate('confirm')}</Text>
                </TouchableOpacity>
            </View>
            </View>
        </View>
    );
}
