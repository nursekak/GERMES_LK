# ГЕРМЕС - Личный кабинет для управления сотрудниками

Система управления сотрудниками и отслеживания посещений с использованием QR-кодов для регистрации явки на работу.

## Функциональные возможности

### Для всех пользователей:
- ✅ Регистрация и аутентификация пользователей
- ✅ Просмотр личной статистики посещений
- ✅ Создание и управление отчетами
- ✅ Регистрация явки на работу через QR-код
- ✅ Экспорт отчетов в CSV

### Для руководителей:
- ✅ Управление сотрудниками (создание, редактирование, удаление)
- ✅ Управление местами работы
- ✅ Просмотр статистики всех сотрудников
- ✅ Утверждение/отклонение отчетов
- ✅ Управление резервными копиями базы данных

## Технологический стек

### Backend:
- **Node.js** + **Express.js** - серверная часть
- **PostgreSQL** - база данных
- **Sequelize** - ORM для работы с БД
- **JWT** - аутентификация
- **bcryptjs** - хеширование паролей
- **Helmet** - безопасность
- **Express Rate Limit** - защита от DDoS
- **QRCode** - генерация QR-кодов

### Frontend:
- **React 18** - пользовательский интерфейс
- **Ant Design** - UI компоненты
- **React Router** - маршрутизация
- **React Query** - управление состоянием сервера
- **Axios** - HTTP клиент

## Установка и настройка

### Предварительные требования:
- Node.js (версия 16 или выше)
- PostgreSQL (версия 12 или выше)
- npm или yarn

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd GERMES_LK
```

### 2. Установка зависимостей
```bash
# Установка зависимостей backend
npm install

# Установка зависимостей frontend
cd client
npm install
cd ..
```

### 3. Настройка базы данных

#### Автоматическое создание (рекомендуется):

**Для Linux/macOS:**
```bash
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh
```

**Для Windows:**
```powershell
.\scripts\setup-db.ps1
```

**Универсальный способ (Node.js):**
```bash
npm run create-db
```

#### Ручное создание:
```sql
-- Создание базы данных
CREATE DATABASE germes_lk;

-- Создание пользователя (опционально)
CREATE USER germes_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE germes_lk TO germes_user;
```

### 4. Настройка переменных окружения
Скопируйте файл `env.example` в `.env` и настройте переменные:

```bash
cp env.example .env
```

Отредактируйте `.env` файл:
```env
# Настройки базы данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=germes_lk
DB_USER=postgres
DB_PASSWORD=your_password

# JWT секретный ключ (сгенерируйте случайную строку)
JWT_SECRET=your_super_secret_jwt_key_here

# Настройки сессии
SESSION_SECRET=your_session_secret_here

# Настройки сервера
PORT=5000
NODE_ENV=development

# Настройки резервного копирования
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
```

### 5. Инициализация базы данных
```bash
# Создание БД с тестовыми данными
npm run init-db
```

### 6. Запуск приложения

#### Режим разработки:
```bash
# Запуск backend сервера
npm run dev

# В новом терминале - запуск frontend
cd client
npm start
```

#### Продакшн режим:
```bash
# Сборка frontend
npm run build

# Запуск production сервера
npm start
```

Приложение будет доступно по адресу:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Доступные скрипты

### Управление базой данных:
```bash
# Создание БД (интерактивно)
npm run create-db

# Инициализация с тестовыми данными
npm run init-db

# Создание резервной копии
npm run backup:create

# Очистка старых резервных копий
npm run backup:cleanup

# Просмотр информации о резервных копиях
npm run backup:info

# Запуск автоматического резервного копирования
npm run backup:schedule
```

### Разработка:
```bash
# Запуск в режиме разработки
npm run dev

# Сборка frontend
npm run build

