module.exports = {
  apps: [{
    name: 'xml-importer-api-dev',
    script: 'server/server-production.js',
    cwd: '/root/xml-4-dev',
    env: {
      NODE_ENV: 'development',
      PORT: 3002,
      ALLOWED_ORIGINS: 'https://dev.xml.lojasrealce.shop'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
