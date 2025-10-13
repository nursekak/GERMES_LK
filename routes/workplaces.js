const express = require('express');
const { Workplace } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateWorkplace } = require('../middleware/validation');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const router = express.Router();

// Получение списка всех мест работы
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { address: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const { count, rows: workplaces } = await Workplace.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      workplaces,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения мест работы:', error);
    res.status(500).json({ message: 'Ошибка при получении списка мест работы' });
  }
});

// Получение информации о конкретном месте работы
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const workplace = await Workplace.findByPk(id);

    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    res.json({ workplace });
  } catch (error) {
    console.error('Ошибка получения места работы:', error);
    res.status(500).json({ message: 'Ошибка при получении данных места работы' });
  }
});

// Создание нового места работы (только для руководителей)
router.post('/', authenticateToken, requireRole(['manager']), validateWorkplace, async (req, res) => {
  try {
    const { name, address, description } = req.body;

    // Генерируем уникальный QR код
    const qrCode = uuidv4();

    const workplace = await Workplace.create({
      name,
      address,
      description,
      qrCode
    });

    res.status(201).json({
      message: 'Место работы успешно создано',
      workplace
    });
  } catch (error) {
    console.error('Ошибка создания места работы:', error);
    res.status(500).json({ message: 'Ошибка при создании места работы' });
  }
});

// Обновление места работы (только для руководителей)
router.put('/:id', authenticateToken, requireRole(['manager']), validateWorkplace, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, description, isActive } = req.body;

    const workplace = await Workplace.findByPk(id);
    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    await workplace.update({
      name,
      address,
      description,
      isActive
    });

    res.json({
      message: 'Место работы успешно обновлено',
      workplace
    });
  } catch (error) {
    console.error('Ошибка обновления места работы:', error);
    res.status(500).json({ message: 'Ошибка при обновлении места работы' });
  }
});

// Удаление места работы (только для руководителей)
router.delete('/:id', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const workplace = await Workplace.findByPk(id);
    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    await workplace.destroy();
    res.json({ message: 'Место работы успешно удалено' });
  } catch (error) {
    console.error('Ошибка удаления места работы:', error);
    res.status(500).json({ message: 'Ошибка при удалении места работы' });
  }
});

// Активация/деактивация места работы (только для руководителей)
router.patch('/:id/toggle-status', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const workplace = await Workplace.findByPk(id);
    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    await workplace.update({ isActive: !workplace.isActive });

    res.json({
      message: `Место работы ${workplace.isActive ? 'активировано' : 'деактивировано'}`,
      workplace
    });
  } catch (error) {
    console.error('Ошибка изменения статуса места работы:', error);
    res.status(500).json({ message: 'Ошибка при изменении статуса места работы' });
  }
});

// Генерация нового QR кода (только для руководителей)
router.post('/:id/regenerate-qr', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { id } = req.params;

    const workplace = await Workplace.findByPk(id);
    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    const newQrCode = uuidv4();
    await workplace.update({ qrCode: newQrCode });

    res.json({
      message: 'QR код успешно обновлен',
      workplace: {
        ...workplace.toJSON(),
        qrCode: newQrCode
      }
    });
  } catch (error) {
    console.error('Ошибка генерации QR кода:', error);
    res.status(500).json({ message: 'Ошибка при генерации нового QR кода' });
  }
});

module.exports = router;
