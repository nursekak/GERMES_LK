const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class DatabaseCreator {
  constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: 'postgres' // Подключаемся к системной БД для создания новой
    };
  }

  async createDatabase() {
    const client = new Client(this.config);
    
    try {
      console.log('Подключение к PostgreSQL...');
      await client.connect();
      console.log('✅ Подключение установлено');

      const dbName = process.env.DB_NAME || 'germes_lk';
      
      // Проверяем, существует ли база данных
      const checkDbQuery = `
        SELECT 1 FROM pg_database WHERE datname = $1
      `;
      const dbExists = await client.query(checkDbQuery, [dbName]);
      
      if (dbExists.rows.length > 0) {
        console.log(`⚠️  База данных '${dbName}' уже существует`);
        
        const readline = require('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });

        const answer = await new Promise((resolve) => {
          rl.question('Удалить существующую базу данных? (y/N): ', resolve);
        });
        
        rl.close();
        
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          console.log(`🗑️  Удаление базы данных '${dbName}'...`);
          await client.query(`DROP DATABASE "${dbName}"`);
          console.log('✅ База данных удалена');
        } else {
          console.log('❌ Операция отменена');
          return;
        }
      }

      // Создаем базу данных с явным указанием кодировки и collation
      console.log(`📦 Создание базы данных '${dbName}'...`);
      
      // Получаем информацию о текущей кодировке и collation
      const templateInfo = await client.query(`
        SELECT datname, datcollate, datctype 
        FROM pg_database 
        WHERE datname = 'template1'
      `);
      
      if (templateInfo.rows.length > 0) {
        const { datcollate, datctype } = templateInfo.rows[0];
        console.log(`📋 Используем collation: ${datcollate}, ctype: ${datctype}`);
        
        await client.query(`
          CREATE DATABASE "${dbName}" 
          WITH 
          ENCODING = 'UTF8'
          LC_COLLATE = '${datcollate}'
          LC_CTYPE = '${datctype}'
          TEMPLATE = template0
        `);
      } else {
        // Fallback - создаем с template0
        await client.query(`CREATE DATABASE "${dbName}" WITH TEMPLATE = template0`);
      }
      
      console.log('✅ База данных создана успешно');

      // Создаем пользователя (если указан)
      if (process.env.DB_USER && process.env.DB_USER !== 'postgres') {
        const dbUser = process.env.DB_USER;
        const dbPassword = process.env.DB_PASSWORD;
        
        console.log(`👤 Создание пользователя '${dbUser}'...`);
        
        try {
          await client.query(`CREATE USER "${dbUser}" WITH PASSWORD '${dbPassword}'`);
          console.log('✅ Пользователь создан');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('⚠️  Пользователь уже существует');
          } else {
            throw error;
          }
        }
        
        // Предоставляем права
        console.log('🔐 Предоставление прав доступа...');
        await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO "${dbUser}"`);
        await client.query(`ALTER USER "${dbUser}" CREATEDB`);
        console.log('✅ Права предоставлены');
      }

      console.log('\n🎉 База данных успешно создана!');
      console.log(`📊 Имя базы данных: ${dbName}`);
      console.log(`👤 Пользователь: ${this.config.user}`);
      console.log(`🌐 Хост: ${this.config.host}:${this.config.port}`);
      
    } catch (error) {
      console.error('❌ Ошибка создания базы данных:', error.message);
      process.exit(1);
    } finally {
      await client.end();
    }
  }

  async testConnection() {
    const testConfig = {
      ...this.config,
      database: process.env.DB_NAME || 'germes_lk'
    };
    
    const client = new Client(testConfig);
    
    try {
      console.log('🔍 Тестирование подключения к новой базе данных...');
      await client.connect();
      console.log('✅ Подключение к новой базе данных успешно');
      
      // Проверяем версию PostgreSQL
      const versionResult = await client.query('SELECT version()');
      console.log(`📋 Версия PostgreSQL: ${versionResult.rows[0].version.split(' ')[1]}`);
      
    } catch (error) {
      console.error('❌ Ошибка подключения к новой базе данных:', error.message);
      process.exit(1);
    } finally {
      await client.end();
    }
  }

  async createTables() {
    const client = new Client({
      ...this.config,
      database: process.env.DB_NAME || 'germes_lk'
    });
    
    try {
      console.log('📋 Создание таблиц...');
      await client.connect();
      
      // SQL для создания таблиц
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
        
        -- Создание триггеров для обновления updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_workplaces_updated_at BEFORE UPDATE ON workplaces
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
        CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;
      
      await client.query(createTablesSQL);
      console.log('✅ Таблицы созданы успешно');
      
      // Создание начальных данных
      console.log('🌱 Создание начальных данных...');
      
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      
      // Создание администратора
      const adminPassword = await bcrypt.hash('admin123', 12);
      await client.query(`
        INSERT INTO users (id, email, password, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, [uuidv4(), 'admin@germes.ru', adminPassword, 'Администратор', 'Системы', 'manager', true]);
      
      // Создание тестового сотрудника
      const employeePassword = await bcrypt.hash('employee123', 12);
      await client.query(`
        INSERT INTO users (id, email, password, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (email) DO NOTHING
      `, [uuidv4(), 'employee@germes.ru', employeePassword, 'Иван', 'Петров', 'employee', true]);
      
      // Создание тестового места работы
      const qrCode = uuidv4();
      await client.query(`
        INSERT INTO workplaces (id, name, address, qr_code, description, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (qr_code) DO NOTHING
      `, [uuidv4(), 'Главный офис', 'г. Москва, ул. Примерная, д. 1', qrCode, 'Основное место работы', true]);
      
      console.log('✅ Начальные данные созданы');
      
    } catch (error) {
      console.error('❌ Ошибка создания таблиц:', error.message);
      throw error;
    } finally {
      await client.end();
    }
  }
}

// Функция для интерактивного создания БД
async function interactiveCreate() {
  const creator = new DatabaseCreator();
  
  console.log('🚀 Создание базы данных для ГЕРМЕС ЛК');
  console.log('=====================================\n');
  
  // Проверяем наличие .env файла
  if (!fs.existsSync('.env')) {
    console.log('⚠️  Файл .env не найден. Создайте его на основе env.example');
    console.log('   cp env.example .env');
    console.log('   Затем отредактируйте .env файл с вашими настройками\n');
  }
  
  try {
    await creator.createDatabase();
    await creator.testConnection();
    await creator.createTables();
    
    console.log('\n🎉 Установка завершена успешно!');
    console.log('\n📋 Следующие шаги:');
    console.log('1. Запустите сервер: npm run dev');
    console.log('2. Откройте браузер: http://localhost:3000');
    console.log('\n👤 Тестовые учетные записи:');
    console.log('   Администратор: admin@germes.ru / admin123');
    console.log('   Сотрудник: employee@germes.ru / employee123');
    
  } catch (error) {
    console.error('\n❌ Ошибка установки:', error.message);
    process.exit(1);
  }
}

// Запуск скрипта
if (require.main === module) {
  interactiveCreate();
}

module.exports = DatabaseCreator;
