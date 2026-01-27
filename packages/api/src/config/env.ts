import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: resolve(__dirname, '../../../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || '',
  sessionSecret: process.env.SESSION_SECRET || 'change-this-secret-in-production',
  appUrl: process.env.APP_URL || 'http://localhost:8080',

  // Mailgun SMTP
  mailgun: {
    host: process.env.MAILGUN_SMTP_HOST || 'smtp.mailgun.org',
    port: parseInt(process.env.MAILGUN_SMTP_PORT || '587', 10),
    user: process.env.MAILGUN_SMTP_USER || '',
    pass: process.env.MAILGUN_SMTP_PASS || '',
    fromEmail: process.env.MAILGUN_FROM_EMAIL || '',
  },
};

export function validateEnv(): void {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  if (env.nodeEnv === 'production' && env.sessionSecret === 'change-this-secret-in-production') {
    throw new Error('SESSION_SECRET must be set in production');
  }
}
