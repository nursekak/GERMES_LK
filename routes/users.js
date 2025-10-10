const express = require('express');
const { User } = require('../models');
const { authenticateToken, requireRole, requireOwnershipOrManager } = require('../middleware/auth');
const { validateUserRegistration } = require('../middleware/validation');

const router = express.Router();

// Получение списка всех пользователей (только для руководителей)
router.get('/', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (role) whereClause.role = role;
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      users,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения пользователей:', error);
    res.status(500).json({ message: 'Ошибка при получении списка пользователей' });
  }
});

// Получение информации о конкретном пользователе
router.get('/:userId', authenticateToken, requireOwnershipOrManager, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    res.status(500).json({ message: 'Ошибка при получении данных пользователя' });
  }
});

// Создание нового пользователя (только для руководителей)
router.post('/', authenticateToken, requireRole(['manager']), validateUserRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'employee' } = req.body;

    // Проверяем, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role
    });

    res.status(201).json({
      message: 'Пользователь успешно создан',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    res.status(500).json({ message: 'Ошибка при создании пользователя' });
  }
});

// Обновление пользователя
router.put('/:userId', authenticateToken, requireOwnershipOrManager, async (req, res) => {
  try {
    const { userId } = req.params;
    const { firstName, lastName, email, role, isActive } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем права на изменение роли
    if (role && role !== user.role && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Недостаточно прав для изменения роли' });
    }

    // Проверяем email на уникальность
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
      }
    }

    await user.update({
      firstName,
      lastName,
      email,
      role: req.user.role === 'manager' ? role : user.role,
      isActive: req.user.role === 'manager' ? isActive : user.isActive
    });

    res.json({
      message: 'Пользователь успешно обновлен',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Ошибка обновления пользователя:', error);
    res.status(500).json({ message: 'Ошибка при обновлении пользователя' });
  }
});

// Удаление пользователя (только для руководителей)
router.delete('/:userId', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Нельзя удалить собственный аккаунт' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    await user.destroy();
    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления пользователя:', error);
    res.status(500).json({ message: 'Ошибка при удалении пользователя' });
  }
});

// Активация/деактивация пользователя (только для руководителей)
router.patch('/:userId/toggle-status', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Нельзя изменить статус собственного аккаунта' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    await user.update({ isActive: !user.isActive });

    res.json({
      message: `Пользователь ${user.isActive ? 'активирован' : 'деактивирован'}`,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Ошибка изменения статуса пользователя:', error);
    res.status(500).json({ message: 'Ошибка при изменении статуса пользователя' });
  }
});

module.exports = router;
