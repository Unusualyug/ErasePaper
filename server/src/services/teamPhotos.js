import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import config from '../config/env.js';
import { AppError } from '../utils/errors.js';

const formats = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};
const storageNamePattern = /^team-[0-9a-f-]{36}\.(?:jpe?g|png|webp)$/;

export const teamPhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2, fieldSize: 1000, parts: 3 },
  fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (formats[extension] !== file.mimetype)
      return cb(new AppError(400, 'Use a JPG, PNG, or WebP image for the team photo.', 'INVALID_FILE'));
    cb(null, true);
  },
});

function signatureMatches(extension, buffer) {
  if (extension === '.jpg' || extension === '.jpeg')
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (extension === '.png')
    return (
      buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    );
  if (extension === '.webp')
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  return false;
}

export async function saveTeamPhoto(file) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (formats[extension] !== file.mimetype || !signatureMatches(extension, file.buffer)) {
    throw new AppError(400, 'The photo contents do not match a supported image format.', 'INVALID_FILE');
  }

  await fs.mkdir(config.uploadDir, { recursive: true, mode: 0o700 });
  const storageName = `team-${randomUUID()}${extension}`;
  await fs.writeFile(path.join(config.uploadDir, storageName), file.buffer, {
    mode: 0o600,
    flag: 'wx',
  });
  return {
    photoStorageName: storageName,
    photoMimeType: file.mimetype,
    photoUpdatedAt: new Date(),
  };
}

export async function readTeamPhoto(storageName) {
  if (typeof storageName !== 'string' || !storageNamePattern.test(storageName))
    throw new AppError(404, 'Team photo not found.', 'NOT_FOUND');
  try {
    return await fs.readFile(path.join(config.uploadDir, storageName));
  } catch (error) {
    if (error.code === 'ENOENT') throw new AppError(404, 'Team photo not found.', 'NOT_FOUND');
    throw error;
  }
}

export async function removeTeamPhoto(storageName) {
  if (typeof storageName !== 'string' || !storageNamePattern.test(storageName)) return;
  await fs.rm(path.join(config.uploadDir, storageName), { force: true });
}
