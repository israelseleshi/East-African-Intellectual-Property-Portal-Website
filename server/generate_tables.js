import mysql from 'mysql2/promise';
import fs from 'fs';

async function generateTablesMd() {
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
        const [tables] = await pool.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);

        let md = '# Database Schema and Data Export\n\n## ER Diagram\n\n```mermaid\nerDiagram\n';

        // Quick ER Diagram (hardcoded relations based on previous file)
        md += `    case_history }|--|| trademark_cases : "case_id -> id"
    case_notes }|--|| trademark_cases : "case_id -> id"
    case_notes }|--|| users : "user_id -> id"
    case_notes }|--|| case_notes : "parent_note_id -> id"
    deadlines }|--|| trademark_cases : "case_id -> id"
    fee_schedules }|--|| jurisdictions : "jurisdiction -> code"
    fee_schedules }|--|| users : "created_by -> id"
    invoice_items }|--|| invoices : "invoice_id -> id"
    invoice_items }|--|| trademark_cases : "case_id -> id"
    invoices }|--|| clients : "client_id -> id"
    mark_assets }|--|| trademark_cases : "case_id -> id"
    nice_class_mappings }|--|| trademark_cases : "case_id -> id"
    nice_class_mappings }|--|| nice_classes : "class_no -> class_number"
    oppositions }|--|| trademark_cases : "case_id -> id"
    oppositions }|--|| users : "created_by -> id"
    trademark_cases }|--|| users : "user_id -> id"
    trademark_cases }|--|| clients : "client_id -> id"\n\`\`\`\n\n`;

        for (const tableName of tableNames) {
            if (tableName === 'notifications' || tableName === 'reports' || tableName === 'eipa_form_payloads') continue; // Skipped per user request

            md += `## Table: ${tableName}\n\n### Schema\n\n\`\`\`sql\n`;
            const [createTableRes] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
            md += createTableRes[0]['Create Table'] + ';\n\`\`\`\n\n### Data\n\n';

            const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
            if (rows.length === 0) {
                md += '*This table is empty.*\n\n';
            } else {
                const columns = Object.keys(rows[0]);
                md += `| ${columns.join(' | ')} |\n`;
                md += `| ${columns.map(() => '---').join(' | ')} |\n`;

                for (const row of rows) {
                    const rowValues = columns.map(col => {
                        const val = row[col];
                        if (val === null) return '*NULL*';
                        if (val instanceof Date) return val.toISOString().replace(/T/, ' ').replace(/\..+/, '');
                        if (typeof val === 'object') return JSON.stringify(val).replace(/\|/g, '\\|');
                        return String(val).replace(/\|/g, '\\|').replace(/\n/g, ' ');
                    });
                    md += `| ${rowValues.join(' | ')} |\n`;
                }
                md += '\n';
            }
        }

        fs.writeFileSync('tables.md', md);
        console.log('Successfully updated tables.md');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        pool.end();
    }
}

generateTablesMd();
