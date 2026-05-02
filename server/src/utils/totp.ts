import * as OTPAuth from 'otpauth';
import crypto from 'crypto';

export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function generateTotpUri(secret: string, email: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: 'EAIP TPMS',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  });
  return totp.toString();
}

export function verifyTotpCode(secret: string, code: string, window = 1): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: 'EAIP TPMS',
      label: 'User Account',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    });
    
    const delta = totp.validate({ token: code, window });
    return delta !== null;
  } catch {
    return false;
  }
}

export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(4);
    const code = bytes.toString('hex').toUpperCase().slice(0, 8);
    codes.push(code);
  }
  return codes;
}

export function validateBackupCode(backupCodes: string[], code: string): { valid: boolean; remainingCodes: string[] } {
  const codeUpper = code.toUpperCase();
  const index = backupCodes.indexOf(codeUpper);
  
  if (index === -1) {
    return { valid: false, remainingCodes: backupCodes };
  }
  
  const remaining = [...backupCodes];
  remaining.splice(index, 1);
  return { valid: true, remainingCodes: remaining };
}

// TOTP secret encryption for database storage
const ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';

if (!ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  throw new Error('TOTP_ENCRYPTION_KEY environment variable is required in production');
}

export function encryptTotpSecret(secret: string): { encrypted: string; iv: string; tag: string } {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(secret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  };
}

export function decryptTotpSecret(encrypted: string, iv: string, tag: string): string {
  const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}