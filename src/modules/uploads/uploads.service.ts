import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

const ALLOWED_MIMETYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv', 'text/plain',
]);

/** Map of MIME type → expected magic-byte signatures for basic content sniffing */
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg':  [{ offset: 0, bytes: [0xFF, 0xD8, 0xFF] }],
  'image/png':   [{ offset: 0, bytes: [0x89, 0x50, 0x4E, 0x47] }],
  'image/gif':   [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  'image/webp':  [{ offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }],
  'application/pdf': [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }],
  'video/mp4':   [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
};

const MAX_FILENAME_LENGTH = 255;

function verifyMagicBytes(buffer: Buffer, mimetype: string): boolean {
  const signatures = MAGIC_BYTES[mimetype];
  if (!signatures) return true; // No known signature — skip check
  return signatures.some(sig =>
    sig.bytes.every((byte, i) => buffer[sig.offset + i] === byte)
  );
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = path.resolve(config.get('UPLOAD_DIR', './uploads'));
    // Sync mkdir only at startup — acceptable as it runs once before server accepts requests
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFile(tenantId: string, file: Express.Multer.File) {
    // 1. Validate declared MIME type against allowlist
    if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
      throw new BadRequestException(`نوع الملف غير مسموح: ${file.mimetype}. الأنواع المدعومة: صور، فيديو، صوت، PDF، Excel، Word، CSV`);
    }

    // 2. Verify file content matches declared MIME type via magic bytes
    if (file.buffer && !verifyMagicBytes(file.buffer, file.mimetype)) {
      this.logger.warn(`Magic byte mismatch for tenant ${tenantId}: declared ${file.mimetype}`);
      throw new BadRequestException('محتوى الملف لا يتطابق مع نوعه المُعلن');
    }

    // 3. Sanitize filename — derive extension from the original name only (no path traversal)
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeName = nanoid(16);
    const relPath = `${tenantId}/${safeName}${ext}`;
    const filePath = path.join(this.uploadDir, relPath);

    // 4. Ensure the final path stays within uploadDir
    if (!filePath.startsWith(this.uploadDir + path.sep) && filePath !== this.uploadDir) {
      throw new BadRequestException('مسار الملف غير صالح');
    }

    // 5. Create tenant subdirectory and write file — using async fs to avoid blocking the event loop
    const dir = path.dirname(filePath);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(filePath, file.buffer);

    const baseUrl = this.config.get('API_BASE_URL', 'http://localhost:3001');
    return {
      url: `${baseUrl}/uploads/${relPath}`,
      filename: relPath,
      mimetype: file.mimetype,
      size: file.size,
      originalName: file.originalname.slice(0, MAX_FILENAME_LENGTH),
    };
  }

  async deleteFile(filename: string) {
    // Normalise and guard against path traversal
    const safe = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(this.uploadDir, safe);
    if (!filePath.startsWith(this.uploadDir + path.sep)) {
      throw new BadRequestException('مسار الملف غير صالح');
    }
    try {
      await fsp.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err; // Ignore "file not found", rethrow other errors
    }
  }
}
