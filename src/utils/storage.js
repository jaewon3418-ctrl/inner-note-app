import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptData, decryptData, isEncrypted } from './encryption';

// 데이터 로드 (암호화 지원)
export const loadData = async () => {
    try {
        const keys = ['emotionHistory', 'characterLevel', 'characterExp', 'characterHappiness', 'streak', 'lastRecordDateKey'];
        const values = await AsyncStorage.multiGet(keys);
        const result = {};
        
        for (const [key, value] of values) {
            if (value) {
                // emotionHistory만 암호화 대상
                if (key === 'emotionHistory') {
                    if (isEncrypted(value)) {
                        // 암호화된 데이터 복호화
                        const decrypted = await decryptData(value);
                        result[key] = decrypted ? JSON.stringify(decrypted) : '[]';
                    } else {
                        // 기존 평문 데이터 (이전 버전 호환)
                        result[key] = value;
                    }
                } else {
                    result[key] = value;
                }
            }
        }
        
        return result;
    } catch (error) {
        console.log('Load error:', error);
        return {};
    }
};

// 데이터 저장 (민감 데이터 암호화)
export const saveData = async (data) => {
    try {
        let emotionHistoryValue = data.emotionHistory || '[]';
        
        // emotionHistory 암호화
        if (typeof emotionHistoryValue === 'string') {
            const parsed = JSON.parse(emotionHistoryValue);
            emotionHistoryValue = await encryptData(parsed);
        } else {
            emotionHistoryValue = await encryptData(emotionHistoryValue);
        }
        
        const saveArray = [
            ['emotionHistory', emotionHistoryValue], // 암호화됨
            ['characterLevel', (data.characterLevel || 1).toString()],
            ['characterExp', (data.characterExp || 0).toString()],
            ['characterHappiness', (data.characterHappiness || 50).toString()],
            ['streak', (data.streak || 0).toString()],
        ];
        await AsyncStorage.multiSet(saveArray);
    } catch (error) {
        console.log('Save error:', error);
    }
};

// 모든 데이터 삭제 (암호화 키 포함)
export const clearAllData = async () => {
    try {
        // AsyncStorage 모든 데이터 삭제
        await AsyncStorage.clear();
        
        // SecureStore의 암호화 키도 삭제 (완전한 데이터 삭제)
        try {
            const SecureStore = require('expo-secure-store');
            await SecureStore.deleteItemAsync('emotion_app_key');
        } catch (secureError) {
            console.log('SecureStore clear warning:', secureError);
        }
        
        return true;
    } catch (error) {
        console.log('Clear error:', error);
        return false;
    }
};