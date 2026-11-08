import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
dotenv.config({ path: path.join(root, '.env'), quiet: true });

const production = process.env.NODE_ENV === 'production';
const demo = !production && process.env.DEMO_MODE === 'true';
const sessionSecret = process.env.SESSION_SECRET || (demo ? randomBytes(32).toString('hex') : '');
const origins = (process.env.CLIENT_ORIGIN || (!production ? 'http://localhost:5173' : ''))
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const config = {
  root,
  production,
  demo,
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || '',
  sessionSecret,
  origins,
  whatsapp: (process.env.WHATSAPP_NUMBER || '919825751614').replace(/\D/g, ''),
  uploadDir: path.resolve(root, process.env.UPLOAD_DIR || './private-uploads'),
  trustProxy: Number(process.env.TRUST_PROXY || 0),

  // Resend transactional email configuration; the API key stays server-side.
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'ErasePaper <notifications@mail.erasepaper.online>',
  emailReplyTo: process.env.EMAIL_REPLY_TO || 'support@erasepaper.online',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@erasepaper.online',
};

if (!demo && (!config.mongoUri || !config.sessionSecret)) {
  throw new Error(
    'Live mode requires MONGODB_URI and SESSION_SECRET. For a local preview set NODE_ENV=development and DEMO_MODE=true.',
  );
}
if (production && process.env.DEMO_MODE === 'true')
  throw new Error('DEMO_MODE cannot be enabled in production.');
if (!demo && Buffer.byteLength(config.sessionSecret) < 32)
  throw new Error('SESSION_SECRET must be at least 32 bytes.');
if (production) {
  if (!origins.length) throw new Error('CLIENT_ORIGIN is required in production.');
  const hasInvalidOrigin = origins.some((origin) => {
    try {
      const parsed = new URL(origin);
      return parsed.origin !== origin || parsed.protocol !== 'https:';
    } catch {
      return true;
    }
  });
  if (hasInvalidOrigin) throw new Error('Production CLIENT_ORIGIN values must be exact HTTPS origins.');
}

export default config;
