import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

async function testConnection() {
  console.log('Testing connection with:');
  console.log('Host:', process.env.DB_HOST);
  console.log('User:', process.env.DB_USER);
  console.log('Database:', process.env.DB_NAME);

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '3306'),
    });

    console.log('SUCCESS: Connected to database.');
    
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log('SUCCESS: Query executed. User count:', rows[0].count);
    
    await connection.end();
  } catch (error) {
    console.error('ERROR: Connection failed:');
    console.error(error);
  }
}

testConnection();
