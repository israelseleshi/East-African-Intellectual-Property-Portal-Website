import dotenv from 'dotenv';
dotenv.config();
import mysql from 'mysql2/promise';
const c = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
});
const [n] = await c.execute("SELECT DISTINCT nationality FROM clients WHERE deleted_at IS NULL AND nationality IS NOT NULL AND nationality != '' ORDER BY nationality");
console.log('=== NATIONALITIES ===');
n.forEach(r => console.log('  ' + r.nationality));
const [c2] = await c.execute("SELECT DISTINCT city FROM clients WHERE deleted_at IS NULL AND city IS NOT NULL AND city != '' ORDER BY city");
console.log('\n=== CITIES ===');
c2.forEach(r => console.log('  ' + r.city));
await c.end();
