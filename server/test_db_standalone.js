import 'dotenv/config';
import mysql from 'mysql2/promise';

async function test() {
    console.log('Testing connection to:', process.env.DB_HOST);
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT || '3306'),
        });
        console.log('Successfully connected!');
        const [rows] = await connection.execute('SELECT 1 as connected');
        console.log('Query result:', rows);
        await connection.end();
    } catch (err) {
        console.error('Connection failed:', err);
    }
}

test();
