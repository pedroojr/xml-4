const path = require('path');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH
  ? path.resolve(__dirname, process.env.DB_PATH)
  : path.join(__dirname, 'models', 'database.sqlite');

module.exports = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: DB_PATH
    },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    useNullAsDefault: true
  },
  production: {
    client: 'better-sqlite3',
    connection: {
      filename: DB_PATH
    },
    migrations: {
      directory: path.join(__dirname, 'migrations')
    },
    useNullAsDefault: true
  }
};
