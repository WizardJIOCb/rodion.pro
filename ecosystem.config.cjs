module.exports = {
  apps: [
    {
      name: 'rodion-pro',
      script: './dist/server/entry.mjs',
      cwd: '/var/www/rodion.pro',
      node_args: '-r dotenv/config',
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
