import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// In Astro, environment variables should be available via process.env
// but sometimes need to be accessed in a way that works with the bundler
let _connectionString: string | undefined;

const getConnectionString = (): string | undefined => {
  if (_connectionString) return _connectionString;
  
  // Try process.env first
  _connectionString = process.env.DATABASE_URL;
  
  return _connectionString;
};

export const hasDb = (): boolean => {
  const connectionString = getConnectionString();
  if (!connectionString) {
    console.warn('[db] DATABASE_URL is not set');
    return false;
  }
  return true;
};

export const requireDb = () => {
  const connectionString = getConnectionString();
  
  if (!connectionString) {
    throw new Error('Database is not configured');
  }

  try {
    const client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return drizzle(client, { schema });
  } catch (error) {
    console.warn('[db] Failed to initialize database connection:', error);
    throw new Error('Database is not configured');
  }
};

export * from './schema';
