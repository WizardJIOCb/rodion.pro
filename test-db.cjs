require('dotenv').config();
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Testing connection to:', connectionString);
  
  if (!connectionString) {
    console.error('DATABASE_URL is not set');
    return;
  }
  
  try {
    const client = postgres(connectionString);
    console.log('Connected successfully');
    
    // Test a simple query
    const result = await client`SELECT NOW()`;
    console.log('Query result:', result[0]);
    
    await client.end();
    console.log('Connection closed');
  } catch (error) {
    console.error('Connection failed:', error.message);
  }
}

testConnection();