import { Injectable } from '@nestjs/common';
import { Request } from 'express';

interface BotSignature {
  pattern: RegExp;
  name: string;
  severity: 'low' | 'medium' | 'high';
}

@Injectable()
export class BotDetectionService {
  private readonly knownBots: BotSignature[] = [
    {
      pattern: /googlebot|bingbot|slurp|duckduckbot|baiduspider/i,
      name: 'SearchEngine',
      severity: 'low',
    },
    {
      pattern: /curl|wget|python|java|go-http-client/i,
      name: 'CommandLineClient',
      severity: 'high',
    },
    {
      pattern: /sqlmap|nikto|nmap|metasploit|burpsuite/i,
      name: 'SecurityScanner',
      severity: 'critical',
    },
    {
      pattern: /masscan|shodan|censys/i,
      name: 'PortScanner',
      severity: 'critical',
    },
  ];

  private readonly requestPatterns = {
    rapidRequests: { threshold: 100, window: 60 }, // 100 requests in 60 seconds
    suspiciousHeaders: ['x-forwarded-for', 'x-originating-ip'],
    noUserAgent: true,
    noAcceptLanguage: true,
  };

  private readonly requestCache = new Map<string, { count: number; timestamp: number }>();

  detectBot(request: Request): {
    isBot: boolean;
    confidence: number;
    reason?: string;
  } {
    const userAgent = request.headers['user-agent'] || '';
    const clientIP = this.getClientIP(request);

    // Check known bot signatures
    for (const bot of this.knownBots) {
      if (bot.pattern.test(userAgent)) {
        return {
          isBot: true,
          confidence: 0.95,
          reason: `Known ${bot.name} detected`,
        };
      }
    }

    // Check for missing headers (common in bots)
    if (!request.headers['user-agent']) {
      return {
        isBot: true,
        confidence: 0.8,
        reason: 'Missing User-Agent header',
      };
    }

    if (!request.headers['accept-language']) {
      return {
        isBot: true,
        confidence: 0.6,
        reason: 'Missing Accept-Language header',
      };
    }

    // Check for rapid requests
    const cached = this.requestCache.get(clientIP);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.requestPatterns.rapidRequests.window * 1000) {
      if (cached.count > this.requestPatterns.rapidRequests.threshold) {
        return {
          isBot: true,
          confidence: 0.9,
          reason: 'Rapid request rate detected',
        };
      }
      this.requestCache.set(clientIP, {
        count: cached.count + 1,
        timestamp: cached.timestamp,
      });
    } else {
      this.requestCache.set(clientIP, { count: 1, timestamp: now });
    }

    // Check for automated tools patterns
    if (this.hasAutomatedToolPatterns(request)) {
      return {
        isBot: true,
        confidence: 0.85,
        reason: 'Automated tool patterns detected',
      };
    }

    return { isBot: false, confidence: 0 };
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private hasAutomatedToolPatterns(request: Request): boolean {
    const headers = request.headers;
    const body = JSON.stringify(request.body || {});

    // Check for missing common browser headers
    const missingHeaders = [
      !headers['accept'] || !headers['accept'].includes('text/html'),
      !headers['referer'] && request.method !== 'POST',
      !headers['cookie'] && request.path !== '/auth/login',
    ].filter(Boolean).length;

    return missingHeaders > 2;
  }

  challengeBot(clientIP: string): { challenge: string; token: string } {
    const challenge = `challenge_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const token = Buffer.from(
      JSON.stringify({ ip: clientIP, timestamp: Date.now() }),
    ).toString('base64');

    return { challenge, token };
  }
}