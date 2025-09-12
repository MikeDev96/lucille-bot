module.exports = {
  apps: [
    {
      name: "lucille",
      script: "./src/index.js",
      out_file: "./logs/out.log",
      error_file: "./logs/err.log",
      time: true,
      watch: true,
      watch_delay: 1000,
      ignore_watch: [
        "node_modules",
        "logs",
        "*.log",
        ".git",
        "assets"
      ],
      watch_options: {
        followSymlinks: false
      }
    },
  ],
}