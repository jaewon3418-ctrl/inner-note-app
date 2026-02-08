import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import useAppStore from '../store';
import { useTranslate } from '../store/selectors';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticError } from '../utils/safeHaptics';
import { encryptBackupData_CTR_HMAC, decryptBackupData_CTR_HMAC } from '../utils/cryptoExport';
import { saveEncryptedData, deleteAllEncryptedData } from '../utils/secureStorage';

export default function useBackupRestore({ showToastMessage, loadData }) {
    const translate = useTranslate();
    const openModal = useAppStore(s => s.openModal);
    const closeModal = useAppStore(s => s.closeModal);
    const [backupPassword, setBackupPassword] = useState('');
    const [importPassword, setImportPassword] = useState('');
    const [importFileContent, setImportFileContent] = useState(null);

    const exportSecureBackup = async () => {
        const { language } = useAppStore.getState();
        Alert.alert(
            language === 'ko' ? '🔒 백업 옵션 선택' : '🔒 Backup Options',
            language === 'ko'
                ? '데이터를 어떻게 백업하시겠습니까?\n\n🔐 암호화: 비밀번호로 안전하게 보호\n📄 평문: 암호화하지 않음 (주의 필요)'
                : 'How would you like to backup your data?\n\n🔐 Encrypted: Protected with password\n📄 Plain: No encryption (handle with care)',
            [
                { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                { text: language === 'ko' ? '평문 백업' : 'Plain Backup', style: 'default', onPress: exportPlainBackup },
                {
                    text: language === 'ko' ? '암호화 백업' : 'Encrypted Backup',
                    style: 'default',
                    onPress: () => {
                        setBackupPassword('');
                        openModal('password');
                    }
                }
            ]
        );
    };

    const exportEncryptedBackup = async () => {
        const { emotionHistory, savedChatSessions, streak, language } = useAppStore.getState();
        if (!backupPassword || backupPassword.length < 4) {
            Alert.alert(
                language === 'ko' ? '비밀번호 오류' : 'Password Error',
                language === 'ko' ? '4글자 이상의 비밀번호를 입력해줘!' : 'Please enter a password with at least 4 characters.'
            );
            return;
        }

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: language === 'ko' ? '암호화 백업을 위해 인증해줘' : 'Authenticate for encrypted backup',
                fallbackLabel: language === 'ko' ? '비밀번호 사용' : 'Use Password',
            });

            if (!result.success) {
                Alert.alert(
                    language === 'ko' ? '인증 실패' : 'Authentication Failed',
                    language === 'ko' ? '백업을 취소했어' : 'Backup cancelled.'
                );
                return;
            }

            const backup = {
                emotionHistory,
                chatSessions: savedChatSessions,
                streak,
                language,
                exportDate: new Date().toISOString(),
                encrypted: true,
            };

            const dataString = JSON.stringify(backup);
            const encrypted = await encryptBackupData_CTR_HMAC(dataString, backupPassword);

            const encryptedBackup = {
                encrypted: true,
                data: encrypted,
                version: '2.1',
                exportDate: new Date().toISOString(),
            };

            const uri = FileSystem.documentDirectory + `healingemotion-encrypted-${new Date().toISOString().slice(0,10)}.ait`;
            await FileSystem.writeAsStringAsync(uri, JSON.stringify(encryptedBackup, null, 2));

            closeModal();
            setBackupPassword('');

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/octet-stream',
                    dialogTitle: language === 'ko' ? '🔐 암호화된 감정 백업 파일 (.ait)' : '🔐 Encrypted emotion backup file (.ait)',
                });
                showToastMessage(language === 'ko' ? '🔒 암호화 백업 완료!' : '🔒 Encrypted backup completed');
            } else {
                Alert.alert(
                    language === 'ko' ? '백업 완료' : 'Backup Complete',
                    language === 'ko' ? '암호화된 파일이 생성됐어' : 'Encrypted file has been created'
                );
            }
        } catch (error) {
            console.error('Encrypted backup error:', error);
            const lang = useAppStore.getState().language;
            Alert.alert(
                lang === 'ko' ? '오류' : 'Error',
                lang === 'ko' ? '암호화 백업 중 오류가 났어' : 'An error occurred during encrypted backup.'
            );
            closeModal();
            setBackupPassword('');
        }
    };

    const exportPlainBackup = async () => {
        const { emotionHistory, savedChatSessions, streak, language } = useAppStore.getState();
        Alert.alert(
            language === 'ko' ? '⚠️ 평문 백업 주의' : '⚠️ Plain Backup Warning',
            language === 'ko'
                ? '암호화되지 않은 파일로 백업돼.\n\n개인적인 감정 기록이 포함되어 있으니 안전한 장소에만 보관하고 신뢰할 수 있는 사람과만 공유해!'
                : 'This will create an unencrypted backup file.\n\nSince it contains personal emotion records, please store it in a safe place and share only with trusted people.',
            [
                { text: language === 'ko' ? '취소' : 'Cancel', style: 'cancel' },
                {
                    text: language === 'ko' ? '확인 후 백업' : 'Proceed with Backup',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const authResult = await LocalAuthentication.authenticateAsync({
                                promptMessage: language === 'ko' ? '평문 백업을 위해 인증해줘' : 'Authenticate for plain backup',
                                fallbackLabel: language === 'ko' ? '비밀번호 사용' : 'Use Password',
                            });

                            if (!authResult.success) {
                                Alert.alert(
                                    language === 'ko' ? '인증 실패' : 'Authentication Failed',
                                    language === 'ko' ? '백업을 취소했어' : 'Backup cancelled.'
                                );
                                return;
                            }

                            const backup = {
                                emotionHistory,
                                chatSessions: savedChatSessions,
                                streak,
                                language,
                                exportDate: new Date().toISOString(),
                                encrypted: false,
                            };

                            const uri = FileSystem.documentDirectory + `healingemotion-plain-${new Date().toISOString().slice(0,10)}.ait`;
                            await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2));

                            if (await Sharing.isAvailableAsync()) {
                                await Sharing.shareAsync(uri, {
                                    mimeType: 'application/octet-stream',
                                    dialogTitle: language === 'ko' ? '📄 평문 감정 백업 파일 (.ait - 주의 필요)' : '📄 Plain emotion backup file (.ait - Handle with care)',
                                });
                                showToastMessage(language === 'ko' ? '평문 백업 완료!' : 'Plain text backup completed');
                            } else {
                                Alert.alert(
                                    language === 'ko' ? '백업 완료' : 'Backup Complete',
                                    language === 'ko' ? '파일이 생성됐어' : 'File has been created'
                                );
                            }
                        } catch (error) {
                            if (error.code === 'UserCancel') {
                                const lang = useAppStore.getState().language;
                                Alert.alert(
                                    lang === 'ko' ? '취소됨' : 'Cancelled',
                                    lang === 'ko' ? '백업을 취소했어' : 'Backup has been cancelled.'
                                );
                            } else {
                                const lang = useAppStore.getState().language;
                                showToastMessage(lang === 'ko' ? '백업 중 오류가 났어' : 'Error during backup', 'error');
                            }
                        }
                    }
                }
            ]
        );
    };

    const importSecureBackup = useCallback(async (password = null) => {
        try {
            let fileContent = importFileContent;
            if (!fileContent) {
                showToastMessage(translate('importCanceled'), 'error');
                return;
            }

            const parsedBackup = JSON.parse(fileContent);
            let decryptedData;

            if (parsedBackup.encrypted) {
                if (!password) {
                    setImportFileContent(fileContent);
                    openModal('importPassword');
                    return;
                }
                decryptedData = JSON.parse(await decryptBackupData_CTR_HMAC(parsedBackup.data, password));
            } else {
                decryptedData = parsedBackup;
            }

            const { clearAllData } = require('../utils/storage');
            await clearAllData();
            await deleteAllEncryptedData();

            // 메모리 상태 일괄 초기화 후 새 데이터 적용
            useAppStore.setState({
                emotionHistory: decryptedData.emotionHistory || [],
                streak: parseInt(decryptedData.streak) || 0,
                language: decryptedData.language || 'ko',
                appLockEnabled: false,
                completedActivities: {},
                currentTab: 'home',
                dailyDiaryCount: 0,
                dailyAnonymousCount: 0,
                lastDiaryDate: '',
                dailyChatTurns: 0,
                sessionChatTurns: 0,
                chatHistory: [],
                savedChatSessions: [],
            });

            // 채팅 세션 복원 및 마이그레이션
            if (decryptedData.chatSessions && Array.isArray(decryptedData.chatSessions)) {
                const migratedSessions = decryptedData.chatSessions.map(session => {
                    if (!session.id) {
                        return {
                            ...session,
                            id: (session.timestamp || Date.now()).toString() + Math.random().toString(36).substr(2, 9)
                        };
                    }
                    return session;
                });
                useAppStore.setState({ savedChatSessions: migratedSessions });
                await saveEncryptedData('chatSessions', migratedSessions);
            }

            await AsyncStorage.setItem('language', decryptedData.language || 'ko');
            await AsyncStorage.setItem('streak', (decryptedData.streak || 0).toString());
            await saveEncryptedData('emotionHistory', decryptedData.emotionHistory || []);

            showToastMessage(translate('importSuccess'));
            hapticSuccess();
            closeModal();
            setImportPassword('');
            setImportFileContent(null);
            loadData();
        } catch (error) {
            console.error('Import backup error:', error);
            let errorMessage = translate('importFailed');
            if (error.message.includes('Integrity check failed')) {
                errorMessage = translate('importFailedWrongPassword');
            } else if (error.message.includes('Unsupported backup format')) {
                errorMessage = translate('importFailedUnsupportedFormat');
            } else if (error.message.includes('Password must be at least 4 characters')) {
                errorMessage = translate('importFailedShortPassword');
            }
            showToastMessage(errorMessage, 'error');
            hapticError();
            closeModal();
            setImportPassword('');
            setImportFileContent(null);
        }
    }, [showToastMessage, translate, importFileContent, loadData]);

    return {
        backupPassword,
        setBackupPassword,
        importPassword,
        setImportPassword,
        importFileContent,
        setImportFileContent,
        exportSecureBackup,
        exportEncryptedBackup,
        importSecureBackup,
    };
}
