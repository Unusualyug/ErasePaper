import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import config from '../config/env.js';
import { AppError } from '../utils/errors.js';

const types = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.doc': ['application/msword'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.txt': ['text/plain'],
};
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 3, fields: 20, fieldSize: 20000 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!types[ext]?.includes(file.mimetype) || ext === '.jpeg')
      return cb(new AppError(400, 'Use PDF, DOC, DOCX, PNG, JPG or TXT attachments.', 'INVALID_FILE'));
    cb(null, true);
  },
});
export async function saveAttachments(files = []) {
  await fs.mkdir(config.uploadDir, { recursive: true, mode: 0o700 });
  const saved = [];
  try {
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const sig = file.buffer.subarray(0, 8);
      const valid =
        ext === '.pdf'
          ? sig.toString().startsWith('%PDF-')
          : ext === '.png'
            ? sig.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : ext === '.jpg'
              ? sig[0] === 255 && sig[1] === 216 && sig[2] === 255
              : ext === '.doc'
                ? sig.equals(Buffer.from([208, 207, 17, 224, 161, 177, 26, 225]))
                : ext === '.docx'
                  ? sig.subarray(0, 4).equals(Buffer.from([80, 75, 3, 4]))
                  : !file.buffer.includes(0);
      if (!valid) throw new AppError(400, 'The file contents do not match its extension.', 'INVALID_FILE');
      const id = randomUUID(),
        storageName = `${id}${ext}`;
      await fs.writeFile(path.join(config.uploadDir, storageName), file.buffer, { mode: 0o600, flag: 'wx' });
      saved.push({
        id,
        storageName,
        name: path
          .basename(file.originalname)
          .replace(/[\r\n]/g, '')
          .slice(0, 180),
        size: file.size,
        mimeType: file.mimetype,
      });
    }
    return saved;
  } catch (error) {
    await removeAttachments(saved);
    throw error;
  }
}
export async function removeAttachments(files) {
  await Promise.all(files.map((a) => fs.rm(path.join(config.uploadDir, a.storageName), { force: true })));
}
