const { execSync } = require('child_process');
const fs = require('fs');

const config = {
    host: '68.66.216.30',
    user: 'falolega',
    pass: '3v[5\\6tW>-vUff',
    dbUser: 'falolega_admin',
    dbPass: 'eastafricanip1q2w3e4r5t',
    dbName: 'falolega_tpms'
};

function runSsh(command) {
    // Using sshpass to provide the password once
    // If sshpass is not available, we'll try a different approach
    const fullCommand = `sshpass -p "${config.pass}" ssh -o StrictHostKeyChecking=no ${config.user}@${config.host} "${command}"`;
    return execSync(fullCommand).toString();
}

async function main() {
    try {
        console.log('Fetching tables...');
        const tablesRaw = runSsh(`mysql -u ${config.dbUser} -p'${config.dbPass}' -D ${config.dbName} -e "SHOW TABLES;" -N`);
        const tables = tablesRaw.split('\n').map(t => t.trim()).filter(t => t);
        
        let markdown = '# Database Tables Data\n\n';
        
        for (const table of tables) {
            console.log(`Fetching data for table: ${table}`);
            markdown += `## Table: ${table}\n\n`;
            
            // Fetch as CSV/TSV for easier markdown conversion
            const data = runSsh(`mysql -u ${config.dbUser} -p'${config.dbPass}' -D ${config.dbName} -e "SELECT * FROM ${table};" -B`);
            
            if (data.trim()) {
                const lines = data.trim().split('\n');
                if (lines.length > 0) {
                    const headers = lines[0].split('\t');
                    markdown += '| ' + headers.join(' | ') + ' |\n';
                    markdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
                    
                    for (let i = 1; i < lines.length; i++) {
                        const row = lines[i].split('\t').map(cell => cell.replace(/\|/g, '\\|')); // escape pipes
                        markdown += '| ' + row.join(' | ') + ' |\n';
                    }
                }
            } else {
                markdown += '*Table is empty*\n';
            }
            markdown += '\n';
        }
        
        fs.writeFileSync('../../tables_data.md', markdown);
        console.log('Successfully generated tables_data.md');
    } catch (error) {
        console.error('Error:', error.message);
        if (error.message.includes('sshpass')) {
            console.log('Attempting alternative without sshpass...');
            // Fallback: create a temporary script on the server
            // But for now, let's see if we can just do it in one big SSH call
        }
    }
}

main();
