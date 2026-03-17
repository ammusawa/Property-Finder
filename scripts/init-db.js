/**
 * Database initialization script
 * Run this script to set up the database schema
 * 
 * Usage: node scripts/init-db.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

async function initDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Creating database if not exists...');
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'property_finder'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'property_finder'}`);
    
    console.log('Reading schema file...');
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../lib/db-setup.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.query(statement);
        } catch (error) {
          // Ignore "already exists" errors
          if (!error.message.includes('already exists')) {
            console.error('Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Database initialized successfully!');
    console.log('\nDefault admin account:');
    console.log('  Email: admin@propertyfinder.ng');
    console.log('  Password: admin123');
    console.log('  ⚠️  Please change this password in production!');
    
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();

