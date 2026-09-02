import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'crypto';

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly store = new Map<string, OtpEntry>();
  private readonly ttlMs = 5 * 60 * 1000;
  private readonly maxAttempts = 5;

  constructor(private readonly config: ConfigService) {}

  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  sendOtp(phone: string): { success: boolean; devOtp?: string } {
    const key = this.normalizePhone(phone);
    const code = String(randomInt(100000, 999999));
    this.store.set(key, { code, expiresAt: Date.now() + this.ttlMs, attempts: 0 });

    if (this.config.get<boolean>('otpDevMode')) {
      this.logger.log(`OTP for ${key}: ${code}`);
      return { success: true, devOtp: code };
    }
    return { success: true };
  }

  verifyOtp(phone: string, otp: string): boolean {
    const key = this.normalizePhone(phone);
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    entry.attempts += 1;
    if (entry.attempts > this.maxAttempts) {
      this.store.delete(key);
      return false;
    }
    const valid = entry.code === otp.trim();
    if (valid) this.store.delete(key);
    return valid;
  }
}
