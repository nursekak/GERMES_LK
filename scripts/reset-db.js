const { Client } = require('pg');
require('dotenv').config();

async function resetDatabase() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'germes_lk'
  };

  const client = new Client(config);
  
  try {
    console.log('🗑️  Сброс базы данных...');
    await client.connect();

    // Удаляем все таблицы в правильном порядке (с учетом внешних ключей)
    const tables = ['reports', 'attendance', 'workplaces', 'users'];
    
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`✅ Таблица ${table} удалена`);
      } catch (error) {
        console.log(`⚠️  Таблица ${table} не найдена или уже удалена`);
      }
    }

    // Удаляем типы ENUM, если они существуют
    const enumTypes = ['enum_users_role', 'enum_attendance_status', 'enum_reports_status'];
    
    for (const enumType of enumTypes) {
      try {
        await client.query(`DROP TYPE IF EXISTS "${enumType}" CASCADE`);
        console.log(`✅ Тип ${enumType} удален`);
      } catch (error) {
        console.log(`⚠️  Тип ${enumType} не найден`);
      }
    }

    console.log('✅ База данных сброшена');
    console.log('Теперь запустите: npm run dev');
    
  } catch (error) {
    console.error('❌ Ошибка сброса базы данных:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

resetDatabase();

