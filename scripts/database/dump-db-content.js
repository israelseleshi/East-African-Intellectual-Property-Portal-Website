import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Export file settings
const OUTPUT_FILE = path.join(__dirname, 'database_content_dump.md');

async function dumpDatabase() {
  console.log('🚀 Starting Database Content Dump to Markdown...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    // 1. Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableList = (tables as any[]).map(row => Object.values(row)[0] as string);
    
    let mdContent = `# Database Content Dump\n\n`;
    mdContent += `**Date:** ${new Date().toLocaleString()}\n`;
    mdContent += `**Database:** ${process.env.DB_NAME}\n\n`;
    mdContent += `--- \n\n`;

    // Table of contents
    mdContent += `## Tables Overview\n\n`;
    tableList.forEach(table => {
      mdContent += `- [${table}](#${table.toLowerCase()})\n`;
    });
    mdContent += `\n---\n\n`;

    // 2. Loop through each table and fetch data
    for (const table of tableList) {
      console.log(`📦 Dumping table: ${table}...`);
      mdContent += `## ${table}\n\n`;
      
      const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 1000`);
      const dataRows = rows as any[];

      if (dataRows.length === 0) {
        mdContent += `*No data found in this table.*\n\n`;
      } else {
        // Generate header
        const columns = Object.keys(dataRows[0]);
        mdContent += `| ${columns.join(' | ')} |\n`;
        mdContent += `| ${columns.map(() => '---').join(' | ')} |\n`;

        // Generate data rows (handle newlines/special chars for MD table preservation)
        dataRows.forEach(row => {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return '`NULL`';
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object') return '`JSON`';
            // Replace newlines and pipes to avoid breaking MD table
            return String(val).replace(/\n/g, '<br>').replace(/\|/g, '\\|');
          });
          mdContent += `| ${values.join(' | ')} |\n`;
        });
      }
      mdContent += `\n\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, mdContent);
    console.log(`✅ Success! Database content written to: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Error dumping database:', error);
  } finally {
    await connection.end();
  }
}

dumpDatabase();
