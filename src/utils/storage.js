import AsyncStorage from '@react-native-async-storage/async-storage';

// 데이터 로드
export const loadData = async () => {
    try {
        const keys = ['emotionHistory', 'streak', 'lastRecordDateKey'];
        const values = await AsyncStorage.multiGet(keys);
        const result = {};
        
        for (const [key, value] of values) {
            if (value) {
                result[key] = value;
            }
        }
        
        return result;
    } catch (error) {
        if (__DEV__) console.log('Load error:', error);
        return {};
    }
};

// 데이터 저장
export const saveData = async (data) => {
    try {
        const saveArray = [
            ['emotionHistory', data.emotionHistory || '[]'],
            ['streak', (data.streak || 0).toString()],
        ];
        await AsyncStorage.multiSet(saveArray);
    } catch (error) {
        if (__DEV__) console.log('Save error:', error);
    }
};

// 모든 데이터 삭제
export const clearAllData = async () => {
    try {
        await AsyncStorage.clear();
        return true;
    } catch (error) {
        if (__DEV__) console.log('Clear error:', error);
        return false;
    }
};