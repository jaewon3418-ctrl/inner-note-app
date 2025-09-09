import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    ScrollView,
    Dimensions,
    ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BACKGROUND_OPTIONS } from '../utils/backgroundManager';

const { width } = Dimensions.get('window');

export default function BackgroundSelector({ visible, onClose, onSelect, currentBackground, language = 'ko' }) {
    const [selectedBackground, setSelectedBackground] = useState(currentBackground || 'night-sky');

    useEffect(() => {
        if (currentBackground) {
            setSelectedBackground(currentBackground);
        }
    }, [currentBackground]);

    const handleSelect = async (backgroundId) => {
        setSelectedBackground(backgroundId);
        try {
            await AsyncStorage.setItem('selectedBackground', backgroundId);
            onSelect(backgroundId);
        } catch (error) {
            console.error('배경 저장 실패:', error);
        }
    };

    const renderBackgroundPreview = (option) => {
        if (option.type === 'gradient') {
            return (
                <LinearGradient
                    colors={option.colors}
                    style={styles.backgroundPreview}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />
            );
        } else if (option.type === 'image') {
            return (
                <ImageBackground
                    source={option.source}
                    style={[styles.backgroundPreview, { overflow: 'hidden' }]}
                    resizeMode="cover"
                />
            );
        }
        return <View style={[styles.backgroundPreview, { backgroundColor: option.color }]} />;
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{language === 'ko' ? '배경 선택' : 'Choose Background'}</Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.optionsContainer}>
                        {BACKGROUND_OPTIONS.map((option) => (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.backgroundOption,
                                    selectedBackground === option.id && styles.selectedOption
                                ]}
                                onPress={() => handleSelect(option.id)}
                            >
                                {renderBackgroundPreview(option)}
                                <Text style={styles.backgroundName}>
                                    {language === 'ko' ? option.name_ko : option.name_en}
                                </Text>
                                {selectedBackground === option.id && (
                                    <Ionicons 
                                        name="checkmark-circle" 
                                        size={24} 
                                        color="#4ADE80" 
                                        style={styles.checkIcon}
                                    />
                                )}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'rgba(51, 65, 85, 0.95)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        maxHeight: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 5,
    },
    optionsContainer: {
        padding: 20,
    },
    backgroundOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        marginBottom: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedOption: {
        borderColor: '#4ADE80',
        backgroundColor: 'rgba(74, 222, 128, 0.1)',
    },
    backgroundPreview: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    backgroundName: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
    },
    checkIcon: {
        marginLeft: 10,
    },
});