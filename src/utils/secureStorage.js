import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY_ID = 'healingemotion_encryption_key';
const ENCRYPTED_DATA_PREFIX = 'encrypted:';
const ENCRYPTION_VERSION = 'aes-v1'; // AES 암호화 버전

// 암호화 키 생성 또는 가져오기
async function getOrCreateSecureKey() {
    try {
        let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
        if (!key) {
            // expo-crypto 대신 crypto-js를 사용하여 랜덤 키 생성 (Native 모듈 의존성 제거)
            const randomWord = CryptoJS.lib.WordArray.random(32); // 256비트(32바이트)
            key = randomWord.toString(CryptoJS.enc.Hex);
            
            await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
        }
        return key;
    } catch (error) {
        console.error('Encryption key error:', error);
        // 오류 시 기본 키 사용 (개발/테스트용)
        console.warn('Using fallback encryption key - THIS IS INSECURE FOR PRODUCTION');
        return 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1'; 
    }
}

// AES 암호화 함수
async function aesEncrypt(data, key) {
    try {
        const iv = CryptoJS.lib.WordArray.random(128 / 8); // 128비트 IV
        const encrypted = CryptoJS.AES.encrypt(data, CryptoJS.enc.Hex.parse(key), {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        // IV와 암호문을 함께 저장
        return iv.toString(CryptoJS.enc.Hex) + ':' + encrypted.toString();
    } catch (error) {
        console.error('AES Encryption error:', error);
        throw error;
    }
}

// AES 복호화 함수
async function aesDecrypt(encryptedCombined, key) {
    try {
        const parts = encryptedCombined.split(':');
        if (parts.length !== 2) throw new Error('Invalid encrypted data format');
        
        const iv = CryptoJS.enc.Hex.parse(parts[0]);
        const ciphertext = parts[1];
        
        const decrypted = CryptoJS.AES.decrypt(ciphertext, CryptoJS.enc.Hex.parse(key), {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('AES Decryption error:', error);
        throw error;
    }
}

// 간단한 XOR 암호화 (하위 호환성용 - 유지)
function simpleEncrypt(data, key) {
    try {
        const keyBytes = [];
        if (key.length >= 32) {
            for (let i = 0; i < Math.min(key.length, 64); i += 2) {
                const byte = parseInt(key.substr(i, 2), 16);
                if (!isNaN(byte)) {
                    keyBytes.push(byte);
                }
            }
        }
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
        console.error('XOR Encryption error:', error);
        return btoa(data); // Fallback to base64
    }
}

function simpleDecrypt(encryptedHex, key) {
    try {
        if (!encryptedHex.match(/^[0-9a-f]+$/i)) {
            return atob(encryptedHex); // Fallback from base64
        }
        
        const keyBytes = [];
        if (key.length >= 32) {
            for (let i = 0; i < Math.min(key.length, 64); i += 2) {
                const byte = parseInt(key.substr(i, 2), 16);
                if (!isNaN(byte)) {
                    keyBytes.push(byte);
                }
            }
        }
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
        console.error('XOR Decryption error:', error);
        return null;
    }
}

// 암호화하여 저장
export async function saveEncryptedData(key, data) {
    try {
        const safeData = data || [];
        const encryptionKey = await getOrCreateSecureKey();
        const jsonString = JSON.stringify(safeData);
        
        const encrypted = await aesEncrypt(jsonString, encryptionKey);
        
        await AsyncStorage.setItem(key, `${ENCRYPTED_DATA_PREFIX}${ENCRYPTION_VERSION}:${encrypted}`);
        return true;
    } catch (error) {
        console.error('Save encrypted data error:', error);
        try {
            const encryptionKey = await getOrCreateSecureKey();
            const jsonString = JSON.stringify(data || []);
            const encrypted = simpleEncrypt(jsonString, encryptionKey);
            await AsyncStorage.setItem(key, `${ENCRYPTED_DATA_PREFIX}xor-v1:${encrypted}`);
            return false;
        } catch (fallbackError) {
            return false;
        }
    }
}

// 복호화하여 로드
export async function loadEncryptedData(key) {
    try {
        const stored = await AsyncStorage.getItem(key);
        if (!stored) return null;
        
        if (stored.startsWith(ENCRYPTED_DATA_PREFIX)) {
            const encryptionKey = await getOrCreateSecureKey();
            const payload = stored.substring(ENCRYPTED_DATA_PREFIX.length);
            
            const parts = payload.split(':');
            let decrypted = null;

            if (parts[0] === ENCRYPTION_VERSION) { // AES-v1
                const encryptedCombined = parts.slice(1).join(':');
                decrypted = await aesDecrypt(encryptedCombined, encryptionKey);
            } else if (parts[0] === 'xor-v1') { // 기존 XOR
                const encryptedXOR = parts.slice(1).join(':');
                decrypted = simpleDecrypt(encryptedXOR, encryptionKey);
            } else {
                decrypted = simpleDecrypt(payload, encryptionKey);
            }

            if (!decrypted || typeof decrypted !== 'string') return [];
            
            try {
                return JSON.parse(decrypted);
            } catch (parseError) {
                return [];
            }
        } else {
            try {
                return JSON.parse(stored);
            } catch (parseError) {
                return [];
            }
        }
    } catch (error) {
        console.error('Load encrypted data error:', error);
        return [];
    }
}

// 사용자 동의 상태 확인
export async function checkUserConsent() {
    try {
        const consentData = await AsyncStorage.getItem('user_consent');
        if (!consentData) return null;
        return JSON.parse(consentData);
    } catch (error) {
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
        return false;
    }
}

// 모든 암호화된 데이터 삭제
export async function deleteAllEncryptedData() {
    try {
        await SecureStore.deleteItemAsync(ENCRYPTION_KEY_ID);
        
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

        const emotionHistory = await loadEncryptedData('emotionHistory');
        const streak = await AsyncStorage.getItem('streak');
        const language = await AsyncStorage.getItem('language');

        const exportData = {
            emotionHistory: emotionHistory || [],
            streak: parseInt(streak) || 0,
            language: language || 'ko',
            exportDate: new Date().toISOString(),
            version: '1.0',
        };

        return exportData;
    } catch (error) {
        throw error;
    }
}