# Установка зависимостей frontend
npm run install-client
```

## Настройка автоматического резервного копирования

### 1. Ручное создание резервной копии:
```bash
node scripts/backup.js create
```

### 2. Очистка старых резервных копий:
```bash
node scripts/backup.js cleanup
```

### 3. Просмотр информации о резервных копиях:
```bash
node scripts/backup.js info
```

### 4. Запуск автоматического резервного копирования:
```bash
node scripts/backup.js schedule
```

## API Документация

### Аутентификация
- `POST /api/auth/register` - регистрация пользователя
- `POST /api/auth/login` - вход в систему
- `GET /api/auth/me` - получение информации о текущем пользователе
- `PUT /api/auth/profile` - обновление профиля
- `PUT /api/auth/change-password` - смена пароля
- `POST /api/auth/logout` - выход из системы

### Управление пользователями
- `GET /api/users` - список пользователей (только для руководителей)
- `GET /api/users/:id` - информация о пользователе
- `POST /api/users` - создание пользователя (только для руководителей)
- `PUT /api/users/:id` - обновление пользователя
- `DELETE /api/users/:id` - удаление пользователя (только для руководителей)

### Места работы
- `GET /api/workplaces` - список мест работы
- `GET /api/workplaces/:id` - информация о месте работы
- `POST /api/workplaces` - создание места работы (только для руководителей)
- `PUT /api/workplaces/:id` - обновление места работы (только для руководителей)
- `DELETE /api/workplaces/:id` - удаление места работы (только для руководителей)

### Посещения
- `POST /api/attendance/check-in` - регистрация явки по QR-коду
- `POST /api/attendance/check-out` - регистрация ухода
- `POST /api/attendance/manual-check-in` - ручная отметка присутствия (только для руководителей)
- `POST /api/attendance/manual-check-out` - ручная отметка ухода (только для руководителей)
- `GET /api/attendance/my-stats` - личная статистика посещений
- `GET /api/attendance/all-stats` - общая статистика (только для руководителей)
- `GET /api/attendance/full-stats-30-days` - полная статистика за 30 дней (только для руководителей)
- `PUT /api/attendance/update-absence-reason` - обновление причины отсутствия (только для руководителей)
- `GET /api/attendance/export-excel` - экспорт в Excel (только для руководителей)
- `GET /api/attendance/current` - текущая активная явка

### Отчеты
- `GET /api/reports/my-reports` - личные отчеты
- `GET /api/reports/all` - все отчеты (только для руководителей)
- `POST /api/reports` - создание отчета
- `PUT /api/reports/:id` - обновление отчета
- `POST /api/reports/:id/submit` - отправка отчета на утверждение
- `PATCH /api/reports/:id/approve` - утверждение/отклонение отчета (только для руководителей)
- `GET /api/reports/export/csv` - экспорт отчетов в CSV

### Резервные копии
- `POST /api/backup/create` - создание резервной копии (только для руководителей)
- `GET /api/backup/list` - список резервных копий (только для руководителей)
- `GET /api/backup/download/:fileName` - скачивание резервной копии (только для руководителей)
- `DELETE /api/backup/:fileName` - удаление резервной копии (только для руководителей)
- `POST /api/backup/restore/:fileName` - восстановление из резервной копии (только для руководителей)

## Безопасность

Система включает следующие меры безопасности:

- ✅ **bcrypt** для хеширования паролей
- ✅ **JWT токены** для аутентификации
- ✅ **Helmet** для защиты заголовков HTTP
- ✅ **Rate Limiting** для защиты от DDoS
- ✅ **Валидация входных данных** с express-validator
- ✅ **CORS** настройки
- ✅ **SQL-инъекции** защита через Sequelize ORM
- ✅ **XSS** защита через Helmet и валидацию
- ✅ **CSRF** защита через сессии

## Развертывание

### Heroku
1. Создайте приложение на Heroku
2. Добавьте PostgreSQL аддон
3. Настройте переменные окружения
4. Задеплойте код

### Docker
```dockerfile
# Dockerfile для продакшн
FROM node:16-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000
CMD ["npm", "start"]
```

## Поддержка

Для получения поддержки или сообщения об ошибках создайте issue в репозитории проекта.

## Лицензия

Этот проект разработан для внутреннего использования организации.
