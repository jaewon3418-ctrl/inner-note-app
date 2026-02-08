import React from 'react';
import {
    Text,
    View,
    TextInput,
    TouchableOpacity,
    Modal,
    Platform,
    KeyboardAvoidingView,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess } from '../../utils/safeHaptics';
import { styles } from '../../styles/appStyles';
import { useLanguage } from '../../store/selectors';
import useAppStore from '../../store';

export default function NameChangeModal({
    tempNameInput,
    setTempNameInput,
    showToastMessage,
}) {
    const { translate } = useLanguage();
    const visible = useAppStore(s => s.activeModal === 'nameChange');
    const closeModal = useAppStore(s => s.closeModal);
    const setUserName = useAppStore(s => s.setUserName);
    const handleSubmit = async () => {
        if (tempNameInput.trim()) {
            const name = tempNameInput.trim();
            setUserName(name);
            await AsyncStorage.setItem('userName', name);
            closeModal();
            setTempNameInput('');
            hapticSuccess();
            showToastMessage(translate('nameChanged'));
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.deleteOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                        <View style={styles.deleteModal}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => {
                                    closeModal();
                                    setTempNameInput('');
                                }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={24} color="rgba(255, 255, 255, 0.6)" />
                            </TouchableOpacity>
                            <View style={styles.deleteHeader}>
                                <Text style={styles.nameModalEmoji}>✏️</Text>
                                <Text style={styles.deleteTitle}>
                                    {translate('nameChangeTitle')}
                                </Text>
                            </View>

                            <Text style={styles.deleteDescription}>
                                {translate('nameChangeDesc')}
                            </Text>

                            <TextInput
                                style={styles.nameInput}
                                value={tempNameInput}
                                onChangeText={setTempNameInput}
                                placeholder={translate('namePlaceholder')}
                                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                                autoFocus={true}
                                maxLength={20}
                                returnKeyType="done"
                                onSubmitEditing={handleSubmit}
                            />

                            <TouchableOpacity
                                style={styles.nameConfirmButton}
                                onPress={handleSubmit}
                            >
                                <LinearGradient
                                    colors={['#C9A962', '#B8985A']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.nameConfirmGradient}
                                >
                                    <Text style={styles.nameConfirmButtonText}>
                                        {translate('change')}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}
