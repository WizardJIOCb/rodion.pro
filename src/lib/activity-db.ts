import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Import schema dynamically to avoid SSR issues
async function getSchema() {
  const schemaModule = await import('../db/schema');
  return schemaModule;
}

// Separate database connection for activity monitoring that handles environment differently
let activityDbInstance: ReturnType<typeof drizzle> | null = null;
let _connectionString: string | undefined;

const getActivityConnectionString = async (): Promise<string> => {
  if (_connectionString) return _connectionString;
  
  // Check if DATABASE_URL is available in environment
  let dbUrl = process.env.DATABASE_URL;
  
  // If not found and we're in development, try to load from .env
  if (!dbUrl && process.env.NODE_ENV !== 'production') {
    try {
      // Dynamically import dotenv to load environment variables
      const { config } = await import('dotenv');
      const path = await import('path');
      
      const envPath = path.resolve('.env');
      const result = config({ path: envPath });
      
      if (result.parsed) {
        dbUrl = result.parsed.DATABASE_URL;
      } else {
        // If dotenv didn't work, try reading the file directly
        const fs = await import('fs');
        if (fs.existsSync(envPath)) {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const lines = envContent.split('\n');
          for (const line of lines) {
            if (line.startsWith('DATABASE_URL=')) {
              dbUrl = line.substring(13).replace(/['"]/g, ''); // Remove quotes
              break;
            }
          }
        }
      }
    } catch (e) {
      // If dynamic import fails, we'll continue with whatever was in process.env
      console.warn('Could not dynamically load .env file:', e);
    }
  }
  
  _connectionString = dbUrl || '';
  
  if (!_connectionString) {
    console.error('DATABASE_URL is not set in environment variables');
    // Try to provide a more descriptive error for debugging
    console.error('Available environment keys:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  
  return _connectionString;
};

export const hasActivityDb = async (): Promise<boolean> => {
  try {
    const connectionString = await getActivityConnectionString();
    return !!connectionString && connectionString.length > 0;
  } catch (error) {
    console.error('Error checking DB availability:', error);
    return false;
  }
};

export const requireActivityDb = async () => {
  if (activityDbInstance) {
    return activityDbInstance;
  }

  try {
    const connectionString = await getActivityConnectionString();
    const schemaModule = await getSchema();
    
    const client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    
    activityDbInstance = drizzle(client, { schema: schemaModule });
    return activityDbInstance;
  } catch (error) {
    console.error('Error creating database connection:', error);
    throw error;
  }
};