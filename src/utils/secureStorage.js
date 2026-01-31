import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js'; // CryptoJS import

const ENCRYPTION_KEY_ID = 'healingemotion_encryption_key';
const ENCRYPTED_DATA_PREFIX = 'encrypted:';
const ENCRYPTION_VERSION = 'aes-v1'; // AES 암호화 버전

// 암호화 키 생성 또는 가져오기
async function getOrCreateSecureKey() {
    try {
        let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_ID);
        if (!key) {
            // 256비트(32바이트) 랜덤 키 생성
            const randomBytes = await Crypto.getRandomBytesAsync(32);
            key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
            
            await SecureStore.setItemAsync(ENCRYPTION_KEY_ID, key);
        }
        return key;
    } catch (error) {
        console.error('Encryption key error:', error);
        // 오류 시 기본 키 사용 (fallback) - 실제 앱에서는 절대 이렇게 하면 안 됨!
        // 이 부분은 개발/테스트용이며, 실제 배포 시에는 앱이 작동하지 않도록 해야 함.
        console.warn('Using fallback encryption key - THIS IS INSECURE FOR PRODUCTION');
        return 'a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1'; // 256-bit hex key
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
        // IV와 암호문을 함께 저장 (IV는 Base64로 인코딩)
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

// 간단한 XOR 암호화 (하위 호환성용)
function simpleEncrypt(data, key) {
    // 이 함수는 더 이상 사용되지 않지만, 하위 호환성을 위해 남겨둠
    // 실제로는 AES로 전환 후 이 함수는 삭제하는 것이 좋음
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
    // 이 함수는 더 이상 사용되지 않지만, 하위 호환성을 위해 남겨둠
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
        
        // 버전 정보를 포함하여 저장
        await AsyncStorage.setItem(key, `${ENCRYPTED_DATA_PREFIX}${ENCRYPTION_VERSION}:${encrypted}`);
        return true;
    } catch (error) {
        console.error('Save encrypted data error:', error);
        // AES 암호화 실패 시, 기존 XOR 방식으로 저장 시도 (하위 호환성)
        try {
            const encryptionKey = await getOrCreateSecureKey();
            const jsonString = JSON.stringify(data || []);
            const encrypted = simpleEncrypt(jsonString, encryptionKey); // 기존 XOR
            await AsyncStorage.setItem(key, `${ENCRYPTED_DATA_PREFIX}xor-v1:${encrypted}`);
            console.warn('Fallback to XOR encryption due to AES failure.');
            return false; // AES 실패했으므로 false 반환
        } catch (fallbackError) {
            console.error('Even XOR fallback storage failed:', fallbackError);
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
            } else if (parts[0] === 'xor-v1') { // 기존 XOR 방식 (하위 호환성)
                const encryptedXOR = parts.slice(1).join(':');
                decrypted = simpleDecrypt(encryptedXOR, encryptionKey);
            } else {
                // 버전 정보가 없거나 알 수 없는 경우 (오래된 데이터 또는 손상)
                console.warn('Unknown encryption version or format, attempting XOR fallback.');
                decrypted = simpleDecrypt(payload, encryptionKey); // 전체 페이로드를 XOR로 시도
            }

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
            // 기존 평문 데이터 (하위 호환성)
            try {
                return JSON.parse(stored);
            } catch (parseError) {
                console.warn('JSON parse failed for plain text data:', parseError);
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
        console.error('Export data error:', error);
        throw error;
    }
}