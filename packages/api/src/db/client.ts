import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';

import { config } from '@core/env';

import * as schema from './schema';

const sqlite = new Database(config.database.path, { create: true });

export const db = drizzle(sqlite, { schema });
