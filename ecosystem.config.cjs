// PM2 Process Manager Configuration for 24/7 Uninterrupted Hosting
module.exports = {
  apps: [
    {
      name: 'telesell-saas',
      script: './dist/server.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        KEEP_ALIVE: 'true'
      },
      error_file: './data/logs/pm2-error.log',
      out_file: './data/logs/pm2-out.log',
      time: true
    }
  ]
};
