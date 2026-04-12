const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
const mysql = require('mysql2/promise');

const OUTPUT_FILE = path.join(__dirname, 'database_content_dump.md');

async function dumpDatabase() {
  console.log('🚀 Starting Database Content Dump to Markdown...');
  
  // Debug connection info (safely)
  console.log('DB Config:', {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
  });
  
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
  });

  try {
    const [tables] = await connection.query('SHOW TABLES');
    const tableList = tables.map(row => Object.values(row)[0]);
    
    let mdContent = `# Database Content Dump\n\n`;
    mdContent += `**Date:** ${new Date().toLocaleString()}\n`;
    mdContent += `**Database:** ${process.env.DB_NAME}\n\n`;
    mdContent += `--- \n\n`;

    mdContent += `## Tables Overview\n\n`;
    tableList.forEach(table => {
      mdContent += `- [${table}](#${table.toLowerCase()})\n`;
    });
    mdContent += `\n---\n\n`;

    for (const table of tableList) {
      console.log(`📦 Dumping table: ${table}...`);
      mdContent += `<a name="${table.toLowerCase()}"></a>\n## ${table}\n\n`;
      
      const [rows] = await connection.query(`SELECT * FROM \`${table}\` LIMIT 1000`);

      if (rows.length === 0) {
        mdContent += `*No data found in this table.*\n\n`;
      } else {
        const columns = Object.keys(rows[0]);
        mdContent += `| ${columns.join(' | ')} |\n`;
        mdContent += `| ${columns.map(() => '---').join(' | ')} |\n`;

        rows.forEach(row => {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return '`NULL`';
            if (val instanceof Date) return val.toISOString();
            if (typeof val === 'object') return '`JSON`';
            return String(val).replace(/\n/g, '<br>').replace(/\|/g, '\\|');
          });
          mdContent += `| ${values.join(' | ')} |\n`;
        });
      }
      mdContent += `\n\n`;
    }

    fs.writeFileSync(OUTPUT_FILE, mdContent, 'utf8');
    console.log(`✅ Success! Database content written to: ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('❌ Error dumping database:', error);
  } finally {
    await connection.end();
  }
}

dumpDatabase();
