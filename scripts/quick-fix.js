const { Client } = require('pg');
require('dotenv').config();

async function quickFix() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: 'postgres'
  };

  const client = new Client(config);
  
  try {
    console.log('🔧 Быстрое исправление проблемы с collation...');
    await client.connect();

    const dbName = process.env.DB_NAME || 'germes_lk';
    
    // Удаляем существующую базу данных, если она есть
    console.log(`🗑️  Удаление существующей базы данных '${dbName}'...`);
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    
    // Создаем базу данных с template0 (это решает проблему с collation)
    console.log(`📦 Создание базы данных '${dbName}' с template0...`);
    await client.query(`CREATE DATABASE "${dbName}" WITH TEMPLATE = template0`);
    
    console.log('✅ База данных создана успешно!');
    console.log('Теперь запустите: npm run init-db');
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

quickFix();
