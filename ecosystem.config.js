module.exports = {
  apps: [
    {
      name: 'app',
      script: 'npx',
      args: 'tsc && node dist/app.js',
    },
  ],
};