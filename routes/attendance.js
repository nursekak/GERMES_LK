const express = require('express');
const QRCode = require('qrcode');
const { Attendance, Workplace, User } = require('../models');
const { authenticateToken, requireRole, requireOwnershipOrManager } = require('../middleware/auth');
const { validateManualCheckIn, validateManualCheckOut } = require('../middleware/validation');
const { Op } = require('sequelize');
const XLSX = require('xlsx');

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

    console.log('All-stats request params:', { startDate, endDate, workplaceId, userId });

    const whereClause = {};
    
    // Временно убираем фильтр по датам для тестирования
    // if (startDate && endDate) {
    //   whereClause.checkInTime = {
    //     [Op.between]: [new Date(startDate), new Date(endDate)]
    //   };
    // }
    
    if (workplaceId) {
      whereClause.workplaceId = workplaceId;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    console.log('Where clause:', whereClause);

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user' },
        { model: Workplace, as: 'workplace' }
      ],
      order: [['checkInTime', 'DESC']]
    });

    console.log('Found attendance records:', attendance.length);

    // Если нет записей, проверим, есть ли вообще записи в базе
    if (attendance.length === 0) {
      const totalRecords = await Attendance.count();
      console.log('Total attendance records in database:', totalRecords);
      
      // Попробуем найти записи без фильтров
      const allRecords = await Attendance.findAll({
        include: [
          { model: User, as: 'user' },
          { model: Workplace, as: 'workplace' }
        ],
        order: [['checkInTime', 'DESC']],
        limit: 5
      });
      console.log('Sample records without filters:', allRecords.length);
    }

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

    const result = {
      userStats: Object.values(userStats),
      attendance: attendance, // Добавляем массив посещений для таблицы
      totalRecords: attendance.length
    };
    
    console.log('API response structure:', {
      userStatsCount: result.userStats.length,
      attendanceCount: result.attendance.length,
      totalRecords: result.totalRecords
    });
    
    console.log('First userStat:', result.userStats[0]);
    console.log('First attendance record:', result.attendance[0]);
    
    res.json(result);
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

// Ручная отметка присутствия (только для руководителей)
router.post('/manual-check-in', authenticateToken, requireRole(['manager']), validateManualCheckIn, async (req, res) => {
  try {
    const { userId, workplaceId, checkInTime, notes } = req.body;
    const now = new Date();
    const checkIn = checkInTime ? new Date(checkInTime) : now;

    // Проверяем, что пользователь существует
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Проверяем, что место работы существует
    const workplace = await Workplace.findByPk(workplaceId);
    if (!workplace) {
      return res.status(404).json({ message: 'Место работы не найдено' });
    }

    // Проверяем, не зарегистрирована ли уже явка сегодня
    const todayStart = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const existingAttendance = await Attendance.findOne({
      where: {
        userId,
        workplaceId,
        checkInTime: {
          [Op.between]: [todayStart, todayEnd]
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Явка на это место работы уже зарегистрирована сегодня' });
    }

    // Определяем статус (опоздание, если после 9:00)
    const workStartTime = new Date(checkIn);
    workStartTime.setHours(9, 0, 0, 0);
    const status = checkIn > workStartTime ? 'late' : 'present';

    // Создаем запись о явке
    const attendance = await Attendance.create({
      userId,
      workplaceId,
      checkInTime: checkIn,
      status,
      notes: notes || 'Отмечено администратором',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Загружаем связанные данные для ответа
    await attendance.reload({
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Workplace, as: 'workplace', attributes: ['id', 'name', 'address'] }
      ]
    });

    res.status(201).json({
      message: 'Присутствие отмечено администратором',
      attendance: attendance.toJSON()
    });
  } catch (error) {
    console.error('Ошибка ручной отметки присутствия:', error);
    res.status(500).json({ message: 'Ошибка при отметке присутствия' });
  }
});

// Ручная отметка ухода (только для руководителей)
router.post('/manual-check-out', authenticateToken, requireRole(['manager']), validateManualCheckOut, async (req, res) => {
  try {
    const { userId, checkOutTime, notes } = req.body;
    const now = new Date();
    const checkOut = checkOutTime ? new Date(checkOutTime) : now;

    // Находим активную явку пользователя
    const attendance = await Attendance.findOne({
      where: {
        userId,
        checkOutTime: null
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
        { model: Workplace, as: 'workplace', attributes: ['id', 'name'] }
      ],
      order: [['checkInTime', 'DESC']]
    });

    if (!attendance) {
      return res.status(404).json({ message: 'Активная явка не найдена' });
    }

    // Обновляем время ухода
    await attendance.update({
      checkOutTime: checkOut,
      notes: attendance.notes ? 
        `${attendance.notes}\nУход отмечен администратором: ${notes || ''}`.trim() :
        `Уход отмечен администратором: ${notes || ''}`.trim()
    });

    res.json({
      message: 'Уход отмечен администратором',
      attendance: attendance.toJSON()
    });
  } catch (error) {
    console.error('Ошибка ручной отметки ухода:', error);
    res.status(500).json({ message: 'Ошибка при отметке ухода' });
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

// Получение полной статистики за период для всех сотрудников
router.get('/full-stats-30-days', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    let endDate = new Date();
    let startDate = new Date();
    
    // Если переданы параметры дат, используем их
    if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate);
      endDate = new Date(req.query.endDate);
    } else {
      // По умолчанию - последние 30 дней
      startDate.setDate(startDate.getDate() - 30);
    }

    // Получаем всех сотрудников
    const users = await User.findAll({
      where: { role: 'employee' },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    // Получаем все записи посещений за период
    const attendanceRecords = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [
        { model: User, as: 'user' },
        { model: Workplace, as: 'workplace' }
      ],
      order: [['checkInTime', 'ASC']]
    });

    // Создаем карту посещений по пользователям и датам
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      const userId = record.userId;
      const date = record.checkInTime.toISOString().split('T')[0];
      
      if (!attendanceMap[userId]) {
        attendanceMap[userId] = {};
      }
      
      attendanceMap[userId][date] = {
        status: record.status,
        checkInTime: record.checkInTime,
        checkOutTime: record.checkOutTime,
        notes: record.notes,
        workplace: record.workplace
      };
    });

    // Генерируем данные для каждого дня
    const result = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      const dayData = {
        date: dateStr,
        isWeekend: isWeekend,
        employees: []
      };

      users.forEach(user => {
        const userAttendance = attendanceMap[user.id]?.[dateStr];
        
        if (userAttendance) {
          // Есть запись о посещении
          dayData.employees.push({
            userId: user.id,
            user: user,
            status: userAttendance.status,
            checkInTime: userAttendance.checkInTime,
            checkOutTime: userAttendance.checkOutTime,
            notes: userAttendance.notes,
            workplace: userAttendance.workplace
          });
        } else if (!isWeekend) {
          // Нет записи и это не выходной - отсутствие
          dayData.employees.push({
            userId: user.id,
            user: user,
            status: 'absent',
            checkInTime: null,
            checkOutTime: null,
            notes: null,
            workplace: null
          });
        }
      });

      result.push(dayData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days: result,
      users: users
    });
  } catch (error) {
    console.error('Ошибка получения полной статистики:', error);
    res.status(500).json({ message: 'Ошибка при получении полной статистики' });
  }
});

