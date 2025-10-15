const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10,        // Увеличиваем максимальное количество соединений
      min: 2,         // Минимальное количество соединений
      acquire: 60000, // Увеличиваем время ожидания получения соединения
      idle: 30000,    // Увеличиваем время простоя перед закрытием соединения
      evict: 1000,    // Интервал проверки неиспользуемых соединений
      handleDisconnects: true // Автоматическое переподключение
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ETIMEDOUT/,
        /ESOCKETTIMEDOUT/,
        /EHOSTUNREACH/,
        /EPIPE/,
        /EAI_AGAIN/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ],
      max: 3 // Максимум 3 попытки переподключения
    },
    define: {
      timestamps: true,
      underscored: true,
      paranoid: true // мягкое удаление
    }
  }
);

// Обработчики событий подключения будут добавлены в server.js

module.exports = sequelize;
