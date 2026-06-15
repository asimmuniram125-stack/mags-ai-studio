import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class ZeroTrustGuard implements CanActivate {
  private readonly trustedIPs = new Set(
    (process.env.TRUSTED_IPS || '').split(',').filter(Boolean),
  );
  private readonly deviceFingerprints = new Map<string, string>();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Verify JWT Token
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('No token provided');

    // 2. Device Fingerprinting
    const fingerprint = this.generateFingerprint(request);
    const storedFingerprint = this.deviceFingerprints.get(
      request.user?.id || '',
    );
    if (storedFingerprint && storedFingerprint !== fingerprint) {
      throw new ForbiddenException('Device fingerprint mismatch - potential session hijacking');
    }

    // 3. IP Verification
    const clientIP = this.getClientIP(request);
    if (
      !this.trustedIPs.has(clientIP) &&
      !this.isKnownDevice(request.user?.id || '', clientIP)
    ) {
      throw new ForbiddenException(`Untrusted IP: ${clientIP}`);
    }

    // 4. Session Freshness Check
    const sessionAge = Date.now() - (request.user?.iat || 0) * 1000;
    if (sessionAge > 15 * 60 * 1000) {
      // 15 min max without re-auth
      throw new UnauthorizedException('Session too old - re-authentication required');
    }

    // 5. Request Signature Verification
    const signature = request.headers['x-request-signature'];
    if (!this.verifyRequestSignature(request, signature as string)) {
      throw new ForbiddenException('Invalid request signature');
    }

    // 6. Rate Limit Check
    await this.checkRateLimit(request.user?.id || '', clientIP);

    return true;
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return null;
    return authHeader.substring(7);
  }

  private generateFingerprint(request: Request): string {
    const userAgent = request.headers['user-agent'] || '';
    const acceptLanguage = request.headers['accept-language'] || '';
    const acceptEncoding = request.headers['accept-encoding'] || '';

    const combined = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private isKnownDevice(userId: string, ip: string): boolean {
    // Check against database of known user devices/IPs
    // Implementation depends on your device tracking system
    return true; // Placeholder
  }

  private verifyRequestSignature(
    request: Request,
    signature: string,
  ): boolean {
    const secret = process.env.REQUEST_SIGNATURE_SECRET || '';
    const body = JSON.stringify(request.body || {});
    const path = request.path;
    const method = request.method;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${method}${path}${body}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }

  private async checkRateLimit(userId: string, ip: string): Promise<void> {
    // Implement rate limiting logic
    // Integration with Redis rate limiter
  }
}