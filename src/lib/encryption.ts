/**
 * Token Encryption Utilities
 * Uses AES-256-GCM for encrypting sensitive tokens at rest
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * Must be exactly 32 bytes for AES-256
 */
function getEncryptionKey(): Buffer {
    const key = process.env.TOKEN_ENCRYPTION_KEY;
    if (!key) {
        throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
    }
    
    // If key is hex-encoded (64 chars), decode it
    if (key.length === 64 && /^[a-fA-F0-9]+$/.test(key)) {
        return Buffer.from(key, 'hex');
    }
    
    // If key is base64-encoded
    if (key.length === 44 && key.endsWith('=')) {
        return Buffer.from(key, 'base64');
    }
    
    // Otherwise, hash the key to get exactly 32 bytes
    return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a plaintext string
 * Returns: iv:tag:ciphertext (all base64 encoded)
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const tag = cipher.getAuthTag();
    
    // Format: iv:tag:ciphertext (all base64)
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Expects format: iv:tag:ciphertext (all base64 encoded)
 */
export function decrypt(encryptedData: string): string {
    const key = getEncryptionKey();
    
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
    }
    
    const [ivBase64, tagBase64, ciphertext] = parts;
    const iv = Buffer.from(ivBase64, 'base64');
    const tag = Buffer.from(tagBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * Hash a value with salt for privacy-preserving storage
 * Used for IP addresses and user agents
 */
export function hashWithSalt(value: string, salt?: string): string {
    const actualSalt = salt || process.env.HASH_SALT || 'geoffrey-default-salt';
    return crypto
        .createHash('sha256')
        .update(value + actualSalt)
        .digest('hex')
        .substring(0, 32); // Truncate for storage efficiency
}

/**
 * Generate a random public key for tracking scripts
 */
export function generatePublicKey(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Generate OAuth state parameter
 */
export function generateOAuthState(): string {
    return crypto.randomBytes(32).toString('hex');
}


