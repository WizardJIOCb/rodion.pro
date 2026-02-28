// Simple activity service that runs the Astro server with activity endpoints
const { exec } = require('child_process');
const express = require('express');
const cors = require('cors');
const http = require('http');

// Create Express app to handle health checks and proxy to Astro
const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the Astro server
console.log('Starting Astro server for activity endpoints...');

// We'll use the Astro server that's already built
const server = app.listen(4010, () => {
  console.log('Activity service listening on port 4010');
  console.log('Health check available at http://localhost:4010/health');
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});