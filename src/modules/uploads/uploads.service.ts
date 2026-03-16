import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { nanoid } from 'nanoid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private uploadDir: string;

  constructor(private config: ConfigService) {
    this.uploadDir = config.get('UPLOAD_DIR', './uploads');
    if (!fs.existsSync(this.uploadDir)) fs.mkdirSync(this.uploadDir, { recursive: true });
  }

  async saveFile(tenantId: string, file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const filename = `${tenantId}/${nanoid()}${ext}`;
    const filePath = path.join(this.uploadDir, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, file.buffer);
    const baseUrl = this.config.get('API_BASE_URL', 'http://localhost:3001');
    return { url: `${baseUrl}/uploads/${filename}`, filename, mimetype: file.mimetype, size: file.size };
  }

  async deleteFile(filename: string) {
    const filePath = path.join(this.uploadDir, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}
