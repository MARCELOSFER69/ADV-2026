/**
 * Utilitários de Criptografia (AES-256-GCM) - Versão CommonJS para Node.js
 * Usado pelo rgp_server.cjs e serviços de automação.
 */

const crypto = require('crypto').webcrypto;

const ENCRYPTION_KEY = process.env.VITE_ENCRYPTION_KEY || 'default-secret-key-change-it-in-env';

async function getEncryptionKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode('adv-2026-salt'),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(text) {
    if (!text) return text;
    try {
        const enc = new TextEncoder();
        const key = await getEncryptionKey(ENCRYPTION_KEY);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(text)
        );

        const encryptedArray = new Uint8Array(encrypted);
        const combined = new Uint8Array(iv.length + encryptedArray.length);
        combined.set(iv);
        combined.set(encryptedArray, iv.length);

        return Buffer.from(combined).toString('base64');
    } catch (e) {
        console.error('Erro na criptografia:', e);
        return text;
    }
}

async function decryptData(encryptedBase64) {
    if (!encryptedBase64 || encryptedBase64.length < 20) return encryptedBase64;
    try {
        const key = await getEncryptionKey(ENCRYPTION_KEY);
        const combined = Buffer.from(encryptedBase64, 'base64');

        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return encryptedBase64;
    }
}

module.exports = {
    encryptData,
    decryptData
};
