const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const path = require('path');
require('dotenv').config();

const db = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const workplaceRoutes = require('./routes/workplaces');
const attendanceRoutes = require('./routes/attendance');
const reportRoutes = require('./routes/reports');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 5000;

// Обработчики для необработанных исключений
process.on('uncaughtException', (err) => {
  console.error('Необработанное исключение:', err);
  console.error('Стек вызовов:', err.stack);
  // Не завершаем процесс сразу, даем время на логирование
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Необработанное отклонение Promise:', reason);
  console.error('Promise:', promise);
  // Не завершаем процесс сразу
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Обработчик для graceful shutdown
process.on('SIGTERM', () => {
  console.log('Получен SIGTERM, завершение работы...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Получен SIGINT, завершение работы...');
  process.exit(0);
});

// Настройка лимитов запросов
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP за 15 минут
  message: 'Слишком много запросов с этого IP, попробуйте позже.'
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());
app.use(limiter);

// Middleware для логирования запросов
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logMessage = `${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 400) {
      console.error(`❌ ${logMessage}`);
    } else {
      console.log(`✅ ${logMessage}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
});
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Настройка сессий
app.use(session({
  store: new pgSession({
    conString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 часа
  }
}));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Проверяем подключение к базе данных
    await db.authenticate();
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Маршруты API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workplaces', workplaceRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/backup', backupRoutes);

// Обслуживание статических файлов в продакшене
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Произошла ошибка'
  });
});

// 404 обработчик
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Маршрут не найден' });
});

// Инициализация базы данных и запуск сервера
const startServer = async () => {
  try {
    console.log('🔄 Попытка подключения к базе данных...');
    await db.authenticate();
    console.log('✅ Подключение к базе данных установлено успешно.');
    
    console.log('🔄 Синхронизация моделей с базой данных...');
    await db.sync({ force: false });
    console.log('✅ Модели синхронизированы с базой данных.');
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Сервер запущен на порту ${PORT}`);
      console.log(`📊 Health check доступен по адресу: http://localhost:${PORT}/health`);
      console.log(`🌍 Окружение: ${process.env.NODE_ENV || 'development'}`);
    });

    // Обработчик ошибок сервера
    server.on('error', (err) => {
      console.error('❌ Ошибка сервера:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Порт ${PORT} уже используется. Попробуйте другой порт.`);
      }
    });

  } catch (err) {
    console.error('❌ Критическая ошибка при запуске сервера:', err);
    console.error('📋 Детали ошибки:', {
      message: err.message,
      code: err.code,
      stack: err.stack
    });
    process.exit(1);
  }
};

startServer();

module.exports = app;
