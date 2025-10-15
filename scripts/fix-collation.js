const { Client } = require('pg');
require('dotenv').config();

class CollationFixer {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: 'postgres'
    };
  }

  async diagnoseCollationIssues() {
    const client = new Client(this.config);
    
    try {
      console.log('🔍 Диагностика проблем с collation...');
      await client.connect();

      // Проверяем версию PostgreSQL
      const versionResult = await client.query('SELECT version()');
      console.log(`📋 Версия PostgreSQL: ${versionResult.rows[0].version.split(' ')[1]}`);

      // Проверяем доступные collation
      const collationResult = await client.query(`
        SELECT datname, datcollate, datctype, datcollversion
        FROM pg_database 
        WHERE datname IN ('template0', 'template1', 'postgres')
        ORDER BY datname
      `);

      console.log('\n📊 Информация о collation в системных базах:');
      console.log('='.repeat(80));
      collationResult.rows.forEach(row => {
        console.log(`База: ${row.datname}`);
        console.log(`  Collate: ${row.datcollate}`);
        console.log(`  Ctype: ${row.datctype}`);
        console.log(`  Version: ${row.datcollversion || 'N/A'}`);
        console.log('');
      });

      // Проверяем существующие пользовательские базы
      const userDbsResult = await client.query(`
        SELECT datname, datcollate, datctype, datcollversion
        FROM pg_database 
        WHERE datname NOT IN ('template0', 'template1', 'postgres')
        ORDER BY datname
      `);

      if (userDbsResult.rows.length > 0) {
        console.log('📊 Пользовательские базы данных:');
        console.log('='.repeat(80));
        userDbsResult.rows.forEach(row => {
          console.log(`База: ${row.datname}`);
          console.log(`  Collate: ${row.datcollate}`);
          console.log(`  Ctype: ${row.datctype}`);
          console.log(`  Version: ${row.datcollversion || 'N/A'}`);
          console.log('');
        });
      }

      // Проверяем совместимость collation
      const template0 = collationResult.rows.find(r => r.datname === 'template0');
      const template1 = collationResult.rows.find(r => r.datname === 'template1');

      if (template0 && template1) {
        if (template0.datcollate !== template1.datcollate || 
            template0.datctype !== template1.datctype) {
          console.log('⚠️  Обнаружено несоответствие collation между template0 и template1');
          console.log('   Это может вызывать ошибки при создании новых баз данных');
        } else {
          console.log('✅ Collation в template0 и template1 совпадают');
        }
      }

    } catch (error) {
      console.error('❌ Ошибка диагностики:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }

  async fixCollationIssues() {
    const client = new Client(this.config);
    
    try {
      console.log('🔧 Исправление проблем с collation...');
      await client.connect();

      // Получаем информацию о template0
      const template0Info = await client.query(`
        SELECT datcollate, datctype 
        FROM pg_database 
        WHERE datname = 'template0'
      `);

      if (template0Info.rows.length === 0) {
        throw new Error('Не удалось получить информацию о template0');
      }

      const { datcollate, datctype } = template0Info.rows[0];
      console.log(`📋 Используем collation из template0: ${datcollate}, ctype: ${datctype}`);

      // Проверяем, существует ли целевая база данных
      const dbName = process.env.DB_NAME || 'germes_lk';
      const dbExists = await client.query(`
        SELECT 1 FROM pg_database WHERE datname = $1
      `, [dbName]);

      if (dbExists.rows.length > 0) {
        console.log(`🗑️  Удаление существующей базы данных '${dbName}'...`);
        await client.query(`DROP DATABASE "${dbName}"`);
      }

      // Создаем базу данных с правильными параметрами
      console.log(`📦 Создание базы данных '${dbName}' с правильными параметрами...`);
      await client.query(`
        CREATE DATABASE "${dbName}" 
        WITH 
        ENCODING = 'UTF8'
        LC_COLLATE = '${datcollate}'
        LC_CTYPE = '${datctype}'
        TEMPLATE = template0
      `);

      console.log('✅ База данных создана с правильными параметрами');

      // Тестируем подключение к новой базе
      const testClient = new Client({
        ...this.config,
        database: dbName
      });

      await testClient.connect();
      console.log('✅ Подключение к новой базе данных успешно');
      await testClient.end();

    } catch (error) {
      console.error('❌ Ошибка исправления:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }

  async createTablesWithCollation() {
    const client = new Client({
      ...this.config,
      database: process.env.DB_NAME || 'germes_lk'
    });
    
    try {
      console.log('📋 Создание таблиц с правильными параметрами...');
      await client.connect();

      // SQL для создания таблиц с явным указанием collation
      const createTablesSQL = `
        -- Создание расширений
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Таблица пользователей
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          first_name VARCHAR(50) NOT NULL,
          last_name VARCHAR(50) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('manager', 'employee')),
          is_active BOOLEAN DEFAULT true,
          last_login TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
        
        -- Таблица мест работы
        CREATE TABLE IF NOT EXISTS workplaces (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name VARCHAR(100) NOT NULL,
          address TEXT NOT NULL,
          qr_code VARCHAR(255) UNIQUE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
        
        -- Таблица посещений
        CREATE TABLE IF NOT EXISTS attendance (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          workplace_id UUID NOT NULL REFERENCES workplaces(id) ON DELETE CASCADE,
          check_in_time TIMESTAMP NOT NULL,
          check_out_time TIMESTAMP,
          status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent')),
          notes TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
        
        -- Таблица отчетов
        CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          report_date DATE NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
          approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
          approved_at TIMESTAMP,
          comments TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP
        );
        
        -- Создание индексов
        CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance(user_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_workplace_id ON attendance(workplace_id);
        CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance(check_in_time);
        CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
        CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_workplaces_qr_code ON workplaces(qr_code);
      `;
      
      await client.query(createTablesSQL);
      console.log('✅ Таблицы созданы успешно');
      
    } catch (error) {
      console.error('❌ Ошибка создания таблиц:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }
}

// Функция для интерактивного исправления
async function interactiveFix() {
  const fixer = new CollationFixer();
  
  console.log('🔧 Исправление проблем с collation для ГЕРМЕС ЛК');
  console.log('===============================================\n');
  
  try {
    await fixer.diagnoseCollationIssues();
    
    console.log('\n' + '='.repeat(80));
    console.log('Хотите исправить проблемы с collation? (y/N)');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Продолжить исправление? ', resolve);
    });
    
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      await fixer.fixCollationIssues();
      await fixer.createTablesWithCollation();
      
      console.log('\n🎉 Исправление завершено успешно!');
      console.log('Теперь вы можете запустить: npm run init-db');
    } else {
      console.log('❌ Операция отменена');
    }
    
  } catch (error) {
    console.error('\n❌ Ошибка исправления:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  interactiveFix();
}

module.exports = CollationFixer;



