import mysql from 'mysql2/promise';

async function migrate() {
    const dbConfig = {
        host: 'eastafricanip.com',
        user: 'falolega_admin',
        password: 'eastafricanip1q2w3e4r5t',
        database: 'falolega_tpms',
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 0
    };

    const connection = await mysql.createConnection(dbConfig);

    try {
        console.log('Checking for disclaimer column in trademark_cases...');
        const [columns] = await connection.query('SHOW COLUMNS FROM trademark_cases LIKE "disclaimer"');
        
        if (columns.length > 0) {
            console.log('Dropping column "disclaimer" from "trademark_cases"...');
            await connection.query('ALTER TABLE trademark_cases DROP COLUMN disclaimer');
            console.log('Column "disclaimer" dropped successfully.');
        } else {
            console.log('Column "disclaimer" does not exist in "trademark_cases".');
        }

        console.log('Verifying disclaimer_english and disclaimer_amharic columns...');
        const [engCol] = await connection.query('SHOW COLUMNS FROM trademark_cases LIKE "disclaimer_english"');
        const [amhCol] = await connection.query('SHOW COLUMNS FROM trademark_cases LIKE "disclaimer_amharic"');

        if (engCol.length === 0) {
            console.log('Adding column "disclaimer_english"...');
            await connection.query('ALTER TABLE trademark_cases ADD COLUMN disclaimer_english TEXT');
        }
        if (amhCol.length === 0) {
            console.log('Adding column "disclaimer_amharic"...');
            await connection.query('ALTER TABLE trademark_cases ADD COLUMN disclaimer_amharic TEXT');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

migrate();