// Обновление причины отсутствия
router.put('/update-absence-reason', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { userId, date, reason, notes } = req.body;
    
    if (!userId || !date || !reason) {
      return res.status(400).json({ message: 'Необходимо указать userId, date и reason' });
    }

    const validReasons = ['sick', 'business_trip', 'vacation', 'no_reason'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({ message: 'Недопустимая причина отсутствия' });
    }

    // Находим или создаем запись о посещении
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    let attendance = await Attendance.findOne({
      where: {
        userId: userId,
        checkInTime: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      }
    });

    if (attendance) {
      // Обновляем существующую запись
      attendance.status = reason;
      attendance.notes = notes;
      await attendance.save();
    } else {
      // Создаем новую запись об отсутствии
      attendance = await Attendance.create({
        userId: userId,
        workplaceId: null, // Для отсутствий workplace может быть null
        checkInTime: startOfDay,
        checkOutTime: null,
        status: reason,
        notes: notes
      });
    }

    res.json({ message: 'Причина отсутствия обновлена', attendance });
  } catch (error) {
    console.error('Ошибка обновления причины отсутствия:', error);
    res.status(500).json({ message: 'Ошибка при обновлении причины отсутствия' });
  }
});

// Экспорт в Excel
router.get('/export-excel', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Получаем данные
    const users = await User.findAll({
      where: { role: 'employee' },
      order: [['lastName', 'ASC'], ['firstName', 'ASC']]
    });

    const attendanceRecords = await Attendance.findAll({
      where: {
        checkInTime: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [
        { model: User, as: 'user' },
        { model: Workplace, as: 'workplace' }
      ],
      order: [['checkInTime', 'ASC']]
    });

    // Создаем карту посещений
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      const userId = record.userId;
      const date = record.checkInTime.toISOString().split('T')[0];
      
      if (!attendanceMap[userId]) {
        attendanceMap[userId] = {};
      }
      
      attendanceMap[userId][date] = record;
    });

    // Подготавливаем данные для Excel
    const excelData = [];
    
    // Заголовки
    excelData.push([
      'Дата',
      'Сотрудник',
      'Статус',
      'Время прихода',
      'Время ухода',
      'Место работы',
      'Примечания'
    ]);

    // Генерируем данные для каждого дня
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      
      users.forEach(user => {
        const userAttendance = attendanceMap[user.id]?.[dateStr];
        
        if (userAttendance) {
          // Есть запись о посещении
          const statusText = {
            'present': 'Присутствовал',
            'late': 'Опоздал',
            'absent': 'Отсутствовал',
            'sick': 'Болезнь',
            'business_trip': 'Командировка',
            'vacation': 'Отпуск',
            'no_reason': 'Без причины'
          }[userAttendance.status] || userAttendance.status;

          excelData.push([
            dateStr,
            `${user.lastName} ${user.firstName}`,
            statusText,
            userAttendance.checkInTime ? userAttendance.checkInTime.toLocaleString('ru-RU') : '',
            userAttendance.checkOutTime ? userAttendance.checkOutTime.toLocaleString('ru-RU') : '',
            userAttendance.workplace ? userAttendance.workplace.name : '',
            userAttendance.notes || ''
          ]);
        } else if (!isWeekend) {
          // Нет записи и это не выходной - отсутствие
          excelData.push([
            dateStr,
            `${user.lastName} ${user.firstName}`,
            'Отсутствовал',
            '',
            '',
            '',
            ''
          ]);
        }
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Создаем Excel файл
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Посещения');

    // Настраиваем ширину столбцов
    const colWidths = [
      { wch: 12 }, // Дата
      { wch: 20 }, // Сотрудник
      { wch: 15 }, // Статус
      { wch: 20 }, // Время прихода
      { wch: 20 }, // Время ухода
      { wch: 25 }, // Место работы
      { wch: 30 }  // Примечания
    ];
    ws['!cols'] = colWidths;

    // Генерируем файл
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Отправляем файл
    const filename = `Посещения_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Ошибка экспорта в Excel:', error);
    res.status(500).json({ message: 'Ошибка при экспорте в Excel' });
  }
});

module.exports = router;
