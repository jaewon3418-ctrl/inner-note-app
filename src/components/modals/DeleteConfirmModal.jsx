import React from 'react';
import { Text, View, TouchableOpacity, Modal } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../../styles/appStyles';
import useAppStore from '../../store';

export default function DeleteConfirmModal({
    softDeleteEntry,
}) {
    const visible = useAppStore(s => s.activeConfirm === 'delete');
    const closeConfirm = useAppStore(s => s.closeConfirm);
    const deleteItemId = useAppStore(s => s.deleteItemId);
    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent={true}>
            <View style={styles.deleteOverlay}>
                <View style={styles.deleteModal}>
                    <View style={styles.deleteHeader}>
                        <Ionicons name="trash-outline" size={28} color="#ef4444" />
                        <Text style={styles.deleteTitle}>기록을 삭제할까요?</Text>
                    </View>

                    <Text style={styles.deleteDescription}>삭제된 기록은 휴지통에서 복원할 수 있어</Text>

                    <View style={styles.deleteActionRow}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => closeConfirm()}
                        >
                            <Text style={styles.cancelButtonText}>취소</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.confirmDeleteButton}
                            onPress={() => softDeleteEntry(deleteItemId)}
                        >
                            <Text style={styles.confirmDeleteButtonText}>삭제하기</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
