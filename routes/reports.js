const express = require('express');
const { Report, User } = require('../models');
const { authenticateToken, requireRole, requireOwnershipOrManager } = require('../middleware/auth');
const { validateReport } = require('../middleware/validation');
const { Op } = require('sequelize');

const router = express.Router();

// Получение отчетов пользователя
router.get('/my-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { userId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (startDate && endDate) {
      whereClause.reportDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: reports } = await Report.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['reportDate', 'DESC']]
    });

    res.json({
      reports,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения отчетов:', error);
    res.status(500).json({ message: 'Ошибка при получении отчетов' });
  }
});

// Получение всех отчетов (только для руководителей)
router.get('/all', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (userId) {
      whereClause.userId = userId;
    }
    
    if (startDate && endDate) {
      whereClause.reportDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: reports } = await Report.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['reportDate', 'DESC']]
    });

    res.json({
      reports,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка получения всех отчетов:', error);
    res.status(500).json({ message: 'Ошибка при получении всех отчетов' });
  }
});

// Получение конкретного отчета
router.get('/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const report = await Report.findByPk(reportId, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'approver', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }

    // Проверяем права доступа
    if (report.userId !== userId && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    res.json({ report });
  } catch (error) {
    console.error('Ошибка получения отчета:', error);
    res.status(500).json({ message: 'Ошибка при получении отчета' });
  }
});

// Создание нового отчета
router.post('/', authenticateToken, validateReport, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, reportDate } = req.body;

    const report = await Report.create({
      userId,
      title,
      content,
      reportDate: new Date(reportDate),
      status: 'draft'
    });

    res.status(201).json({
      message: 'Отчет успешно создан',
      report
    });
  } catch (error) {
    console.error('Ошибка создания отчета:', error);
    res.status(500).json({ message: 'Ошибка при создании отчета' });
  }
});

// Обновление отчета
router.put('/:reportId', authenticateToken, validateReport, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;
    const { title, content, reportDate } = req.body;

    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }

    // Проверяем права доступа
    if (report.userId !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Нельзя редактировать утвержденные или отклоненные отчеты
    if (report.status === 'approved' || report.status === 'rejected') {
      return res.status(400).json({ message: 'Нельзя редактировать утвержденный или отклоненный отчет' });
    }

    await report.update({
      title,
      content,
      reportDate: new Date(reportDate)
    });

    res.json({
      message: 'Отчет успешно обновлен',
      report
    });
  } catch (error) {
    console.error('Ошибка обновления отчета:', error);
    res.status(500).json({ message: 'Ошибка при обновлении отчета' });
  }
});

// Отправка отчета на утверждение
router.post('/:reportId/submit', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }

    if (report.userId !== userId) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    if (report.status !== 'draft') {
      return res.status(400).json({ message: 'Отчет уже отправлен на утверждение' });
    }

    await report.update({ status: 'submitted' });

    res.json({
      message: 'Отчет отправлен на утверждение',
      report
    });
  } catch (error) {
    console.error('Ошибка отправки отчета:', error);
    res.status(500).json({ message: 'Ошибка при отправке отчета' });
  }
});

// Утверждение/отклонение отчета (только для руководителей)
router.patch('/:reportId/approve', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, comments } = req.body; // status: 'approved' или 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Некорректный статус' });
    }

    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }

    if (report.status !== 'submitted') {
      return res.status(400).json({ message: 'Отчет не отправлен на утверждение' });
    }

    await report.update({
      status,
      approvedBy: req.user.id,
      approvedAt: new Date(),
      comments
    });

    res.json({
      message: `Отчет ${status === 'approved' ? 'утвержден' : 'отклонен'}`,
      report
    });
  } catch (error) {
    console.error('Ошибка утверждения отчета:', error);
    res.status(500).json({ message: 'Ошибка при утверждении отчета' });
  }
});

// Удаление отчета
router.delete('/:reportId', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const userId = req.user.id;

    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }

    // Проверяем права доступа
    if (report.userId !== userId && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }

    // Нельзя удалять утвержденные отчеты
    if (report.status === 'approved') {
      return res.status(400).json({ message: 'Нельзя удалить утвержденный отчет' });
    }

    await report.destroy();

    res.json({ message: 'Отчет успешно удален' });
  } catch (error) {
    console.error('Ошибка удаления отчета:', error);
    res.status(500).json({ message: 'Ошибка при удалении отчета' });
  }
});

// Добавление комментария к отчету
router.patch('/:reportId/comment', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.params;
    const { comment } = req.body;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({ message: 'Комментарий не может быть пустым' });
    }

    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }

    // Проверяем права доступа: только автор отчета или менеджер
    if (report.userId !== req.user.id && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Нет прав для добавления комментария к этому отчету' });
    }

    // Добавляем комментарий к существующим комментариям
    const existingComments = report.comments || '';
    const newComment = `[${new Date().toLocaleString('ru-RU')}] ${req.user.firstName} ${req.user.lastName}: ${comment}`;
    const updatedComments = existingComments ? `${existingComments}\n\n${newComment}` : newComment;

    await report.update({
      comments: updatedComments
    });

    res.json({
      message: 'Комментарий добавлен',
      report
    });
  } catch (error) {
    console.error('Ошибка добавления комментария:', error);
    res.status(500).json({ message: 'Ошибка при добавлении комментария' });
  }
});

// Экспорт отчетов в CSV
router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    const currentUserId = req.user.id;

    // Определяем, чьи отчеты экспортировать
    const targetUserId = req.user.role === 'manager' ? userId : currentUserId;
    
    if (!targetUserId) {
      return res.status(400).json({ message: 'Не указан пользователь для экспорта' });
    }

    const whereClause = { userId: targetUserId };
    
    if (startDate && endDate) {
      whereClause.reportDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const reports = await Report.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
        { model: User, as: 'approver', attributes: ['firstName', 'lastName'] }
      ],
      order: [['reportDate', 'DESC']]
    });

    // Формируем CSV
    const csvHeader = 'Дата,Автор,Заголовок,Статус,Утвердил,Дата утверждения,Комментарии\n';
    const csvRows = reports.map(report => {
      const author = `${report.user.firstName} ${report.user.lastName}`;
      const approver = report.approver ? `${report.approver.firstName} ${report.approver.lastName}` : '';
      const approvedAt = report.approvedAt ? new Date(report.approvedAt).toLocaleDateString('ru-RU') : '';
      
      return [
        new Date(report.reportDate).toLocaleDateString('ru-RU'),
        author,
        `"${report.title}"`,
        report.status,
        approver,
        approvedAt,
        `"${report.comments || ''}"`
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=reports.csv');
    res.send('\ufeff' + csv); // BOM для корректного отображения кириллицы в Excel
  } catch (error) {
    console.error('Ошибка экспорта отчетов:', error);
    res.status(500).json({ message: 'Ошибка при экспорте отчетов' });
  }
});

module.exports = router;
