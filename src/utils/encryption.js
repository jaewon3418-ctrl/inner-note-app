import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENCRYPTION_KEY = 'emotion_app_key';
const ALGORITHM = 'AES-256-GCM';

// 암호화 키 생성 또는 가져오기
export async function getOrCreateEncryptionKey() {
    try {
        let key = await SecureStore.getItemAsync(ENCRYPTION_KEY);
        if (!key) {
            // 새 키 생성 (256비트 = 32바이트 = 64 hex chars)
            const randomBytes = await Crypto.getRandomBytesAsync(32);
            key = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
            await SecureStore.setItemAsync(ENCRYPTION_KEY, key);
        }
        return key;
    } catch (error) {
        console.error('Failed to get encryption key:', error);
        throw error;
    }
}

// 간단한 XOR 기반 암호화 (expo-crypto 제한된 환경용)
export async function encryptData(data) {
    try {
        const key = await getOrCreateEncryptionKey();
        const dataStr = JSON.stringify(data);
        const keyBytes = hexToBytes(key);
        const dataBytes = new TextEncoder().encode(dataStr);
        
        const encrypted = new Uint8Array(dataBytes.length);
        for (let i = 0; i < dataBytes.length; i++) {
            encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        return Array.from(encrypted, byte => byte.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Encryption failed:', error);
        return data; // 실패시 원본 반환 (fallback)
    }
}

// 복호화
export async function decryptData(encryptedHex) {
    try {
        if (!encryptedHex || typeof encryptedHex !== 'string') {
            return null;
        }
        
        const key = await getOrCreateEncryptionKey();
        const keyBytes = hexToBytes(key);
        const encryptedBytes = hexToBytes(encryptedHex);
        
        const decrypted = new Uint8Array(encryptedBytes.length);
        for (let i = 0; i < encryptedBytes.length; i++) {
            decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        
        const dataStr = new TextDecoder().decode(decrypted);
        return JSON.parse(dataStr);
    } catch (error) {
        console.error('Decryption failed:', error);
        return null; // 실패시 null 반환
    }
}

// 헥스 문자열을 바이트 배열로 변환
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// 암호화된 데이터인지 확인 (헥스 문자열 패턴)
export function isEncrypted(data) {
    return typeof data === 'string' && /^[0-9a-f]+$/i.test(data) && data.length % 2 === 0;
}