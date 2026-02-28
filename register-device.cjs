const { Pool } = require('pg');
const { createHash } = require('crypto');
require('dotenv').config();

async function registerDevice(deviceId, deviceName, deviceKey) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Hash the device key the same way as the API expects (SHA256)
    const apiKeyHash = createHash('sha256').update(deviceKey).digest('hex');

    // Insert the device into the database
    const result = await pool.query(
      `INSERT INTO activity_devices (id, name, api_key_hash) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name,
         api_key_hash = EXCLUDED.api_key_hash
       RETURNING *`,
      [deviceId, deviceName, apiKeyHash]
    );

    console.log(`Device registered successfully:`, result.rows[0]);
    console.log('You can now use this device ID and key in your activity agent configuration.');
  } catch (error) {
    console.error('Error registering device:', error);
  } finally {
    await pool.end();
  }
}

// Get parameters from command line arguments
const deviceId = process.argv[2] || 'pc-main';
const deviceName = process.argv[3] || 'Main PC';
const deviceKey = process.argv[4];

if (!deviceKey) {
  console.log('Usage: node register-device.cjs <deviceId> <deviceName> <deviceKey>');
  console.log('Example: node register-device.cjs pc-main "Main PC" mySecretKey123');
  process.exit(1);
}

registerDevice(deviceId, deviceName, deviceKey);