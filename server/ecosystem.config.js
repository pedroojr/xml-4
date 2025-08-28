module.exports = {
  apps: [{
    name: 'xml-importer-backend',
    script: 'server.js',
    env: {
      PORT: 3010,
      NODE_ENV: 'development'
    }
  }]
};