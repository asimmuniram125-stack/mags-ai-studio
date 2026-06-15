import { Injectable } from '@nestjs/common';
import * as zlib from 'zlib';
import * as brotli from 'brotli';

@Injectable()
export class CompressionService {
  compressGzip(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(data, (err, compressed) => {
        if (err) reject(err);
        else resolve(compressed);
      });
    });
  }

  compressBrotli(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const compressed = Buffer.from(
        brotli.compress(Buffer.from(data)),
      );
      resolve(compressed);
    });
  }

  decompressGzip(data: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, decompressed) => {
        if (err) reject(err);
        else resolve(decompressed);
      });
    });
  }

  async selectOptimalCompression(data: Buffer): Promise<{
    algorithm: 'gzip' | 'brotli';
    compressed: Buffer;
    ratio: number;
  }> {
    const gzipCompressed = await this.compressGzip(data);
    const brotliCompressed = await this.compressBrotli(data);

    const gzipRatio = gzipCompressed.length / data.length;
    const brotliRatio = brotliCompressed.length / data.length;

    if (brotliRatio < gzipRatio) {
      return {
        algorithm: 'brotli',
        compressed: brotliCompressed,
        ratio: brotliRatio,
      };
    }

    return {
      algorithm: 'gzip',
      compressed: gzipCompressed,
      ratio: gzipRatio,
    };
  }
}