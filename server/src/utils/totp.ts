import * as OTPAuth from 'otpauth';

export function generateTotpSecret(): string {
  const totp = new OTPAuth.TOTP({
    issuer: 'EAIP TPMS',
    label: 'User Account',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: new OTPAuth.Secret({ size: 20 })
  });
  return totp.secret.base32;
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
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
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