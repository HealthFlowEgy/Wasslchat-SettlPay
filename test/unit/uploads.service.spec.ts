import { BadRequestException } from '@nestjs/common';
import { UploadsService } from '../../src/modules/uploads/uploads.service';
import * as fs from 'fs';

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

describe('UploadsService', () => {
  let service: UploadsService;
  const mockConfig = { get: jest.fn((key: string, def: string) => def) };

  beforeEach(() => {
    service = new UploadsService(mockConfig as any);
  });

  describe('saveFile', () => {
    it('should accept valid image types', async () => {
      const file = { originalname: 'photo.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('test'), size: 1000 } as any;
      const result = await service.saveFile('t1', file);
      expect(result.mimetype).toBe('image/jpeg');
      expect(result.url).toContain('/uploads/');
    });

    it('should accept PDF files', async () => {
      const file = { originalname: 'doc.pdf', mimetype: 'application/pdf', buffer: Buffer.from('test'), size: 5000 } as any;
      const result = await service.saveFile('t1', file);
      expect(result.mimetype).toBe('application/pdf');
    });

    it('should reject executable files', async () => {
      const file = { originalname: 'virus.exe', mimetype: 'application/x-msdownload', buffer: Buffer.from('test'), size: 1000 } as any;
      await expect(service.saveFile('t1', file)).rejects.toThrow(BadRequestException);
    });

    it('should reject JavaScript files', async () => {
      const file = { originalname: 'script.js', mimetype: 'application/javascript', buffer: Buffer.from('test'), size: 100 } as any;
      await expect(service.saveFile('t1', file)).rejects.toThrow(BadRequestException);
    });

    it('should reject HTML files', async () => {
      const file = { originalname: 'page.html', mimetype: 'text/html', buffer: Buffer.from('test'), size: 100 } as any;
      await expect(service.saveFile('t1', file)).rejects.toThrow(BadRequestException);
    });

    it('should sanitize filename extensions', async () => {
      const file = { originalname: '../../../etc/passwd.jpg', mimetype: 'image/jpeg', buffer: Buffer.from('test'), size: 100 } as any;
      const result = await service.saveFile('t1', file);
      expect(result.filename).not.toContain('..');
      expect(result.filename).toContain('t1/');
    });
  });

  describe('deleteFile', () => {
    it('should prevent path traversal', async () => {
      await expect(service.deleteFile('../../etc/passwd')).rejects.toThrow(BadRequestException);
    });
  });
});
