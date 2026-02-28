require('dotenv').config();

module.exports = {
  apps: [
    {
      name: 'rodion-pro',
      script: './dist/server/entry.mjs',
      cwd: '/var/www/rodion.pro',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
        SITE_URL: process.env.SITE_URL,
        DATABASE_URL: process.env.DATABASE_URL,
        GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        ADMIN_EMAILS: process.env.ADMIN_EMAILS,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/rodion-pro-error.log',
      out_file: '/var/log/pm2/rodion-pro-out.log',
      time: true,
    },
  ],
};
