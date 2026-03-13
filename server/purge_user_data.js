import mysql from 'mysql2/promise';
import fs from 'fs';

async function exportDatabaseData() {
    const pool = mysql.createPool({
        host: 'eastafricanip.com',
        user: 'falolega_admin',
        password: 'eastafricanip1q2w3e4r5t',
        database: 'falolega_tpms',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        console.log('Connecting to database...');
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        let sqlDump = `-- Database Data Export\n-- Generated on ${new Date().toISOString()}\n\nSET FOREIGN_KEY_CHECKS = 0;\n\n`;

        for (const tableName of tableNames) {
            if (tableName === 'notifications' || tableName === 'reports') continue;

            console.log(`Exporting table: ${tableName}`);
            const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);

            if (rows.length > 0) {
                sqlDump += `-- Data for table \`${tableName}\`\n`;
                
                const columns = Object.keys(rows[0]);
                const columnNames = columns.map(c => `\`${c}\``).join(', ');

                for (const row of rows) {
                    const values = columns.map(col => {
                        const val = row[col];
                        if (val === null) return 'NULL';
                        if (typeof val === 'number') return val;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (typeof val === 'object') return pool.escape(JSON.stringify(val));
                        return pool.escape(String(val));
                    });

                    sqlDump += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${values.join(', ')});\n`;
                }
                sqlDump += '\n';
            }
        }

        sqlDump += 'SET FOREIGN_KEY_CHECKS = 1;\n';

        fs.writeFileSync('database_data.sql', sqlDump);
        console.log('Successfully generated database_data.sql');
    } catch (error) {
        console.error('Export failed:', error);
    } finally {
        await pool.end();
    }
}

exportDatabaseData();
