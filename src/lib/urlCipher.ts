import crypto from 'crypto';

// Secret derived from JWT_SECRET or dedicated URL_ENCRYPTION_KEY
const getCipherKey = (): Buffer => {
  const secret = process.env.URL_ENCRYPTION_KEY || process.env.JWT_SECRET || 'codebridge-default-secure-cipher-key-32b!';
  return crypto.createHash('sha256').update(secret).digest();
};

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Encrypts an ID or string into a URL-safe encrypted token.
 * Output format: base64url(iv + authTag + ciphertext)
 */
export const encryptUrlToken = (plaintext: string): string => {
  if (!plaintext) return '';
  const key = getCipherKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Combine IV (12B) + AuthTag (16B) + Ciphertext
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64url');
};

/**
 * Decrypts a URL-safe encrypted token back into the original ID or string.
 * Returns null if the token is invalid, corrupted, or tampered with.
 */
export const decryptUrlToken = (token: string): string | null => {
  if (!token) return null;
  try {
    const combined = Buffer.from(token, 'base64url');
    if (combined.length < IV_LENGTH + 16) {
      return null;
    }

    const key = getCipherKey();
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + 16);
    const ciphertext = combined.subarray(IV_LENGTH + 16);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null; // Return null on tampering / invalid key
  }
};

/**
 * Resolves an identifier which could be either a standard 24-hex MongoDB ObjectId
 * OR a secure encrypted URL token.
 */
export const resolveResourceId = (identifier: string): string => {
  if (!identifier) return '';
  // If it's already a 24-character hexadecimal ObjectId
  if (/^[0-9a-fA-F]{24}$/.test(identifier)) {
    return identifier;
  }
  // Otherwise attempt decryption of URL token
  const decrypted = decryptUrlToken(identifier);
  if (decrypted && /^[0-9a-fA-F]{24}$/.test(decrypted)) {
    return decrypted;
  }
  return identifier;
};
