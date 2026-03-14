const mysql = require('mysql2/promise');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Simple env loader to avoid dependency issues
function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

loadEnv(path.join(__dirname, '../server/.env'));

const clients = [
  {
    name: 'Ethiopian Coffee Export Association',
    local_name: 'የኢትዮጵያ ቡና ላኪዎች ማህበር',
    type: 'COMPANY',
    nationality: 'Ethiopia',
    residence_country: 'Ethiopia',
    email: 'info@ecea.org.et',
    address_street: 'Mexico Square',
    city: 'Addis Ababa',
    address_zone: 'Kirkos',
    wereda: '02',
    house_no: '881',
    zip_code: '1000',
    telephone: '+251 11 551 2533'
  },
  {
    name: 'Safari Tech Solutions',
    type: 'COMPANY',
    nationality: 'Kenya',
    residence_country: 'Kenya',
    email: 'legal@safaritech.co.ke',
    address_street: 'Waiyaki Way',
    city: 'Nairobi',
    zip_code: '00100',
    telephone: '+254 20 271 2345'
  },
  {
    name: 'Kilimanjaro Logistics Ltd',
    type: 'COMPANY',
    nationality: 'Tanzania',
    residence_country: 'Tanzania',
    email: 'admin@kililogistics.co.tz',
    address_street: 'Samora Avenue',
    city: 'Dar es Salaam',
    zip_code: '11101',
    telephone: '+255 22 211 9876'
  },
  {
    name: 'Nile Blue Trading',
    type: 'COMPANY',
    nationality: 'Egypt',
    residence_country: 'Egypt',
    email: 'ops@nileblue.com.eg',
    address_street: 'Tahrir Square',
    city: 'Cairo',
    zip_code: '11511',
    telephone: '+20 2 2795 4321'
  },
  {
    name: 'Victoria Falls Resorts',
    type: 'COMPANY',
    nationality: 'Zimbabwe',
    residence_country: 'Zimbabwe',
    email: 'bookings@vicfallsresorts.com',
    address_street: 'Livingstone Way',
    city: 'Victoria Falls',
    zip_code: '0000',
    telephone: '+263 13 44455'
  }
];

async function migrate() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  console.log('Starting client migration...');

  try {
    for (const client of clients) {
      const id = crypto.randomUUID();
      await pool.execute(
        `INSERT INTO clients (
          id, name, local_name, type, nationality, residence_country, 
          email, address_street, city, address_zone, wereda, 
          house_no, zip_code, telephone, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          id,
          client.name,
          client.local_name || null,
          client.type,
          client.nationality,
          client.residence_country,
          client.email,
          client.address_street,
          client.city,
          client.address_zone || null,
          client.wereda || null,
          client.house_no || null,
          client.zip_code,
          client.telephone
        ]
      );
      console.log(`- Created client: ${client.name} (${client.nationality})`);
    }
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

migrate();
