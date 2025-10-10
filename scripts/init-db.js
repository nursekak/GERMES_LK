const { sequelize, User, Workplace, Attendance, Report } = require('../models');
const bcrypt = require('bcryptjs');

async function initializeDatabase() {
  try {
    console.log('Инициализация базы данных...');
    
    // Синхронизация моделей с базой данных
    await sequelize.sync({ force: false });
    console.log('Модели синхронизированы с базой данных');

    // Создание администратора по умолчанию
    const adminExists = await User.findOne({ where: { email: 'admin@germes.ru' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await User.create({
        email: 'admin@germes.ru',
        password: hashedPassword,
        firstName: 'Администратор',
        lastName: 'Системы',
        role: 'manager',
        isActive: true
      });
      console.log('Создан администратор по умолчанию: admin@germes.ru / admin123');
    }

    // Создание тестового сотрудника
    const employeeExists = await User.findOne({ where: { email: 'employee@germes.ru' } });
    if (!employeeExists) {
      const hashedPassword = await bcrypt.hash('employee123', 12);
      await User.create({
        email: 'employee@germes.ru',
        password: hashedPassword,
        firstName: 'Иван',
        lastName: 'Петров',
        role: 'employee',
        isActive: true
      });
      console.log('Создан тестовый сотрудник: employee@germes.ru / employee123');
    }

    // Создание тестового места работы
    const workplaceExists = await Workplace.findOne({ where: { name: 'Главный офис' } });
    if (!workplaceExists) {
      const { v4: uuidv4 } = require('uuid');
      await Workplace.create({
        name: 'Главный офис',
        address: 'г. Москва, ул. Примерная, д. 1',
        description: 'Основное место работы',
        qrCode: uuidv4(),
        isActive: true
      });
      console.log('Создано тестовое место работы: Главный офис');
    }

    console.log('Инициализация базы данных завершена успешно');
    console.log('\nДоступные учетные записи:');
    console.log('Администратор: admin@germes.ru / admin123');
    console.log('Сотрудник: employee@germes.ru / employee123');
    
  } catch (error) {
    console.error('Ошибка инициализации базы данных:', error);
    process.exit(1);
  }
}

// Запуск инициализации, если скрипт вызван напрямую
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Скрипт инициализации завершен');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка:', error);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
