const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function parseEnv(fileName) {
  try {
    const envPath = path.join(__dirname, fileName);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index === -1) return;
        const key = trimmed.substring(0, index).trim();
        let val = trimmed.substring(index + 1).trim();
        // Remove surrounding quotes if any
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
      });
    }
  } catch (e) {
    console.warn(`Could not parse ${fileName} file:`, e);
  }
}

// Read .env then override with .env.local
parseEnv('.env');
parseEnv('.env.local');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'defaultdb',
  port: parseInt(process.env.DB_PORT || '3306')
};

async function main() {
  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('Successfully connected to database.');

    const [rows] = await connection.execute(
      'SELECT id, code, long_url, created_at FROM short_links ORDER BY id DESC LIMIT 10'
    );
    
    console.log('Last 10 short links:');
    rows.forEach(row => {
      console.log(`ID: ${row.id} | Code: ${row.code} | Long URL: ${row.long_url} | Created At: ${row.created_at}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
