import mysql from 'mysql2/promise';

let connection;

export async function getConnection() {
  if (!connection) {
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'defaultdb',
      port: parseInt(process.env.DB_PORT || '3306'),
    };

    if (process.env.DB_SSL === 'true') {
      config.ssl = {
        rejectUnauthorized: false
      };
    }

    connection = await mysql.createConnection(config);
  }
  return connection;
}
