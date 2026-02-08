import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, Animated, Alert, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLanguage } from '../store/selectors';
import useAppStore from '../store';
import { styles } from '../styles/appStyles';

const SettingsTab = ({
    cardFadeAnim,
    setTempNameInput,
    exportSecureBackup,
    importSecureBackup,
    exportUserData,
    showToastMessage,
    revokeConsent,
    resetAllData,
    handleAppLockToggle,
    openSafeURL,
}) => {
    const { language, translate } = useLanguage();
    const setLanguage = useAppStore(s => s.setLanguage);
    const openModal = useAppStore(s => s.openModal);
    const userName = useAppStore(s => s.userName);
    const appLockEnabled = useAppStore(s => s.appLockEnabled);
    const setShowConsentScreen = useAppStore(s => s.setShowConsentScreen);
    return (
        <ScrollView
            keyboardShouldPersistTaps="never"
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={{
                paddingTop: 20,
                paddingBottom: 120,
                paddingHorizontal: 20,
                alignItems: 'center'
            }}
        >
            <View style={styles.newHomeHeader}>
                <Text style={[styles.newHomeGreeting, { fontSize: 28, fontWeight: '200' }]}>{translate('settings')}</Text>
            </View>

            {/* App Settings */}
            <Animated.View style={[{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 16,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)'
            }, { opacity: cardFadeAnim }]}>
                <View style={{ padding: 20 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontWeight: '500', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>{translate('appSettings')}</Text>

                    <View style={styles.settingRowVertical}>
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="language-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                            </View>
                            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('language')}</Text>
                        </View>
                        <View style={styles.languageOptions}>
                            <TouchableOpacity
                                style={[styles.languageOption, language === 'ko' && styles.activeOption]}
                                onPress={() => setLanguage('ko')}
                            >
                                {language === 'ko' && <Ionicons name="checkmark-circle" size={16} color="#C9A962" />}
                                <Text style={[styles.languageText, language === 'ko' && styles.activeText]}>한국어</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.languageOption, language === 'en' && styles.activeOption]}
                                onPress={() => setLanguage('en')}
                            >
                                {language === 'en' && <Ionicons name="checkmark-circle" size={16} color="#C9A962" />}
                                <Text style={[styles.languageText, language === 'en' && styles.activeText]}>English</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginVertical: 12 }} />

                    <TouchableOpacity
                        style={styles.settingRowButton}
                        onPress={() => {
                            setTempNameInput(userName);
                            openModal('nameChange');
                        }}
                    >
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="person-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                            </View>
                            <View>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('nameChangeTitle')}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '400', marginTop: 2 }}>{userName || translate('notSet')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Data Management */}
            <Animated.View style={[{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 16,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)'
            }, { opacity: cardFadeAnim }]}>
                <View style={{ padding: 20 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontWeight: '500', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>{translate('dataManagement')}</Text>
                    <TouchableOpacity style={styles.settingRowButton} onPress={exportSecureBackup}>
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="cloud-upload-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                            </View>
                            <View>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('dataBackup')}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '400', marginTop: 2 }}>{translate('fileExport')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                    <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginVertical: 12 }} />
                    <TouchableOpacity style={styles.settingRowButton} onPress={() => importSecureBackup()}>
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="cloud-download-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                            </View>
                            <View>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('dataRestore')}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '400', marginTop: 2 }}>{translate('fileImport')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                    <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginVertical: 12 }} />
                    <TouchableOpacity style={styles.settingRowButton} onPress={handleAppLockToggle}>
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="finger-print-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                            </View>
                            <View>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('appLock')}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '400', marginTop: 2 }}>{appLockEnabled ? translate('appLockOn') : translate('appLockOff')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Help & Support */}
            <Animated.View style={[{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 16,
                marginBottom: 16,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.06)'
            }, { opacity: cardFadeAnim }]}>
                <View style={{ padding: 20 }}>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, fontWeight: '500', marginBottom: 16, letterSpacing: 0.5, textTransform: 'uppercase' }}>{translate('helpSupport')}</Text>
                    <TouchableOpacity style={styles.settingRowButton} onPress={() => openModal('crisis')}>
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(201, 169, 98, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="heart-outline" size={18} color="#C9A962" />
                            </View>
                            <View>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('crisisSupport')}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '400', marginTop: 2 }}>{translate('crisisHelpline')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                    <View style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.06)', marginVertical: 12 }} />
                    <TouchableOpacity style={styles.settingRowButton} onPress={() => openSafeURL('mailto:jaewon3418@gmail.com', '메일 앱을 열 수 없어. 직접 jaewon3418@gmail.com로 연락해줘!')}>
                        <View style={styles.settingInfo}>
                            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <Ionicons name="mail-outline" size={18} color="rgba(255, 255, 255, 0.6)" />
                            </View>
                            <View>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 15, fontWeight: '400' }}>{translate('contactUs')}</Text>
                                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13, fontWeight: '400', marginTop: 2 }}>{translate('feedbackRequest')}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="rgba(255, 255, 255, 0.3)" />
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Legal Info */}
            <Animated.View style={[{ width: '100%', marginBottom: 40, paddingTop: 24 }, { opacity: cardFadeAnim }]}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 12, fontWeight: '400', textAlign: 'center', lineHeight: 18, marginBottom: 20, paddingHorizontal: 20 }}>{translate('crisisDisclaimer')}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                    <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8 }} onPress={() => Alert.alert(translate('privacyPolicyTitle'), translate('privacyPolicyContent'), [{ text: translate('ok'), style: 'default' }])}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '400' }}>{translate('privacyPolicyTitle')}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: 12 }}>·</Text>
                    <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8 }} onPress={() => Alert.alert(translate('termsTitle'), translate('termsContent'), [{ text: translate('ok'), style: 'default' }])}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '400' }}>{translate('termsTitle')}</Text>
                    </TouchableOpacity>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.2)', fontSize: 12 }}>·</Text>
                    <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8 }} onPress={() => Alert.alert(translate('resetAllTitle'), translate('resetAllMessage'), [{ text: translate('cancel'), style: 'cancel' }, { text: translate('deleteComplete'), style: 'destructive', onPress: resetAllData }])}>
                        <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 12, fontWeight: '400' }}>{translate('deleteAccount')}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </ScrollView>
    );
};

export default SettingsTab;