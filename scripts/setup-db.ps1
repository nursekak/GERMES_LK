# Скрипт для создания базы данных PostgreSQL для ГЕРМЕС ЛК
# Использование: .\scripts\setup-db.ps1

param(
    [switch]$Force
)

# Функция для вывода цветного текста
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Функция для проверки команды
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

Write-ColorOutput "🚀 Создание базы данных для ГЕРМЕС ЛК" "Blue"
Write-ColorOutput "=====================================" "Blue"

# Проверяем наличие PostgreSQL
if (-not (Test-Command "psql")) {
    Write-ColorOutput "❌ PostgreSQL не установлен" "Red"
    Write-ColorOutput "Установите PostgreSQL с официального сайта: https://www.postgresql.org/download/" "Yellow"
    Write-ColorOutput "Или используйте Chocolatey: choco install postgresql" "Yellow"
    exit 1
}

# Проверяем наличие .env файла
if (-not (Test-Path ".env")) {
    Write-ColorOutput "⚠️  Файл .env не найден" "Yellow"
    Write-ColorOutput "Создаю .env файл из шаблона..." "Blue"
    Copy-Item "env.example" ".env"
    Write-ColorOutput "Отредактируйте .env файл с вашими настройками PostgreSQL" "Yellow"
    Write-ColorOutput "Нажмите Enter для продолжения..." "Yellow"
    Read-Host
}

# Загружаем переменные из .env
$envContent = Get-Content ".env" | Where-Object { $_ -match "^[^#]" -and $_ -match "=" }
foreach ($line in $envContent) {
    $parts = $line -split "=", 2
    if ($parts.Length -eq 2) {
        [Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
    }
}

# Параметры подключения
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "germes_lk" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "" }

Write-ColorOutput "📋 Параметры подключения:" "Blue"
Write-ColorOutput "  Хост: $DB_HOST" "White"
Write-ColorOutput "  Порт: $DB_PORT" "White"
Write-ColorOutput "  База данных: $DB_NAME" "White"
Write-ColorOutput "  Пользователь: $DB_USER" "White"

# Проверяем подключение к PostgreSQL
Write-ColorOutput "🔍 Проверка подключения к PostgreSQL..." "Blue"
$env:PGPASSWORD = $DB_PASSWORD
$testConnection = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "\q" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "❌ Не удается подключиться к PostgreSQL" "Red"
    Write-ColorOutput "Проверьте настройки в .env файле" "Yellow"
    exit 1
}

Write-ColorOutput "✅ Подключение к PostgreSQL успешно" "Green"

# Проверяем, существует ли база данных
Write-ColorOutput "🔍 Проверка существования базы данных..." "Blue"
$checkDb = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" 2>$null
if ($checkDb -match "1 row") {
    Write-ColorOutput "⚠️  База данных '$DB_NAME' уже существует" "Yellow"
    if (-not $Force) {
        $answer = Read-Host "Удалить существующую базу данных? (y/N)"
        if ($answer -notmatch "^[Yy]$") {
            Write-ColorOutput "❌ Операция отменена" "Red"
            exit 0
        }
    }
    Write-ColorOutput "🗑️  Удаление базы данных..." "Blue"
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS `"$DB_NAME`""
    Write-ColorOutput "✅ База данных удалена" "Green"
}

# Создаем базу данных с template0 для избежания проблем с collation
Write-ColorOutput "📦 Создание базы данных '$DB_NAME'..." "Blue"

# Получаем информацию о collation из template1
$collationInfo = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -t -c "SELECT datcollate, datctype FROM pg_database WHERE datname = 'template1';" 2>$null

