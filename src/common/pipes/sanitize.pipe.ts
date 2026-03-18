import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly DANGEROUS_PATTERNS = [
    // Script tags (including obfuscated variants)
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Inline event handlers: onclick=, onerror=, onload=, etc.
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /on\w+\s*=\s*[^\s>]*/gi,
    // JavaScript and vbscript protocol handlers
    /javascript\s*:/gi,
    /vbscript\s*:/gi,
    // data: URIs that can carry HTML/JS payloads
    /data\s*:\s*text\/html/gi,
    /data\s*:\s*application\/javascript/gi,
    // Dangerous HTML elements
    /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>[\s\S]*?<\/object>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    // SVG-based XSS vectors
    /<svg\b[^>]*>[\s\S]*?<\/svg>/gi,
    /<svg\b[^>]*>/gi,
    // Form-based phishing / CSRF vectors
    /<form\b[^>]*>[\s\S]*?<\/form>/gi,
    /<form\b[^>]*>/gi,
    // Image-based XSS (onerror handler stripped by event-handler pattern above,
    // but also strip src="javascript:" variants)
    /<img\b[^>]*src\s*=\s*["']javascript:[^"']*["'][^>]*>/gi,
    // Meta refresh redirects
    /<meta\b[^>]*http-equiv\s*=\s*["']refresh["'][^>]*>/gi,
    // Expression() CSS injection (IE)
    /expression\s*\(/gi,
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
