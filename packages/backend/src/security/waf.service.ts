import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import * as xss from 'xss';

interface WAFRule {
  id: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  action: 'block' | 'log' | 'challenge';
}

@Injectable()
export class WAFService {
  private readonly rules: WAFRule[] = [
    {
      id: 'sql-injection',
      pattern: /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
      severity: 'critical',
      action: 'block',
    },
    {
      id: 'xss-attack',
      pattern: /(<script|javascript:|onerror|onload|onclick)/i,
      severity: 'critical',
      action: 'block',
    },
    {
      id: 'path-traversal',
      pattern: /(\.\.|\/\/|\\)/,
      severity: 'high',
      action: 'block',
    },
    {
      id: 'command-injection',
      pattern: /([;&|`$()])/,
      severity: 'high',
      action: 'block',
    },
  ];

  private readonly suspiciousPatterns = [
    /base64_decode/i,
    /eval\(/i,
    /system\(/i,
    /exec\(/i,
    /passthru\(/i,
  ];

  validateRequest(body: any, path: string, method: string): boolean {
    // Check for common WAF patterns
    for (const rule of this.rules) {
      if (this.checkPattern(body, rule.pattern)) {
        if (rule.action === 'block') {
          throw new HttpException(
            `WAF Rule Violation: ${rule.id}`,
            HttpStatus.FORBIDDEN,
          );
        }
      }
    }

    return true;
  }

  sanitizeInput(input: string): string {
    // XSS Prevention
    return xss(input, {
      whiteList: {},
      stripIgnoredTag: true,
      stripLeakingUrl: true,
    });
  }

  validateDomain(domain: string): boolean {
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  }

  validateEmail(email: string): boolean {
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private checkPattern(obj: any, pattern: RegExp): boolean {
    const str = JSON.stringify(obj);
    return pattern.test(str);
  }

  detectAnomalousRequest(
    payload: Record<string, any>,
    userBaseline: Record<string, any>,
  ): boolean {
    const payloadSize = JSON.stringify(payload).length;
    const baselineSize = JSON.stringify(userBaseline).length;

    // Check if request is 10x larger than typical
    if (payloadSize > baselineSize * 10) {
      return true;
    }

    return false;
  }
}