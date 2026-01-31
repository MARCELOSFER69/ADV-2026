/**
 * Utilitários de Criptografia (AES-256-GCM)
 * Usado para proteger dados sensíveis como senhas do Gov.br e INSS no banco de dados.
 */

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-change-it-in-env';

// Função para derivar uma chave de 256 bits a partir de uma string
async function getEncryptionKey(password: string) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );
    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode('adv-2026-salt'), // Salt fixo para consistência
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

/**
 * Criptografa uma string
 */
export async function encryptData(text: string): Promise<string> {
    if (!text) return text;
    try {
        const enc = new TextEncoder();
        const key = await getEncryptionKey(ENCRYPTION_KEY);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(text)
        );

        const encryptedArray = new Uint8Array(encrypted);
        const combined = new Uint8Array(iv.length + encryptedArray.length);
        combined.set(iv);
        combined.set(encryptedArray, iv.length);

        return btoa(String.fromCharCode(...combined));
    } catch (e) {
        console.error('Erro na criptografia:', e);
        return text;
    }
}

/**
 * Descriptografa uma string
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
    if (!encryptedBase64 || encryptedBase64.length < 20) return encryptedBase64;
    try {
        const dec = new TextDecoder();
        const key = await getEncryptionKey(ENCRYPTION_KEY);
        const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));

        const iv = combined.slice(0, 12);
        const data = combined.slice(12);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return dec.decode(decrypted);
    } catch (e) {
        // Se falhar, provavelmente o dado não está criptografado (migração gradual)
        return encryptedBase64;
    }
}
