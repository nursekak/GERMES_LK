#!/bin/bash

# Скрипт для создания базы данных PostgreSQL для ГЕРМЕС ЛК
# Использование: ./scripts/setup-db.sh

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Создание базы данных для ГЕРМЕС ЛК${NC}"
echo "====================================="

# Проверяем наличие PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL не установлен${NC}"
    echo "Установите PostgreSQL:"
    echo "  Ubuntu/Debian: sudo apt-get install postgresql postgresql-contrib"
    echo "  CentOS/RHEL: sudo yum install postgresql-server postgresql-contrib"
    echo "  macOS: brew install postgresql"
    exit 1
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  Файл .env не найден${NC}"
    echo "Создаю .env файл из шаблона..."
    cp env.example .env
    echo -e "${YELLOW}Отредактируйте .env файл с вашими настройками PostgreSQL${NC}"
    echo "Нажмите Enter для продолжения..."
    read
fi

# Загружаем переменные из .env
source .env

# Параметры подключения
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-germes_lk}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

echo -e "${BLUE}📋 Параметры подключения:${NC}"
echo "  Хост: $DB_HOST"
echo "  Порт: $DB_PORT"
echo "  База данных: $DB_NAME"
echo "  Пользователь: $DB_USER"

# Проверяем подключение к PostgreSQL
echo -e "${BLUE}🔍 Проверка подключения к PostgreSQL...${NC}"
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c '\q' 2>/dev/null; then
    echo -e "${RED}❌ Не удается подключиться к PostgreSQL${NC}"
    echo "Проверьте настройки в .env файле"
    exit 1
fi

echo -e "${GREEN}✅ Подключение к PostgreSQL успешно${NC}"

# Проверяем, существует ли база данных
echo -e "${BLUE}🔍 Проверка существования базы данных...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q "1 row"; then
    echo -e "${YELLOW}⚠️  База данных '$DB_NAME' уже существует${NC}"
    echo -n "Удалить существующую базу данных? (y/N): "
    read -r answer
    if [[ $answer =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🗑️  Удаление базы данных...${NC}"
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS \"$DB_NAME\""
        echo -e "${GREEN}✅ База данных удалена${NC}"
    else
        echo -e "${YELLOW}❌ Операция отменена${NC}"
        exit 0
    fi
fi

# Создаем базу данных с template0 для избежания проблем с collation
echo -e "${BLUE}📦 Создание базы данных '$DB_NAME'...${NC}"

# Получаем информацию о collation из template1
COLLATION_INFO=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -t -c "SELECT datcollate, datctype FROM pg_database WHERE datname = 'template1';" 2>/dev/null)

if [ -n "$COLLATION_INFO" ]; then
    # Извлекаем collation и ctype
    COLLATE=$(echo "$COLLATION_INFO" | awk '{print $1}' | tr -d ' ')
    CTYPE=$(echo "$COLLATION_INFO" | awk '{print $2}' | tr -d ' ')
    
    echo -e "${BLUE}📋 Используем collation: $COLLATE, ctype: $CTYPE${NC}"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
      CREATE DATABASE \"$DB_NAME\" 
      WITH 
      ENCODING = 'UTF8'
      LC_COLLATE = '$COLLATE'
      LC_CTYPE = '$CTYPE'
      TEMPLATE = template0
    "
else
    # Fallback - создаем с template0
    echo -e "${YELLOW}⚠️  Не удалось получить информацию о collation, используем template0${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\" WITH TEMPLATE = template0"
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ База данных создана${NC}"
else
    echo -e "${RED}❌ Ошибка создания базы данных${NC}"
    exit 1
fi

# Создаем пользователя (если не postgres)
if [ "$DB_USER" != "postgres" ]; then
    echo -e "${BLUE}👤 Создание пользователя '$DB_USER'...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE USER \"$DB_USER\" WITH PASSWORD '$DB_PASSWORD'" 2>/dev/null || echo "Пользователь уже существует"
    
    # Предоставляем права
    echo -e "${BLUE}🔐 Предоставление прав доступа...${NC}"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\""
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "ALTER USER \"$DB_USER\" CREATEDB"
    echo -e "${GREEN}✅ Права предоставлены${NC}"
fi

# Создаем расширения и таблицы
echo -e "${BLUE}📋 Создание таблиц...${NC}"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
-- Создание расширений
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";

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
"

echo -e "${GREEN}✅ Таблицы созданы${NC}"

# Создаем начальные данные
echo -e "${BLUE}🌱 Создание начальных данных...${NC}"

# Создаем SQL файл с начальными данными
cat > /tmp/init_data.sql << 'EOF'
-- Создание администратора
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('admin@germes.ru', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.5.2', 'Администратор', 'Системы', 'manager', true)
ON CONFLICT (email) DO NOTHING;

-- Создание тестового сотрудника
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('employee@germes.ru', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.5.2', 'Иван', 'Петров', 'employee', true)
ON CONFLICT (email) DO NOTHING;

-- Создание тестового места работы
INSERT INTO workplaces (name, address, qr_code, description, is_active)
VALUES ('Главный офис', 'г. Москва, ул. Примерная, д. 1', uuid_generate_v4()::text, 'Основное место работы', true)
ON CONFLICT (qr_code) DO NOTHING;
EOF

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f /tmp/init_data.sql
rm /tmp/init_data.sql

echo -e "${GREEN}✅ Начальные данные созданы${NC}"

# Тестируем подключение
echo -e "${BLUE}🔍 Тестирование подключения...${NC}"
if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Подключение к новой базе данных успешно${NC}"
else
    echo -e "${RED}❌ Ошибка подключения к новой базе данных${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Установка завершена успешно!${NC}"
echo ""
echo -e "${BLUE}📋 Следующие шаги:${NC}"
echo "1. Установите зависимости: npm install"
echo "2. Запустите сервер: npm run dev"
echo "3. Откройте браузер: http://localhost:3000"
echo ""
echo -e "${BLUE}👤 Тестовые учетные записи:${NC}"
echo "   Администратор: admin@germes.ru / admin123"
echo "   Сотрудник: employee@germes.ru / employee123"
echo ""
echo -e "${BLUE}📊 Информация о базе данных:${NC}"
echo "   Имя: $DB_NAME"
echo "   Пользователь: $DB_USER"
echo "   Хост: $DB_HOST:$DB_PORT"
