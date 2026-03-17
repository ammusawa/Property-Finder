const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function setupDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Creating database...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'property_finder'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'property_finder'}`);
    
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '../lib/db-setup.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL statements more carefully
    // Remove comments and split by semicolons that are followed by newline or end of string
    let cleanedSchema = schema
      .replace(/--.*$/gm, '') // Remove line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .trim();
    
    // Split by semicolon, but keep multi-line statements together
    const statements = cleanedSchema
      .split(';')
      .map(s => s.trim())
      .filter(s => {
        const trimmed = s.trim();
        return trimmed.length > 0 && 
               !trimmed.toLowerCase().startsWith('create database') &&
               !trimmed.toLowerCase().startsWith('use ');
      });
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    let successCount = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
          successCount++;
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists')) {
            successCount++;
            console.log(`  ✓ (already exists)`);
          } else {
            console.error(`  ✗ Error: ${error.message}`);
            console.error(`  Statement: ${statement.substring(0, 100)}...`);
          }
        }
      }
    }
    
    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`\n✅ Database setup complete!`);
    console.log(`   Executed ${successCount} statements`);
    console.log(`   Created ${tables.length} tables:`);
    tables.forEach(table => {
      console.log(`   - ${Object.values(table)[0]}`);
    });
    
    console.log('\n📋 Default admin account:');
    console.log('   Email: admin@propertyfinder.ng');
    console.log('   Password: admin123');
    console.log('   ⚠️  Please change this password in production!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running!');
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();

