// utils/cryptoExport.js
import CryptoJS from 'crypto-js';

let hasExpoRandom = false;
let ExpoRandom = null;
try {
  // 선택적 의존성: 설치되어 있으면 사용, 없으면 CryptoJS fallback
  ExpoRandom = require('expo-random');
  hasExpoRandom = !!ExpoRandom && typeof ExpoRandom.getRandomBytesAsync === 'function';
} catch (_) { hasExpoRandom = false; }

// Uint8Array -> CryptoJS WordArray
function wordArrayFromBytes(bytes) {
  return CryptoJS.lib.WordArray.create(bytes);
}

// CSPRNG: expo-random 선호, 없으면 CryptoJS random (fallback)
async function secureRandomWordArray(lenBytes) {
  if (hasExpoRandom) {
    const bytes = await ExpoRandom.getRandomBytesAsync(lenBytes);
    return wordArrayFromBytes(bytes);
  }
  // Fallback (가능하면 expo-random 설치 권장)
  return CryptoJS.lib.WordArray.random(lenBytes);
}

// PBKDF2로 64바이트 파생 → 32B(encKey) + 32B(macKey)
function deriveKeys(password, saltWA) {
  const derived = CryptoJS.PBKDF2(password, saltWA, { keySize: 64/4, iterations: 100000 });
  const encKey = CryptoJS.lib.WordArray.create(derived.words.slice(0, 8));   // 32B
  const macKey = CryptoJS.lib.WordArray.create(derived.words.slice(8, 16)); // 32B
  return { encKey, macKey };
}

export async function encryptBackupData_CTR_HMAC(plainText, password) {
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters.');

  const salt = await secureRandomWordArray(16);
  const iv   = await secureRandomWordArray(16);
  const { encKey, macKey } = deriveKeys(password, salt);

  // AES-CTR (stream mode) + NoPadding OK
  const encrypted = CryptoJS.AES.encrypt(plainText, encKey, {
    iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding,
  });

  const ct = encrypted.ciphertext;
  // HMAC-SHA256 over (salt || iv || ct)
  const mac = CryptoJS.HmacSHA256(salt.clone().concat(iv).concat(ct), macKey);

  return JSON.stringify({
    version: '2.1',
    salt: salt.toString(CryptoJS.enc.Hex),
    iv:   iv.toString(CryptoJS.enc.Hex),
    ct:   ct.toString(CryptoJS.enc.Hex),
    mac:  mac.toString(CryptoJS.enc.Hex),
  });
}

export async function decryptBackupData_CTR_HMAC(payload, password) {
  if (!password || password.length < 4) throw new Error('Password must be at least 4 characters.');

  const parsed = JSON.parse(payload);

  // 구(2.0/GCM) 백업 감지 → 안내 메시지
  if (parsed.version === '2.0') {
    throw new Error('이전 버전(2.0) 백업은 새 버전에서 복원할 수 없어. 최신 버전에서 다시 내보내줘');
  }

  if (!(parsed.version === '2.1' && parsed.salt && parsed.iv && parsed.ct && parsed.mac)) {
    throw new Error('Unsupported backup format');
  }

  const salt = CryptoJS.enc.Hex.parse(parsed.salt);
  const iv   = CryptoJS.enc.Hex.parse(parsed.iv);
  const ct   = CryptoJS.enc.Hex.parse(parsed.ct);
  const mac  = CryptoJS.enc.Hex.parse(parsed.mac);

  const { encKey, macKey } = deriveKeys(password, salt);

  // MAC 검증
  const calcMac = CryptoJS.HmacSHA256(salt.clone().concat(iv).concat(ct), macKey);
  if (calcMac.toString() !== mac.toString()) {
    throw new Error('Integrity check failed');
  }

  // 복호화
  const decrypted = CryptoJS.AES.decrypt({ ciphertext: ct }, encKey, {
    iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding,
  });

  const text = CryptoJS.enc.Utf8.stringify(decrypted);
  if (!text) throw new Error('Decryption failed');
  return text;
}