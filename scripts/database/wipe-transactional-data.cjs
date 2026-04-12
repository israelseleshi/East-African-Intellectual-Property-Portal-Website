const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../server/.env') });
const mysql = require('mysql2/promise');

async function wipeTransactionalData() {
  console.log('🧹 Preparing to wipe transactional data from the database...');
  
  // Debug connection info (safely)
  console.log('Connecting to:', {
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

  // These are the tables that will be emptied
  const tablesToWipe = [
    'user_refresh_tokens',
    'case_history',
    'case_notes',
    'deadlines',
    'mark_assets',
    'oppositions',
    'payments',
    'invoice_items',
    'invoices',
    'nice_class_mappings',
    'trademark_cases',
    'clients',
    'agents'
  ];

  try {
    console.log('⚠️ Disabling Foreign Key Checks for bulk wipe...');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of tablesToWipe) {
      console.log(`🗑️ Wiping table: ${table}...`);
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Success! All transactional data has been cleared.');
    console.log('🛑 Staff accounts (users), Jurisdictions, Nice Classes, and Fee Schedules were preserved.');

  } catch (error) {
    console.error('❌ Error during database wipe:', error);
  } finally {
    await connection.end();
  }
}

// Safety check to prevent accidental execution if this script is just being read
console.log('--- DATABASE CLEANUP TOOL ---');
console.log('This will PERMANENTLY delete all cases, clients, invoices, and history.');

wipeTransactionalData();

