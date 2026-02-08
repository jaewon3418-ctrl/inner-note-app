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

export default function ImportPasswordModal({
    importPassword,
    setImportPassword,
    setImportFileContent,
    importSecureBackup,
}) {
    const visible = useAppStore(s => s.activeModal === 'importPassword');
    const closeModal = useAppStore(s => s.closeModal);
    if (!visible) return null;

    return (
        <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000 }]}>
            <View style={styles.modalOverlay}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                    <View style={styles.passwordModalContent}>
                        <View style={styles.passwordModalHeader}>
                            <Ionicons name="key-outline" size={24} color="#7dd3fc" />
                            <Text style={styles.passwordModalTitle}>비밀번호 입력</Text>
                        </View>

                        <View style={styles.passwordModalBody}>
                            <Text style={styles.passwordModalSubtitle}>
                                암호화된 백업 파일을 복원하려면 비밀번호를 입력해줘
                            </Text>

                            <TextInput
                                style={styles.passwordModalInput}
                                value={importPassword}
                                onChangeText={setImportPassword}
                                placeholder="백업 시 사용한 비밀번호"
                                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                                secureTextEntry={true}
                                autoCapitalize="none"
                                autoCorrect={false}
                                returnKeyType="done"
                                onSubmitEditing={() => importSecureBackup(importPassword)}
                            />
                        </View>

                        <View style={styles.passwordModalButtons}>
                            <TouchableOpacity
                                style={[styles.passwordModalButton, styles.cancelButton]}
                                onPress={() => {
                                    closeModal();
                                    setImportPassword('');
                                    setImportFileContent(null);
                                }}
                            >
                                <Text style={styles.cancelButtonText}>취소</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.passwordModalButton,
                                    styles.confirmButton,
                                    (!importPassword || importPassword.length < 4) && styles.confirmButtonDisabled
                                ]}
                                onPress={() => importSecureBackup(importPassword)}
                                disabled={!importPassword || importPassword.length < 4}
                            >
                                <LinearGradient
                                    colors={(!importPassword || importPassword.length < 4)
                                        ? ['#818cf8', '#6366f1']
                                        : ['#818CF8', '#6366F1']
                                    }
                                    style={styles.passwordConfirmGradient}
                                >
                                    <Ionicons name="cloud-download" size={16} color="#fff" />
                                    <Text style={styles.confirmButtonText}>복원</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}
