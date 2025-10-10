const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

class BackupManager {
  constructor() {
    this.backupsDir = path.join(__dirname, '../backups');
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
    this.schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *'; // По умолчанию в 2:00 каждый день
  }

  // Создание резервной копии
  async createBackup() {
    try {
      console.log('Начинаем создание резервной копии...');
      
      // Создаем директорию для бэкапов, если её нет
      if (!fs.existsSync(this.backupsDir)) {
        fs.mkdirSync(this.backupsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup_${timestamp}.sql`;
      const backupPath = path.join(this.backupsDir, backupFileName);

      return new Promise((resolve, reject) => {
        const backupProcess = spawn('pg_dump', [
          '-h', process.env.DB_HOST,
          '-p', process.env.DB_PORT,
          '-U', process.env.DB_USER,
          '-d', process.env.DB_NAME,
          '-f', backupPath,
          '--verbose'
        ], {
          env: { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
        });

        let stdout = '';
        let stderr = '';

        backupProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        backupProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        backupProcess.on('close', (code) => {
          if (code === 0) {
            const stats = fs.statSync(backupPath);
            console.log(`Резервная копия успешно создана: ${backupFileName} (${this.formatBytes(stats.size)})`);
            resolve({
              fileName: backupFileName,
              path: backupPath,
              size: stats.size
            });
          } else {
            console.error('Ошибка при создании резервной копии:', stderr);
            reject(new Error(`pg_dump завершился с кодом ${code}: ${stderr}`));
          }
        });

        backupProcess.on('error', (error) => {
          console.error('Ошибка процесса бэкапа:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Ошибка создания резервной копии:', error);
      throw error;
    }
  }

  // Очистка старых резервных копий
  async cleanupOldBackups() {
    try {
      console.log('Начинаем очистку старых резервных копий...');
      
      if (!fs.existsSync(this.backupsDir)) {
        console.log('Директория резервных копий не найдена');
        return { deletedCount: 0 };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const files = fs.readdirSync(this.backupsDir)
        .filter(file => file.endsWith('.sql'));

      let deletedCount = 0;
      let totalSize = 0;

      files.forEach(file => {
        const filePath = path.join(this.backupsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.birthtime < cutoffDate) {
          const fileSize = stats.size;
          fs.unlinkSync(filePath);
          deletedCount++;
          totalSize += fileSize;
          console.log(`Удален файл: ${file} (${this.formatBytes(fileSize)})`);
        }
      });

      console.log(`Очистка завершена. Удалено ${deletedCount} файлов, освобождено ${this.formatBytes(totalSize)}`);
      return { deletedCount, totalSize };
    } catch (error) {
      console.error('Ошибка очистки резервных копий:', error);
      throw error;
    }
  }

  // Запуск автоматического резервного копирования
  startScheduledBackups() {
    console.log(`Настройка автоматического резервного копирования по расписанию: ${this.schedule}`);
    
    cron.schedule(this.schedule, async () => {
      try {
        console.log('Выполняется запланированное резервное копирование...');
        await this.createBackup();
        await this.cleanupOldBackups();
        console.log('Запланированное резервное копирование завершено');
      } catch (error) {
        console.error('Ошибка при запланированном резервном копировании:', error);
      }
    });

    console.log('Автоматическое резервное копирование настроено');
  }

  // Получение информации о резервных копиях
  getBackupInfo() {
    try {
      if (!fs.existsSync(this.backupsDir)) {
        return { backups: [], totalSize: 0 };
      }

      const files = fs.readdirSync(this.backupsDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const filePath = path.join(this.backupsDir, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          };
        })
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        backups: files,
        totalSize,
        count: files.length
      };
    } catch (error) {
      console.error('Ошибка получения информации о резервных копиях:', error);
      return { backups: [], totalSize: 0, count: 0 };
    }
  }

  // Форматирование размера файла
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Если скрипт запущен напрямую
if (require.main === module) {
  const backupManager = new BackupManager();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'create':
      backupManager.createBackup()
        .then(result => {
          console.log('Резервная копия создана:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Ошибка:', error);
          process.exit(1);
        });
      break;
      
    case 'cleanup':
      backupManager.cleanupOldBackups()
        .then(result => {
          console.log('Очистка завершена:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('Ошибка:', error);
          process.exit(1);
        });
      break;
      
    case 'info':
      const info = backupManager.getBackupInfo();
      console.log('Информация о резервных копиях:');
      console.log(`Всего файлов: ${info.count}`);
      console.log(`Общий размер: ${backupManager.formatBytes(info.totalSize)}`);
      console.log('Файлы:');
      info.backups.forEach(backup => {
        console.log(`  ${backup.fileName} - ${backupManager.formatBytes(backup.size)} (${backup.createdAt.toLocaleString()})`);
      });
      break;
      
    case 'schedule':
      backupManager.startScheduledBackups();
      // Держим процесс живым
      process.on('SIGINT', () => {
        console.log('Остановка автоматического резервного копирования...');
        process.exit(0);
      });
      break;
      
    default:
      console.log('Использование: node backup.js [create|cleanup|info|schedule]');
      console.log('  create   - создать резервную копию');
      console.log('  cleanup  - очистить старые резервные копии');
      console.log('  info     - показать информацию о резервных копиях');
      console.log('  schedule - запустить автоматическое резервное копирование');
      process.exit(1);
  }
}

module.exports = BackupManager;
