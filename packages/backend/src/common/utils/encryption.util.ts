import * as crypto from 'crypto';

export class EncryptionUtil {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly SALT_LENGTH = 32;
  private static readonly IV_LENGTH = 16;
  private static readonly AUTH_TAG_LENGTH = 16;

  static encryptAES256(plaintext: string, key: string): string {
    const derivedKey = crypto
      .pbkdf2Sync(key, process.env.ENCRYPTION_SALT || 'default-salt', 100000, 32, 'sha256');

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decryptAES256(ciphertext: string, key: string): string {
    const derivedKey = crypto
      .pbkdf2Sync(key, process.env.ENCRYPTION_SALT || 'default-salt', 100000, 32, 'sha256');

    const [iv, authTag, encrypted] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      derivedKey,
      Buffer.from(iv, 'hex'),
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  static hashPassword(password: string, rounds: number = 12): string {
    // Using bcrypt would be more efficient in production
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
      .toString('hex');
    return `${salt}.${hash}`;
  }

  static verifyPassword(password: string, hash: string): boolean {
    const [salt, storedHash] = hash.split('.');
    const computedHash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, 'sha256')
      .toString('hex');
    return crypto.timingSafeEqual(
      Buffer.from(computedHash),
      Buffer.from(storedHash),
    );
  }

  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}