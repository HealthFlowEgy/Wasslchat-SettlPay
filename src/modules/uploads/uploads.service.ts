import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
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

const MAX_FILENAME_LENGTH = 255;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = config.get('UPLOAD_DIR', './uploads');
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFile(tenantId: string, file: Express.Multer.File) {
    // Validate MIME type
    if (!ALLOWED_MIMETYPES.has(file.mimetype)) {
      throw new BadRequestException(`نوع الملف غير مسموح: ${file.mimetype}. الأنواع المدعومة: صور، فيديو، صوت، PDF، Excel، Word، CSV`);
    }

    // Sanitize filename
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeName = nanoid(16);
    const filename = `${tenantId}/${safeName}${ext}`;
    const filePath = path.join(this.uploadDir, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file.buffer);

    const baseUrl = this.config.get('API_BASE_URL', 'http://localhost:3001');
    return { url: `${baseUrl}/uploads/${filename}`, filename, mimetype: file.mimetype, size: file.size, originalName: file.originalname.slice(0, MAX_FILENAME_LENGTH) };
  }

  async deleteFile(filename: string) {
    // Prevent path traversal
    const safe = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(this.uploadDir, safe);
    if (!filePath.startsWith(path.resolve(this.uploadDir))) {
      throw new BadRequestException('Invalid file path');
    }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
