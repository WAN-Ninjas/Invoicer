import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  earlyAccess: true,
  migrate: {
    schema: path.join(import.meta.dirname, 'prisma/schema.prisma'),
    async url() {
      return process.env.DATABASE_URL || '';
    },
  },
});
