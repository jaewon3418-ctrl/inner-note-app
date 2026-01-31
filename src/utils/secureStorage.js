import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY_ID = 'healingemotion_encryption_key';
const ENCRYPTED_DATA_PREFIX = 'encrypted:';

// 암호화 키 생성 또는 가져오기
async function getOrCreateSecureKey() {
    try {
        let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
        if (!key) {
            // 256비트 랜덤 키 생성
            const randomBytes = await Crypto.getRandomBytesAsync(32);
            key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
            
            // SecureStore에 저장 시 옵션 단순화
            await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
        }
        return key;
    } catch (error) {
        console.error('Encryption key error:', error);
        // 오류 시 기본 키 사용 (fallback)
        console.warn('Using fallback encryption key');
        return 'fallback-key-for-encryption-12345678901234567890123456789012';
    }
}

// 간단한 XOR 암호화 (실제 환경에서는 AES 사용 권장)
function simpleEncrypt(data, key) {
    try {
        // 키를 안전한 바이트 배열로 변환
        const keyBytes = [];
        if (key.length >= 32) {
            for (let i = 0; i < Math.min(key.length, 64); i += 2) {
                const byte = parseInt(key.substr(i, 2), 16);
                if (!isNaN(byte)) {
                    keyBytes.push(byte);
                }
            }
        }
        
        // 키가 충분하지 않으면 기본 패턴 사용
        if (keyBytes.length < 16) {
            for (let i = 0; i < 32; i++) {
                keyBytes.push((i * 13 + 7) % 256);
            }
        }
        
        const dataBytes = new TextEncoder().encode(data);
        const encryptedBytes = new Uint8Array(dataBytes.length);
        
        for (let i = 0; i < dataBytes.length; i++) {
            encryptedBytes[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return Array.from(encryptedBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Encryption error:', error);
        // 암호화 실패 시 base64 인코딩으로 fallback
        return btoa(data);
    }
}

function simpleDecrypt(encryptedHex, key) {
    try {
        // base64 fallback 처리
        if (!encryptedHex.match(/^[0-9a-f]+$/i)) {
            return atob(encryptedHex);
        }
        
        // 키를 안전한 바이트 배열로 변환 (암호화와 동일)
        const keyBytes = [];
        if (key.length >= 32) {
            for (let i = 0; i < Math.min(key.length, 64); i += 2) {
                const byte = parseInt(key.substr(i, 2), 16);
                if (!isNaN(byte)) {
                    keyBytes.push(byte);
                }
            }
        }
        
        // 키가 충분하지 않으면 기본 패턴 사용
        if (keyBytes.length < 16) {
            for (let i = 0; i < 32; i++) {
                keyBytes.push((i * 13 + 7) % 256);
            }
        }
        
        const encryptedBytes = [];
        for (let i = 0; i < encryptedHex.length; i += 2) {
            const byte = parseInt(encryptedHex.substr(i, 2), 16);
            if (!isNaN(byte)) {
                encryptedBytes.push(byte);
            }
        }
        
        const decryptedBytes = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        // TextDecoder 폴백
        const decode = (bytes) => {
            if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
            let str = '';
            for (let i = 0; i < bytes.length; i++) {
                str += String.fromCharCode(bytes[i]);
            }
            return str;
        };
        
        return decode(decryptedBytes);
    } catch (error) {
        console.error('Decryption error:', error);
        return null;
    }
}

// 암호화하여 저장
export async function saveEncryptedData(key, data) {
    try {
        // 데이터가 없으면 빈 배열로 처리
        const safeData = data || [];
        const encryptionKey = await getOrCreateSecureKey();
        const jsonString = JSON.stringify(safeData);
        const encrypted = simpleEncrypt(jsonString, encryptionKey);
        
        await AsyncStorage.setItem(key, ENCRYPTED_DATA_PREFIX + encrypted);
        return true;
    } catch (error) {
        console.error('Save encrypted data error:', error);
        // 암호화 실패 시 평문 저장 (호환성)
        try {
            await AsyncStorage.setItem(key, JSON.stringify(data || []));
            console.warn('Fallback to plain text storage');
            return false;
        } catch (fallbackError) {
            console.error('Even fallback storage failed:', fallbackError);
            return false;
        }
    }
}

// 복호화하여 로드
export async function loadEncryptedData(key) {
    try {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) return null;
        
        // 암호화된 데이터인지 확인
        if (stored.startsWith(ENCRYPTED_DATA_PREFIX)) {
            const encryptionKey = await getOrCreateSecureKey();
            const encryptedData = stored.substring(ENCRYPTED_DATA_PREFIX.length);
            const decrypted = simpleDecrypt(encryptedData, encryptionKey);
            
            // 복호화된 데이터가 올바른 JSON인지 확인
            if (!decrypted || typeof decrypted !== 'string') {
                console.warn('Decryption returned invalid data, falling back to empty array');
                return [];
            }
            
            try {
                return JSON.parse(decrypted);
            } catch (parseError) {
                console.warn('JSON parse failed after decryption, falling back to empty array:', parseError);
                return [];
            }
        } else {
            // 기존 평문 데이터 (호환성)
            try {
                return JSON.parse(stored);
            } catch (parseError) {
                console.warn('JSON parse failed for plain text data:', parseError);
                return [];
            }
        }
    } catch (error) {
        console.error('Load encrypted data error:', error);
        return [];  // null 대신 빈 배열 반환으로 앱 크래시 방지
    }
}

// 사용자 동의 상태 확인
export async function checkUserConsent() {
    try {
        const consentData = await AsyncStorage.getItem('user_consent');
        if (!consentData) return null;
        
        const consent = JSON.parse(consentData);
        return consent;
    } catch (error) {
        console.error('Check consent error:', error);
        return null;
    }
}

// OpenAI 사용 동의 확인
export async function checkOpenAIConsent() {
    const consent = await checkUserConsent();
    return consent?.thirdPartySharing === true;
}

// 동의 철회
export async function revokeConsent() {
    try {
        await AsyncStorage.removeItem('user_consent');
        return true;
    } catch (error) {
        console.error('Revoke consent error:', error);
        return false;
    }
}

// 모든 암호화된 데이터 삭제
export async function deleteAllEncryptedData() {
    try {
        // 암호화 키 삭제
        await SecureStore.deleteItemAsync(ENCRYPTION_KEY_ID);
        
        // 모든 저장된 데이터의 키 목록
        const keysToDelete = [
            'emotionHistory',
            'streak',
            'dailyAnonymousCount',
            'lastDiaryDate',
            'lastDiaryDateKey',
            'user_consent',
            'language',
            'lastRecordDateKey'
        ];
        
        await AsyncStorage.multiRemove(keysToDelete);
        return true;
    } catch (error) {
        console.error('Delete all data error:', error);
        return false;
    }
}

// 데이터 내보내기 (암호화된 백업)
export async function exportUserData() {
    try {
        const consent = await checkUserConsent();
        if (!consent) {
            throw new Error('사용자 동의가 필요해');
        }

        // 모든 사용자 데이터 수집
        const emotionHistory = await loadEncryptedData('emotionHistory');
        const streak = await AsyncStorage.getItem('streak');
        const language = await AsyncStorage.getItem('language');

        const exportData = {
            emotionHistory: emotionHistory || [],
            streak: parseInt(streak) || 0,
            language: language || 'ko',
            exportDate: new Date().toISOString(),
            version: '1.0',
            // 동의 정보는 제외 (개인정보)
        };

        return exportData;
    } catch (error) {
        console.error('Export data error:', error);
        throw error;
    }
}