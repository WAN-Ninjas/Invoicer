import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createApp() {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: env.nodeEnv === 'development' ? true : env.appUrl,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session configuration
  // Note: secure: false allows HTTP cookies for self-hosted deployments without HTTPS
  // For production with HTTPS, set COOKIE_SECURE=true in environment
  const cookieSecure = process.env.COOKIE_SECURE === 'true';
  app.use(
    session({
      secret: env.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: cookieSecure,
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
      },
    })
  );

  // Static files for uploaded logos
  app.use('/uploads', express.static(join(__dirname, '../uploads')));

  // API routes
  app.use('/api', routes);

  // Error handling
  app.use(errorHandler);

  return app;
}