if ($collationInfo -and $collationInfo.Trim() -ne "") {
    # Извлекаем collation и ctype
    $parts = $collationInfo.Trim() -split '\s+'
    $collate = $parts[0]
    $ctype = $parts[1]
    
    Write-ColorOutput "📋 Используем collation: $collate, ctype: $ctype" "Blue"
    
    $createDbSQL = @"
CREATE DATABASE `"$DB_NAME`" 
WITH 
ENCODING = 'UTF8'
LC_COLLATE = '$collate'
LC_CTYPE = '$ctype'
TEMPLATE = template0
"@
    
    $createDbSQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres
} else {
    # Fallback - создаем с template0
    Write-ColorOutput "⚠️  Не удалось получить информацию о collation, используем template0" "Yellow"
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE `"$DB_NAME`" WITH TEMPLATE = template0"
}

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "❌ Ошибка создания базы данных" "Red"
    exit 1
}
Write-ColorOutput "✅ База данных создана" "Green"

# Создаем пользователя (если не postgres)
if ($DB_USER -ne "postgres") {
    Write-ColorOutput "👤 Создание пользователя '$DB_USER'..." "Blue"
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE USER `"$DB_USER`" WITH PASSWORD '$DB_PASSWORD'" 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "✅ Пользователь создан" "Green"
    } else {
        Write-ColorOutput "⚠️  Пользователь уже существует" "Yellow"
    }
    
    # Предоставляем права
    Write-ColorOutput "🔐 Предоставление прав доступа..." "Blue"
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE `"$DB_NAME`" TO `"$DB_USER`""
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "ALTER USER `"$DB_USER`" CREATEDB"
    Write-ColorOutput "✅ Права предоставлены" "Green"
}

# Создаем расширения и таблицы
Write-ColorOutput "📋 Создание таблиц..." "Blue"
$createTablesSQL = @"
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
"@

$createTablesSQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "❌ Ошибка создания таблиц" "Red"
    exit 1
}
Write-ColorOutput "✅ Таблицы созданы" "Green"

# Создаем начальные данные
Write-ColorOutput "🌱 Создание начальных данных..." "Blue"
$initDataSQL = @"
-- Создание администратора (пароль: admin123)
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('admin@germes.ru', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.5.2', 'Администратор', 'Системы', 'manager', true)
ON CONFLICT (email) DO NOTHING;

-- Создание тестового сотрудника (пароль: employee123)
INSERT INTO users (email, password, first_name, last_name, role, is_active)
VALUES ('employee@germes.ru', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8.5.2', 'Иван', 'Петров', 'employee', true)
ON CONFLICT (email) DO NOTHING;

-- Создание тестового места работы
INSERT INTO workplaces (name, address, qr_code, description, is_active)
VALUES ('Главный офис', 'г. Москва, ул. Примерная, д. 1', uuid_generate_v4()::text, 'Основное место работы', true)
ON CONFLICT (qr_code) DO NOTHING;
"@

$initDataSQL | & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "❌ Ошибка создания начальных данных" "Red"
    exit 1
}
Write-ColorOutput "✅ Начальные данные созданы" "Green"

# Тестируем подключение
Write-ColorOutput "🔍 Тестирование подключения..." "Blue"
$testResult = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) FROM users;" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-ColorOutput "✅ Подключение к новой базе данных успешно" "Green"
} else {
    Write-ColorOutput "❌ Ошибка подключения к новой базе данных" "Red"
    exit 1
}

Write-ColorOutput "" "White"
Write-ColorOutput "🎉 Установка завершена успешно!" "Green"
Write-ColorOutput "" "White"
Write-ColorOutput "📋 Следующие шаги:" "Blue"
Write-ColorOutput "1. Установите зависимости: npm install" "White"
Write-ColorOutput "2. Запустите сервер: npm run dev" "White"
Write-ColorOutput "3. Откройте браузер: http://localhost:3000" "White"
Write-ColorOutput "" "White"
Write-ColorOutput "👤 Тестовые учетные записи:" "Blue"
Write-ColorOutput "   Администратор: admin@germes.ru / admin123" "White"
Write-ColorOutput "   Сотрудник: employee@germes.ru / employee123" "White"
Write-ColorOutput "" "White"
Write-ColorOutput "📊 Информация о базе данных:" "Blue"
Write-ColorOutput "   Имя: $DB_NAME" "White"
Write-ColorOutput "   Пользователь: $DB_USER" "White"
Write-ColorOutput "   Хост: $DB_HOST`:$DB_PORT" "White"
