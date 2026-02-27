module.exports = {
  apps: [
    {
      name: 'rodion-pro',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/rodion.pro',
      env_file: '/var/www/rodion.pro/.env',
      env: {
        NODE_ENV: 'production',
        PORT: 3100,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/rodion-pro-error.log',
      out_file: '/var/log/pm2/rodion-pro-out.log',
      time: true,
    },
  ],
};
