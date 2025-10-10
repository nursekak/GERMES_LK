const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateUserRegistration, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Регистрация пользователя
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'employee' } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    // Создаем нового пользователя
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role
    });

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    res.status(500).json({ message: 'Ошибка при регистрации пользователя' });
  }
});

// Вход в систему
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Находим пользователя
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Аккаунт деактивирован' });
    }

    // Проверяем пароль
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Неверные учетные данные' });
    }

    // Обновляем время последнего входа
    await user.update({ lastLogin: new Date() });

    // Генерируем JWT токен
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Успешный вход в систему',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Ошибка входа:', error);
    res.status(500).json({ message: 'Ошибка при входе в систему' });
  }
});

// Получение информации о текущем пользователе
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.toJSON()
    });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
  }
});

// Обновление профиля
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;
    const userId = req.user.id;

    // Проверяем, не занят ли email другим пользователем
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
      }
    }

    await User.update(
      { firstName, lastName, email },
      { where: { id: userId } }
    );

    const updatedUser = await User.findByPk(userId);
    res.json({
      message: 'Профиль успешно обновлен',
      user: updatedUser.toJSON()
    });
  } catch (error) {
    console.error('Ошибка обновления профиля:', error);
    res.status(500).json({ message: 'Ошибка при обновлении профиля' });
  }
});

// Смена пароля
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Проверяем текущий пароль
    const isValidPassword = await user.validatePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Неверный текущий пароль' });
    }

    // Обновляем пароль
    await user.update({ password: newPassword });

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Ошибка смены пароля:', error);
    res.status(500).json({ message: 'Ошибка при смене пароля' });
  }
});

// Выход из системы (на клиенте просто удаляем токен)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Успешный выход из системы' });
});

module.exports = router;
