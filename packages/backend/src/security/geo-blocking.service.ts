import { Injectable, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

interface GeoIPDatabase {
  ip: string;
  country: string;
  continent: string;
  latitude: number;
  longitude: number;
}

@Injectable()
export class GeoBlockingService {
  private readonly blockedCountries = (
    process.env.GEO_BLOCKED_COUNTRIES || 'KP,IR,SY'
  ).split(',');

  private readonly allowedCountries = (
    process.env.GEO_ALLOWED_COUNTRIES || ''
  ).split(',').filter(Boolean);

  private readonly geoDatabase = new Map<string, GeoIPDatabase>();

  async validateGeoLocation(request: Request): Promise<boolean> {
    const clientIP = this.getClientIP(request);
    const geoData = await this.lookupIP(clientIP);

    if (!geoData) {
      // If we can't determine location, allow (fail open)
      return true;
    }

    // Check blocked countries
    if (this.blockedCountries.includes(geoData.country)) {
      throw new ForbiddenException(
        `Access denied from country: ${geoData.country}`,
      );
    }

    // Check allowed countries (whitelist mode if enabled)
    if (
      this.allowedCountries.length > 0 &&
      !this.allowedCountries.includes(geoData.country)
    ) {
      throw new ForbiddenException(
        `Access only allowed from: ${this.allowedCountries.join(', ')}`,
      );
    }

    return true;
  }

  private getClientIP(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  private async lookupIP(ip: string): Promise<GeoIPDatabase | null> {
    // Check cache
    if (this.geoDatabase.has(ip)) {
      return this.geoDatabase.get(ip)!;
    }

    // Lookup IP geolocation (integrate with MaxMind or similar service)
    // For now, return null (would integrate with GeoIP service)
    return null;
  }

  async detectUnusualLocation(
    userId: string,
    currentIP: string,
    previousIPs: string[],
  ): Promise<boolean> {
    const currentGeo = await this.lookupIP(currentIP);
    if (!currentGeo) return false;

    for (const prevIP of previousIPs) {
      const prevGeo = await this.lookupIP(prevIP);
      if (!prevGeo) continue;

      // Check if distance is impossible (faster than speed of light)
      const distance = this.calculateDistance(
        currentGeo.latitude,
        currentGeo.longitude,
        prevGeo.latitude,
        prevGeo.longitude,
      );

      const timeDiff = 60; // Assume 60 seconds between requests
      const maxSpeed = 900; // Speed of a commercial jet (m/s)

      if (distance / timeDiff > maxSpeed) {
        return true; // Impossible location change
      }
    }

    return false;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}