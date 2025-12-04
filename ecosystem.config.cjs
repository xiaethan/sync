/**
 * PM2 Ecosystem Configuration
 * For running the Slack bot in production
 */

module.exports = {
  apps: [
    {
      name: 'sync-slack-bot',
      script: './dist/index.js',
      interpreter: 'node',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
      },
      
      // Logging
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      
      // Auto restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Memory limits
      max_memory_restart: '500M',
      
      // Watch and restart (optional - disable for production)
      watch: false,
      
      // Ignore watch patterns
      ignore_watch: [
        'node_modules',
        'logs',
        'dist',
        '.git',
        '*.log',
        'data/processing/*.json',
      ],
    },
  ],
};

