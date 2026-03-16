import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript\s*:/gi,
    /data\s*:\s*text\/html/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
  ];

  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    return this.sanitize(value);
  }

  private sanitize(value: any): any {
    if (typeof value === 'string') {
      let cleaned = value;
      for (const pattern of this.DANGEROUS_PATTERNS) {
        cleaned = cleaned.replace(pattern, '');
      }
      return cleaned.trim();
    }
    if (Array.isArray(value)) return value.map(v => this.sanitize(v));
    if (value && typeof value === 'object') {
      const result: any = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.sanitize(v);
      }
      return result;
    }
    return value;
  }
}
