import React from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../../styles/appStyles';
import useAppStore from '../../store';

export default function BackupPasswordModal({
    backupPassword,
    setBackupPassword,
    exportEncryptedBackup,
}) {
    const visible = useAppStore(s => s.activeModal === 'password');
    const closeModal = useAppStore(s => s.closeModal);
    if (!visible) return null;

    return (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
        <View style={styles.modalOverlay}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.passwordModalContent}>
                    <View style={styles.passwordModalHeader}>
                        <Ionicons name="lock-closed" size={24} color="#4ADE80" />
                        <Text style={styles.passwordModalTitle}>암호화 백업</Text>
                    </View>

                    <View style={styles.passwordModalBody}>
                        <Text style={styles.passwordModalSubtitle}>
                            백업 파일을 보호할 비밀번호를 입력해
                        </Text>
                        <Text style={styles.passwordModalWarning}>
                            ⚠️ 비밀번호를 분실하면 데이터를 복구할 수 없어
                        </Text>

                        <TextInput
                            style={styles.passwordModalInput}
                            value={backupPassword}
                            onChangeText={setBackupPassword}
                            placeholder="4글자 이상의 비밀번호"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            secureTextEntry={true}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                            onSubmitEditing={exportEncryptedBackup}
                        />

                        <Text style={styles.passwordModalRule}>
                            영문, 숫자, 특수문자 사용 가능 (4글자 이상)
                        </Text>
                    </View>

                    <View style={styles.passwordModalButtons}>
                        <TouchableOpacity
                            style={[styles.passwordModalButton, styles.cancelButton]}
                            onPress={() => {
                                closeModal();
                                setBackupPassword('');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.passwordModalButton,
                                styles.confirmButton,
                                (!backupPassword || backupPassword.length < 4) && styles.confirmButtonDisabled
                            ]}
                            onPress={exportEncryptedBackup}
                            disabled={!backupPassword || backupPassword.length < 4}
                        >
                            <LinearGradient
                                colors={(!backupPassword || backupPassword.length < 4)
                                    ? ['#4ade80', '#22c55e']
                                    : ['#4ADE80', '#22C55E']
                                }
                                style={styles.passwordConfirmGradient}
                            >
                                <Ionicons name="shield-checkmark" size={16} color="#fff" />
                                <Text style={styles.confirmButtonText}>암호화 백업</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}
