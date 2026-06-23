import crypto from 'crypto';
import { logger } from '../config/logger';

export class SecurityUtil {
  private static instance: SecurityUtil;
  private readonly encryptionKey: Buffer;
  private readonly iv: Buffer;

  private constructor() {
    const key = process.env.ENCRYPTION_SECRET || 'default-secret-key-32-chars-long!!!';
    this.encryptionKey = crypto.scryptSync(key, 'salt', 32);
    this.iv = crypto.randomBytes(16);
  }

  static getInstance(): SecurityUtil {
    if (!SecurityUtil.instance) {
      SecurityUtil.instance = new SecurityUtil();
    }
    return SecurityUtil.instance;
  }

  generateDeviceFingerprint(data: any): string {
    const hash = crypto.createHash('sha256');
    const stringData = JSON.stringify({
      deviceId: data.deviceId,
      androidVersion: data.androidVersion,
      sdkVersion: data.sdkVersion,
      serialNumber: data.serialNumber,
      timestamp: Date.now(),
      random: crypto.randomBytes(16).toString('hex'),
    });
    hash.update(stringData);
    return hash.digest('hex');
  }

  validateDeviceAuthenticity(deviceData: any, fingerprint: string): boolean {
    const computedFingerprint = this.generateDeviceFingerprint(deviceData);
    return crypto.timingSafeEqual(
      Buffer.from(computedFingerprint),
      Buffer.from(fingerprint)
    );
  }

  encrypt(data: string): string {
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, this.iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${this.iv.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  generateSecureAPIKey(): string {
    return `rayan_${crypto.randomBytes(32).toString('hex')}`;
  }

  validateRequestSignature(signature: string, payload: any, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  validateTimestamp(timestamp: number, maxAge: number = 300000): boolean {
    const now = Date.now();
    const diff = Math.abs(now - timestamp);
    return diff <= maxAge;
  }

  detectSuspiciousPattern(data: any): boolean {
    const suspiciousPatterns = [
      /test/i, /demo/i, /sample/i, /example/i, /fake/i,
      /dummy/i, /mock/i, /simulate/i, /debug/i, /staging/i,
      /localhost/i, /127\.0\.0\.1/i, /192\.168/i, /10\.0/i,
    ];

    const stringData = JSON.stringify(data).toLowerCase();
    return suspiciousPatterns.some(pattern => pattern.test(stringData));
  }

  validateEmailDomain(email: string): boolean {
    const disposableDomains = [
      'tempmail.com', '10minutemail.com', 'guerrillamail.com',
      'mailinator.com', 'throwawaymail.com', 'yopmail.com',
      'temp-mail.org', 'fake-mail.net', 'dispostable.com',
    ];
    
    const domain = email.split('@')[1];
    return !disposableDomains.includes(domain);
  }

  validateIPAddress(ip: string): boolean {
    const blockedRanges = [
      '10.', '172.16.', '172.17.', '172.18.', '172.19.',
      '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
      '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
      '172.30.', '172.31.', '192.168.',
    ];
    
    return !blockedRanges.some(range => ip.startsWith(range));
  }
}
