import React from 'react';
import { Text, View, TouchableOpacity, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../../styles/appStyles';
import { useTranslate } from '../../store/selectors';
import useAppStore from '../../store';

export function AnonymousConfirmModal({
    performAnonymousAnalysis,
}) {
    const translate = useTranslate();
    const visible = useAppStore(s => s.activeConfirm === 'anonymous');
    const closeConfirm = useAppStore(s => s.closeConfirm);
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
            <View style={styles.deleteOverlay}>
                <View style={styles.deleteModal}>
                    <View style={styles.deleteHeader}>
                        <Ionicons name="refresh-outline" size={28} color="#C9A962" />
                        <Text style={styles.deleteTitle}>{translate('getComfort')}</Text>
                    </View>

                    <Text style={styles.deleteDescription}>같은 내용으로 다시 위로를 받을까? 일일 횟수가 차감돼</Text>

                    <View style={styles.deleteActionRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => closeConfirm()}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.confirmDeleteButton}
                            onPress={async () => {
                                closeConfirm();
                                await performAnonymousAnalysis();
                            }}
                        >
                            <Text style={styles.confirmDeleteButtonText}>다시 받기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export function ShortInputConfirmModal({
    performAnonymousAnalysis,
}) {
    const translate = useTranslate();
    const visible = useAppStore(s => s.activeConfirm === 'shortInput');
    const closeConfirm = useAppStore(s => s.closeConfirm);
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
            <View style={styles.deleteOverlay}>
                <View style={styles.deleteModal}>
                    <View style={styles.deleteHeader}>
                        <Ionicons name="create-outline" size={28} color="#C9A962" />
                        <Text style={styles.deleteTitle}>{translate('shortInputTitle')}</Text>
                    </View>

                    <Text style={styles.deleteDescription}>{translate('shortInputMessage')}</Text>

                    <View style={styles.deleteActionRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => closeConfirm()}
                        >
                            <Text style={styles.cancelButtonText}>{translate('writeMore')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.confirmDeleteButton}
                            onPress={async () => {
                                closeConfirm();
                                await performAnonymousAnalysis();
                            }}
                        >
                            <LinearGradient
                                colors={['#C9A962', '#B8985A']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                            />
                            <Text style={styles.confirmDeleteButtonText}>{translate('getComfortNow')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export function ShortDiaryConfirmModal({
    performEmotionAnalysis,
    currentInputText,
}) {
    const translate = useTranslate();
    const visible = useAppStore(s => s.activeConfirm === 'shortDiary');
    const closeConfirm = useAppStore(s => s.closeConfirm);
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
            <View style={styles.deleteOverlay}>
                <View style={styles.deleteModal}>
                    <View style={styles.deleteHeader}>
                        <Ionicons name="create-outline" size={28} color="#C9A962" />
                        <Text style={styles.deleteTitle}>{translate('shortInputTitle')}</Text>
                    </View>

                    <Text style={styles.deleteDescription}>{translate('shortInputMessage')}</Text>

                    <View style={styles.deleteActionRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => closeConfirm()}
                        >
                            <Text style={styles.cancelButtonText}>{translate('writeMore')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.confirmDeleteButton}
                            onPress={async () => {
                                closeConfirm();
                                await performEmotionAnalysis(currentInputText);
                            }}
                        >
                            <LinearGradient
                                colors={['#C9A962', '#B8985A']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                            />
                            <Text style={styles.confirmDeleteButtonText}>{translate('getComfortNow')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
