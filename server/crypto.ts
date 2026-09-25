import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'telesell-super-secure-production-jwt-key-2026-xyz999';
const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || 'telesell-32-byte-secret-encryption-master-key';

// Ensure 32 bytes key for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();
const ALGORITHM = 'aes-256-gcm';

export class CryptoService {
  /**
   * Hashes plain text password with bcrypt salt rounds
   */
  public static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Compares plain password with bcrypt hash
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypts sensitive secrets (e.g. Telegram Bot Token, Webhook Secret) using AES-256-GCM
   */
  public static encrypt(text: string): string {
    if (!text) return '';
    const iv = crypto.randomBytes(12); // 96-bit IV for GCM
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts AES-256-GCM encrypted string on the server only
   */
  public static decrypt(cipherText: string): string {
    if (!cipherText) return '';
    try {
      const parts = cipherText.split(':');
      if (parts.length !== 3) {
        // Fallback for non-colon legacy strings
        return cipherText;
      }
      const [ivHex, authTagHex, encryptedData] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('Failed to decrypt data securely:', err);
      return '';
    }
  }

  /**
   * Masks a Telegram bot token (e.g., 123456789:ABCdef123456 -> 123456789:••••••••456)
   */
  public static maskBotToken(token: string): string {
    if (!token) return '';
    const colonIndex = token.indexOf(':');
    if (colonIndex === -1) {
      if (token.length <= 6) return '••••••';
      return `${token.slice(0, 3)}••••••${token.slice(-3)}`;
    }
    const prefix = token.substring(0, colonIndex);
    const secret = token.substring(colonIndex + 1);
    const visibleSuffix = secret.length > 4 ? secret.slice(-4) : '••';
    return `${prefix}:••••••••••••${visibleSuffix}`;
  }

  /**
   * Generates JWT session token
   */
  public static generateJwt(payload: object, expiresIn: string = '7d'): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn as any });
  }

  /**
   * Verifies JWT token and returns payload
   */
  public static verifyJwt<T = any>(token: string): T | null {
    try {
      return jwt.verify(token, JWT_SECRET) as T;
    } catch {
      return null;
    }
  }

  /**
   * Generates a random secure hexadecimal or alphanumeric token
   */
  public static generateRandomToken(bytes: number = 24): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generates random referral code
   */
  public static generateReferralCode(length: number = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }
}
