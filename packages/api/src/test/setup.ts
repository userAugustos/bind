import { migrate } from 'drizzle-orm/bun-sqlite/migrator';

import { db } from '@api/db/client';

migrate(db, { migrationsFolder: './src/db/migrations' });
