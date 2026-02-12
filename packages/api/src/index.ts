import { createApp } from './app.js';
import { env, validateEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { initializeSettings } from './services/settings.service.js';
import { initializeDefaultTemplates } from './services/template.service.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Validate environment
    validateEnv();

    // Connect to database
    await connectDatabase();

    // Initialize default settings
    await initializeSettings();

    // Initialize default templates
    await initializeDefaultTemplates();

    // Create and start app
    const app = createApp();

    app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
      logger.info(`Environment: ${env.nodeEnv}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down...');
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down...');
      await disconnectDatabase();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

main();
