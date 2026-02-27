import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = import.meta.env.DATABASE_URL ?? process.env.DATABASE_URL;

let db: ReturnType<typeof drizzle> | null = null;

if (connectionString) {
  try {
    const client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    db = drizzle(client, { schema });
  } catch (error) {
    console.warn('[db] Failed to initialize database connection:', error);
    db = null;
  }
} else {
  console.warn('[db] DATABASE_URL is not set');
}

export { db };

export const hasDb = (): boolean => !!db;

export const requireDb = () => {
  if (!db) {
    throw new Error('Database is not configured');
  }
  return db;
};

export * from './schema';
