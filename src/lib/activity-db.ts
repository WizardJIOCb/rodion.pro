import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import schema dynamically to avoid SSR issues
async function getSchema() {
  const schemaModule = await import('../db/schema');
  return schemaModule;
}

// Separate database connection for activity monitoring
let activityDbInstance: ReturnType<typeof drizzle> | null = null;

const getActivityConnectionString = async (): Promise<string> => {
  // Load environment variables in case they aren't available in SSR context
  if (!process.env.DATABASE_URL) {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const dotenv = await import('dotenv');
      
      const envPath = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envPath)) {
        const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
        process.env.DATABASE_URL = parsed.DATABASE_URL;
      }
    } catch (error) {
      console.warn('Could not load .env file in SSR context:', error);
    }
  }
  
  const dbUrl = process.env.DATABASE_URL;
  
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  
  return dbUrl;
};

export const hasActivityDb = async (): Promise<boolean> => {
  try {
    // Check if DATABASE_URL is available, loading from .env if needed
    if (!process.env.DATABASE_URL) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const dotenv = await import('dotenv');
        
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
          const parsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
          process.env.DATABASE_URL = parsed.DATABASE_URL;
        }
      } catch (error) {
        console.warn('Could not load .env file in SSR context:', error);
      }
    }
    
    return !!process.env.DATABASE_URL;
  } catch {
    return false;
  }
};

export const requireActivityDb = async () => {
  if (activityDbInstance) {
    return activityDbInstance;
  }

  const connectionString = await getActivityConnectionString();
  const schemaModule = await getSchema();
  
  const client = postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  
  activityDbInstance = drizzle(client, { schema: schemaModule });
  return activityDbInstance;
};