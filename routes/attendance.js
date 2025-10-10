const express = require('express');
const QRCode = require('qrcode');
const { Attendance, Workplace, User } = require('../models');
const { authenticateToken, requireRole, requireOwnershipOrManager } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Регистрация явки по QR коду
router.post('/check-in', authenticateToken, async (req, res) => {
  try {
    const { qrCode } = req.body;
    const userId = req.user.id;
    const now = new Date();

    // Находим место работы по QR коду
    const workplace = await Workplace.findOne({ 
      where: { qrCode, isActive: true } 
    });

    if (!workplace) {
      return res.status(400).json({ message: 'Недействительный QR код или место работы неактивно' });
    }

    // Проверяем, не зарегистрирована ли уже явка сегодня
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const existingAttendance = await Attendance.findOne({
      where: {
        userId,
        workplaceId: workplace.id,
        checkInTime: {
          [Op.between]: [todayStart, todayEnd]
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Явка на это место работы уже зарегистрирована сегодня' });
    }

    // Определяем статус (опоздание, если после 9:00)
    const workStartTime = new Date(now);
    workStartTime.setHours(9, 0, 0, 0);
    const status = now > workStartTime ? 'late' : 'present';

    // Создаем запись о явке
    const attendance = await Attendance.create({
      userId,
      workplaceId: workplace.id,
      checkInTime: now,
      status,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      message: 'Явка успешно зарегистрирована',
      attendance: {
        ...attendance.toJSON(),
        workplace: workplace.toJSON()
      }
    });
  } catch (error) {
    console.error('Ошибка регистрации явки:', error);
    res.status(500).json({ message: 'Ошибка при регистрации явки' });
  }
});

// Регистрация ухода с работы
router.post('/check-out', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Находим сегодняшнюю явку без отметки об уходе
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const attendance = await Attendance.findOne({
      where: {
        userId,
        checkInTime: {
          [Op.between]: [todayStart, todayEnd]
        },
        checkOutTime: null
      },
      include: [{ model: Workplace, as: 'workplace' }]
    });

    if (!attendance) {
      return res.status(400).json({ message: 'Не найдена активная явка для отметки об уходе' });
    }

    await attendance.update({ checkOutTime: now });

    res.json({
      message: 'Уход с работы успешно зарегистрирован',
      attendance: attendance.toJSON()
    });
  } catch (error) {
    console.error('Ошибка регистрации ухода:', error);
    res.status(500).json({ message: 'Ошибка при регистрации ухода' });
  }
});

// Получение статистики посещений пользователя
router.get('/my-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, workplaceId } = req.query;

    const whereClause = { userId };
    
    if (startDate && endDate) {
      whereClause.checkInTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (workplaceId) {
      whereClause.workplaceId = workplaceId;
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [{ model: Workplace, as: 'workplace' }],
      order: [['checkInTime', 'DESC']]
    });

    // Подсчет статистики
    const stats = {
      totalDays: attendance.length,
      presentDays: attendance.filter(a => a.status === 'present').length,
      lateDays: attendance.filter(a => a.status === 'late').length,
      averageHours: 0
    };

    // Подсчет среднего количества часов
    const completedDays = attendance.filter(a => a.checkOutTime);
    if (completedDays.length > 0) {
      const totalHours = completedDays.reduce((sum, a) => {
        const hours = (new Date(a.checkOutTime) - new Date(a.checkInTime)) / (1000 * 60 * 60);
        return sum + hours;
      }, 0);
      stats.averageHours = totalHours / completedDays.length;
    }

    res.json({
      stats,
      attendance
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ message: 'Ошибка при получении статистики' });
  }
});

// Получение статистики всех сотрудников (только для руководителей)
router.get('/all-stats', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { startDate, endDate, workplaceId, userId } = req.query;

    const whereClause = {};
    
    if (startDate && endDate) {
      whereClause.checkInTime = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (workplaceId) {
      whereClause.workplaceId = workplaceId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user' },
        { model: Workplace, as: 'workplace' }
      ],
      order: [['checkInTime', 'DESC']]
    });

    // Группировка по пользователям
    const userStats = {};
    attendance.forEach(record => {
      const userId = record.userId;
      if (!userStats[userId]) {
        userStats[userId] = {
          user: record.user,
          totalDays: 0,
          presentDays: 0,
          lateDays: 0,
          records: []
        };
      }
      
      userStats[userId].totalDays++;
      if (record.status === 'present') userStats[userId].presentDays++;
      if (record.status === 'late') userStats[userId].lateDays++;
      userStats[userId].records.push(record);
    });

    res.json({
      userStats: Object.values(userStats),
      totalRecords: attendance.length
    });
  } catch (error) {
    console.error('Ошибка получения общей статистики:', error);
    res.status(500).json({ message: 'Ошибка при получении общей статистики' });
  }
});

// Генерация QR кода для места работы
router.get('/qr/:workplaceId', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { workplaceId } = req.params;
    
    const workplace = await Workplace.findByPk(workplaceId);
    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    // Генерируем QR код
    const qrCodeDataURL = await QRCode.toDataURL(workplace.qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      qrCode: qrCodeDataURL,
      workplace: workplace.toJSON()
    });
  } catch (error) {
    console.error('Ошибка генерации QR кода:', error);
    res.status(500).json({ message: 'Ошибка при генерации QR кода' });
  }
});

// Получение текущей активной явки пользователя
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const attendance = await Attendance.findOne({
      where: {
        userId,
        checkInTime: {
          [Op.gte]: todayStart
        },
        checkOutTime: null
      },
      include: [{ model: Workplace, as: 'workplace' }]
    });

    if (!attendance) {
      return res.json({ attendance: null });
    }

    res.json({ attendance: attendance.toJSON() });
  } catch (error) {
    console.error('Ошибка получения текущей явки:', error);
    res.status(500).json({ message: 'Ошибка при получении текущей явки' });
  }
});

module.exports = router;
