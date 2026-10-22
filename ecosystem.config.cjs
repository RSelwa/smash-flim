const PORT = 3010

module.exports = {
  apps: [
    {
      name: "smash-flim",
      cwd: "/var/www/smash-flim",
      script: "server/index.ts",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      exp_backoff_restart_delay: 200,
      max_restarts: 10,
      min_uptime: "20s",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT,
      },
    },
  ],
}
