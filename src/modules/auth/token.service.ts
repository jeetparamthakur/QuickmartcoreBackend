import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { JwtPayload } from '../../common/decorators/auth.decorators';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccessToken(
    payload: Omit<JwtPayload, 'sessionId'> & { sessionId: string },
  ) {
    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.secret'),
      expiresIn: this.config.getOrThrow('jwt.accessExpiresIn'),
    });
  }

  signRefreshToken(payload: { sub: string; sessionId: string }) {
    return this.jwtService.sign(payload, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.config.getOrThrow('jwt.refreshExpiresIn'),
    });
  }

  verifyRefreshToken(token: string) {
    return this.jwtService.verify<{ sub: string; sessionId: string }>(token, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
    });
  }

  generateRefreshTokenRaw() {
    return randomBytes(48).toString('hex');
  }

  hashRefreshToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  hashPassword(password: string) {
    return argon2.hash(password);
  }

  verifyPassword(hash: string, password: string) {
    return argon2.verify(hash, password);
  }
}
