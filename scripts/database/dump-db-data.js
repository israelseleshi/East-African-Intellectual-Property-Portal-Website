import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output file path
const OUTPUT_FILE = path.join(__dirname, 'database_data_dump.md');

async function dumpDatabaseData() {
  console.log('🚀 Starting Full Database Data Dump to Markdown...');
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    // 1. Get all tables
    const [tables] = await connection.query('SHOW TABLES');
    const tableList = tables.map(row => Object.values(row)[0]);
    
    let mdContent = `# Database Data Dump\n\n`;
    mdContent += `**Date:** ${new Date().toLocaleString()}\n`;
    mdContent += `**Database:** ${process.env.DB_NAME}\n\n`;
    mdContent += `--- \n\n`;

    // Table of contents
    mdContent += `## Tables Overview\n\n`;
    tableList.forEach(table => {
      mdContent += `- [${table}](#${table.toLowerCase().replace(/_/g, '-')})\n`;
    });
    mdContent += `\n---\n\n`;

    // 2. Loop through each table and fetch data
    for (const table of tableList) {
      console.log(`📦 Dumping data for table: ${table}...`);
      mdContent += `## ${table}\n\n`;
      
      const [rows] = await connection.query(`SELECT * FROM \`${table}\``);
      const dataRows = rows;

      if (dataRows.length === 0) {
        mdContent += `*No data found in this table.*\n\n`;
      } else {
        const columns = Object.keys(dataRows[0]);
        
        // Generate header
        mdContent += `| ${columns.join(' | ')} |\n`;
        mdContent += `| ${columns.map(() => '---').join(' | ')} |\n`;

        // Generate data rows
        dataRows.forEach(row => {
          const values = columns.map(col => {
            let val = row[col];
            if (val === null) return '`NULL`';
            if (val instanceof Date) return val.toISOString();
            if (Buffer.isBuffer(val)) return '`[Buffer]`';
            if (typeof val === 'object') return '`JSON`';
            
            // Clean up string values for Markdown table
            return String(val)
              .replace(/\n/g, '<br>')
              .replace(/\|/g, '\\|')
              .replace(/\[/g, '\\[')
              .replace(/\]/g, '\\]');
          });
          mdContent += `| ${values.join(' | ')} |\n`;
        });
      }
      mdContent += `\n---\n\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, mdContent);
    console.log(`✅ Success! Data written to: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Error dumping data:', error);
  } finally {
    await connection.end();
  }
}

dumpDatabaseData();
