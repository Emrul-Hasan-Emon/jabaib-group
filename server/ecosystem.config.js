/** PM2 process config — alternative to Docker for a single-box deploy. */
module.exports = {
  apps: [
    {
      name: 'jabaib-api',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      time: true,
    },
  ],
};
