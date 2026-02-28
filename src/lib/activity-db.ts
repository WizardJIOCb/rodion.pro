import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import schema dynamically to avoid SSR issues
async function getSchema() {
  const schemaModule = await import('../db/schema');
  return schemaModule;
}

// Separate database connection for activity monitoring
let activityDbInstance: ReturnType<typeof drizzle> | null = null;

const getActivityConnectionString = (): string => {
  // In production: set via systemd/environment
  // In development: Astro/Vite loads .env automatically
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  
  return dbUrl;
};

export const hasActivityDb = async (): Promise<boolean> => {
  try {
    return !!process.env.DATABASE_URL;
  } catch {
    return false;
  }
};

export const requireActivityDb = async () => {
  if (activityDbInstance) {
    return activityDbInstance;
  }

  const connectionString = getActivityConnectionString();
  const schemaModule = await getSchema();
  
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  activityDbInstance = drizzle(client, { schema: schemaModule });
  return activityDbInstance;
};