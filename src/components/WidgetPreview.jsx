import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Dimensions,
    ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const WidgetPreview = ({ visible, onClose }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
    
    // 위젯 메시지들 (실제 위젯과 동일)
    const messages = [
        "오늘 한 줄을 기록해봐 ✨",
        "마음을 정리할 시간이야",
        "감정을 기록하고 위로받아 🤗",
        "오늘 하루는 어땠어? 📝",
        "잠깐의 기록이 큰 변화를 만들어 🌟",
        "지금 이 순간의 마음을 남겨봐 💭"
    ];

    // 4초마다 메시지 변경 (데모용으로 빠르게)
    useEffect(() => {
        if (!visible) return;
        
        const interval = setInterval(() => {
            setCurrentMessageIndex(prev => (prev + 1) % messages.length);
        }, 4000);

        return () => clearInterval(interval);
    }, [visible, messages.length]);

    const SmallWidget = () => (
        <ImageBackground 
            source={require('../../assets/widget-bg-small.png')}
            style={styles.smallWidget}
            imageStyle={styles.widgetImage}
        >
            <View style={styles.widgetOverlay}>
                <View style={styles.widgetHeader}>
                    <View style={styles.appIcon}>
                        <Ionicons name="book-outline" size={16} color="#C9A962" />
                    </View>
                    <Text style={styles.appName}>DeepLog</Text>
                </View>
                <Text style={styles.widgetMessage} numberOfLines={2}>
                    {messages[currentMessageIndex]}
                </Text>
                <View style={styles.timeIndicator}>
                    <Text style={styles.timeText}>지금</Text>
                </View>
            </View>
        </ImageBackground>
    );

    const MediumWidget = () => (
        <ImageBackground 
            source={require('../../assets/widget-bg-medium.png')}
            style={styles.mediumWidget}
            imageStyle={styles.widgetImage}
        >
            <View style={[styles.widgetOverlay, { padding: 16 }]}>
                <View style={styles.widgetHeader}>
                    <View style={styles.appIcon}>
                        <Ionicons name="book-outline" size={20} color="#C9A962" />
                    </View>
                    <Text style={styles.appName}>DeepLog</Text>
                </View>
                <Text style={styles.widgetTitle}>오늘 한 줄</Text>
                <Text style={styles.widgetMessageLarge}>
                    {messages[currentMessageIndex]}
                </Text>
                <View style={styles.widgetFooter}>
                    <Text style={styles.timeText}>4시간마다 새로운 메시지</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                </View>
            </View>
        </ImageBackground>
    );

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>위젯 미리보기</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Small 위젯</Text>
                    <View style={styles.widgetContainer}>
                        <SmallWidget />
                    </View>

                    <Text style={styles.sectionTitle}>Medium 위젯</Text>
                    <View style={styles.widgetContainer}>
                        <MediumWidget />
                    </View>

                    <View style={styles.infoContainer}>
                        <Text style={styles.infoText}>
                            💡 실제 위젯은 4시간마다 메시지가 바뀌어
                        </Text>
                        <Text style={styles.infoText}>
                            📱 홈 화면에서 위젯을 길게 눌러서 추가할 수 있어
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.addWidgetButton} onPress={onClose}>
                        <Ionicons name="add-circle" size={20} color="#FF6B9D" />
                        <Text style={styles.addWidgetText}>홈 화면에서 위젯 추가하기</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: width * 0.9,
        maxHeight: '80%',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 5,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginTop: 20,
        marginBottom: 10,
    },
    widgetContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    smallWidget: {
        width: 158,
        height: 158,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    mediumWidget: {
        width: 329,
        height: 158,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    widgetImage: {
        borderRadius: 20,
    },
    widgetOverlay: {
        flex: 1,
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
    },
    widgetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    appIcon: {
        width: 20,
        height: 20,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    appName: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    widgetTitle: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    widgetMessage: {
        fontSize: 12,
        color: '#fff',
        lineHeight: 18,
        flex: 1,
        textAlign: 'center',
    },
    widgetMessageLarge: {
        fontSize: 14,
        color: '#fff',
        lineHeight: 20,
        flex: 1,
        textAlign: 'center',
    },
    widgetFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    timeIndicator: {
        alignItems: 'center',
        marginTop: 8,
    },
    timeText: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    infoContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
    },
    infoText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 18,
        marginBottom: 8,
    },
    addWidgetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 107, 157, 0.2)',
        borderRadius: 12,
        padding: 16,
        marginTop: 16,
    },
    addWidgetText: {
        fontSize: 14,
        color: '#FF6B9D',
        fontWeight: '600',
        marginLeft: 8,
    },
});

export default WidgetPreview;