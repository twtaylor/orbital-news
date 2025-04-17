module.exports = {
  apps: [{
    name: "orbital-news-server",
    script: "dist/index.js",  // Changed from ./dist/index.js to ensure correct path resolution
    cwd: "/var/www/localgrpnewsapi", // Explicitly set the working directory
    instances: 1,
    exec_mode: "fork",
    watch: false,
    env: {
      NODE_ENV: "production"
      // Note: Additional environment variables will be loaded from .env file
    },
    max_memory_restart: "300M",
    log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    merge_logs: true,
    error_file: "/var/www/localgrpnewsapi/logs/err.log",
    out_file: "/var/www/localgrpnewsapi/logs/out.log",
    time: true,  // Add time prefix in logs
    autorestart: true, // Automatically restart if process crashes
    max_restarts: 10, // Maximum number of restarts
    restart_delay: 4000 // Delay between restarts (ms)
  }]
};
