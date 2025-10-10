const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Создание резервной копии базы данных
router.post('/create', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.sql`;
    const backupPath = path.join(__dirname, '../backups', backupFileName);

    // Создаем директорию для бэкапов, если её нет
    const backupsDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }

    // Команда для создания бэкапа PostgreSQL
    const pgDumpCommand = `pg_dump -h ${process.env.DB_HOST} -p ${process.env.DB_PORT} -U ${process.env.DB_USER} -d ${process.env.DB_NAME}`;
    
    const backupProcess = spawn('pg_dump', [
      '-h', process.env.DB_HOST,
      '-p', process.env.DB_PORT,
      '-U', process.env.DB_USER,
      '-d', process.env.DB_NAME,
      '-f', backupPath
    ], {
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    backupProcess.on('close', (code) => {
      if (code === 0) {
        res.json({
          message: 'Резервная копия успешно создана',
          fileName: backupFileName,
          path: backupPath,
          size: fs.statSync(backupPath).size
        });
      } else {
        res.status(500).json({ message: 'Ошибка при создании резервной копии' });
      }
    });

    backupProcess.on('error', (error) => {
      console.error('Ошибка процесса бэкапа:', error);
      res.status(500).json({ message: 'Ошибка при создании резервной копии' });
    });

  } catch (error) {
    console.error('Ошибка создания резервной копии:', error);
    res.status(500).json({ message: 'Ошибка при создании резервной копии' });
  }
});

// Получение списка резервных копий
router.get('/list', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../backups');
    
    if (!fs.existsSync(backupsDir)) {
      return res.json({ backups: [] });
    }

    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        return {
          fileName: file,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ backups: files });
  } catch (error) {
    console.error('Ошибка получения списка резервных копий:', error);
    res.status(500).json({ message: 'Ошибка при получении списка резервных копий' });
  }
});

// Скачивание резервной копии
router.get('/download/:fileName', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { fileName } = req.params;
    const backupPath = path.join(__dirname, '../backups', fileName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Резервная копия не найдена' });
    }

    res.download(backupPath, fileName);
  } catch (error) {
    console.error('Ошибка скачивания резервной копии:', error);
    res.status(500).json({ message: 'Ошибка при скачивании резервной копии' });
  }
});

// Удаление резервной копии
router.delete('/:fileName', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { fileName } = req.params;
    const backupPath = path.join(__dirname, '../backups', fileName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Резервная копия не найдена' });
    }

    fs.unlinkSync(backupPath);

    res.json({ message: 'Резервная копия успешно удалена' });
  } catch (error) {
    console.error('Ошибка удаления резервной копии:', error);
    res.status(500).json({ message: 'Ошибка при удалении резервной копии' });
  }
});

// Восстановление из резервной копии
router.post('/restore/:fileName', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { fileName } = req.params;
    const backupPath = path.join(__dirname, '../backups', fileName);

    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ message: 'Резервная копия не найдена' });
    }

    // Команда для восстановления из бэкапа
    const restoreProcess = spawn('psql', [
      '-h', process.env.DB_HOST,
      '-p', process.env.DB_PORT,
      '-U', process.env.DB_USER,
      '-d', process.env.DB_NAME,
      '-f', backupPath
    ], {
      env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    });

    restoreProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ message: 'База данных успешно восстановлена из резервной копии' });
      } else {
        res.status(500).json({ message: 'Ошибка при восстановлении базы данных' });
      }
    });

    restoreProcess.on('error', (error) => {
      console.error('Ошибка процесса восстановления:', error);
      res.status(500).json({ message: 'Ошибка при восстановлении базы данных' });
    });

  } catch (error) {
    console.error('Ошибка восстановления:', error);
    res.status(500).json({ message: 'Ошибка при восстановлении базы данных' });
  }
});

// Автоматическая очистка старых резервных копий
router.post('/cleanup', authenticateToken, requireRole(['manager']), async (req, res) => {
  try {
    const { retentionDays = 30 } = req.body;
    const backupsDir = path.join(__dirname, '../backups');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    if (!fs.existsSync(backupsDir)) {
      return res.json({ message: 'Директория резервных копий не найдена', deletedCount: 0 });
    }

    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.sql'));

    let deletedCount = 0;
    files.forEach(file => {
      const filePath = path.join(backupsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.birthtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    res.json({
      message: `Удалено ${deletedCount} старых резервных копий`,
      deletedCount
    });
  } catch (error) {
    console.error('Ошибка очистки резервных копий:', error);
    res.status(500).json({ message: 'Ошибка при очистке резервных копий' });
  }
});

module.exports = router;
