# Скрипты для работы с базой данных

Этот каталог содержит скрипты для создания и управления базой данных PostgreSQL для системы ГЕРМЕС ЛК.

## Доступные скрипты

### 1. Node.js скрипты

#### `create-database.js` - Основной скрипт создания БД
```bash
# Создание базы данных с интерактивным интерфейсом
npm run create-db
# или
npm run setup-db
```

**Возможности:**
- Проверка подключения к PostgreSQL
- Создание базы данных
- Создание пользователя (если не postgres)
- Создание всех таблиц и индексов
- Создание начальных данных
- Тестирование подключения

#### `init-db.js` - Инициализация с тестовыми данными
```bash
# Инициализация базы данных с тестовыми пользователями
npm run init-db
```

**Создает:**
- Администратора: `admin@germes.ru` / `admin123`
- Сотрудника: `employee@germes.ru` / `employee123`
- Тестовое место работы

#### `backup.js` - Управление резервными копиями
```bash
# Создание резервной копии
npm run backup:create

# Очистка старых копий
npm run backup:cleanup

# Просмотр информации о копиях
npm run backup:info

# Запуск автоматического резервного копирования
npm run backup:schedule
```

### 2. Bash скрипт (Linux/macOS)

#### `setup-db.sh` - Автоматическое создание БД
```bash
# Сделать скрипт исполняемым
chmod +x scripts/setup-db.sh

# Запустить создание БД
./scripts/setup-db.sh
```

**Особенности:**
- Цветной вывод
- Автоматическая проверка зависимостей
- Интерактивное подтверждение удаления существующей БД
- Создание всех таблиц и начальных данных

### 3. PowerShell скрипт (Windows)

#### `setup-db.ps1` - Создание БД для Windows
```powershell
# Запуск с подтверждением
.\scripts\setup-db.ps1

# Запуск с принудительным удалением существующей БД
.\scripts\setup-db.ps1 -Force
```

**Особенности:**
- Цветной вывод
- Проверка установки PostgreSQL
- Автоматическое создание .env файла
- Создание всех таблиц и начальных данных

## Быстрый старт

### Для Linux/macOS:
```bash
# 1. Установить зависимости
npm install

# 2. Создать базу данных
./scripts/setup-db.sh

# 3. Запустить сервер
npm run dev
```

### Для Windows:
```powershell
# 1. Установить зависимости
npm install

# 2. Создать базу данных
.\scripts\setup-db.ps1

# 3. Запустить сервер
npm run dev
```

### Универсальный способ (Node.js):
```bash
# 1. Установить зависимости
npm install

# 2. Создать базу данных
npm run create-db

# 3. Запустить сервер
npm run dev
```

## Настройка переменных окружения

Перед запуском скриптов убедитесь, что файл `.env` настроен правильно:

```env
# Настройки базы данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=germes_lk
DB_USER=postgres
DB_PASSWORD=your_password

# JWT секретный ключ
JWT_SECRET=your_super_secret_jwt_key_here

# Настройки сессии
SESSION_SECRET=your_session_secret_here

# Настройки сервера
PORT=5000
NODE_ENV=development
```

## Структура создаваемых таблиц

### users (Пользователи)
- `id` - UUID, первичный ключ
- `email` - Email, уникальный
- `password` - Хешированный пароль
- `first_name` - Имя
- `last_name` - Фамилия
- `role` - Роль (manager/employee)
- `is_active` - Активность
- `last_login` - Последний вход
- `created_at`, `updated_at`, `deleted_at` - Временные метки

### workplaces (Места работы)
- `id` - UUID, первичный ключ
- `name` - Название места
- `address` - Адрес
- `qr_code` - QR код для сканирования
- `is_active` - Активность
- `description` - Описание
- `created_at`, `updated_at`, `deleted_at` - Временные метки

### attendance (Посещения)
- `id` - UUID, первичный ключ
- `user_id` - Ссылка на пользователя
- `workplace_id` - Ссылка на место работы
- `check_in_time` - Время прихода
- `check_out_time` - Время ухода
- `status` - Статус (present/late/absent)
- `notes` - Заметки
- `ip_address` - IP адрес
- `user_agent` - User Agent
- `created_at`, `updated_at`, `deleted_at` - Временные метки

### reports (Отчеты)
- `id` - UUID, первичный ключ
- `user_id` - Ссылка на пользователя
- `title` - Заголовок отчета
- `content` - Содержание
- `report_date` - Дата отчета
- `status` - Статус (draft/submitted/approved/rejected)
- `approved_by` - Кто утвердил
- `approved_at` - Когда утвержден
- `comments` - Комментарии
- `created_at`, `updated_at`, `deleted_at` - Временные метки

## Устранение неполадок

### Ошибка подключения к PostgreSQL
1. Убедитесь, что PostgreSQL запущен
2. Проверьте настройки в .env файле
3. Проверьте, что пользователь имеет права на создание БД

### Ошибка "база данных уже существует"
- Используйте флаг `-Force` для PowerShell
- Подтвердите удаление существующей БД в интерактивном режиме

### Ошибка прав доступа
- Убедитесь, что пользователь PostgreSQL имеет права на создание БД
- Для Windows: запустите PowerShell от имени администратора

### Ошибка collation (несоответствие версии правила сортировки)
Эта ошибка возникает при несоответствии collation между template0 и template1 в PostgreSQL.

**Быстрое решение:**
```bash
npm run quick-fix
```

**Подробная диагностика и исправление:**
```bash
npm run fix-collation
```

**Ручное исправление:**
```sql
-- Подключитесь к PostgreSQL и выполните:
DROP DATABASE IF EXISTS germes_lk;
CREATE DATABASE germes_lk WITH TEMPLATE = template0;
```

**Причины проблемы:**
- Обновление PostgreSQL
- Разные версии collation в template0 и template1
- Неправильная настройка локали при установке PostgreSQL

**Профилактика:**
- Всегда используйте template0 при создании новых БД
- Проверяйте совместимость collation перед созданием БД

## Дополнительные команды

### Просмотр информации о БД
```bash
# Подключение к БД
psql -h localhost -U postgres -d germes_lk

# Просмотр таблиц
\dt

# Просмотр пользователей
SELECT * FROM users;

# Выход
\q
```

### Очистка БД
```bash
# Удаление всех данных (осторожно!)
psql -h localhost -U postgres -d germes_lk -c "TRUNCATE users, workplaces, attendance, reports CASCADE;"
```
