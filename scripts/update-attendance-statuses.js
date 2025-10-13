const sequelize = require('../config/database');

async function updateAttendanceStatuses() {
  try {
    console.log('Обновление статусов посещений...');
    
    // Проверяем текущие статусы в базе данных
    const [results] = await sequelize.query(`
      SELECT DISTINCT status FROM attendance;
    `);
    
    console.log('Текущие статусы в базе данных:', results.map(r => r.status));
    
    // Обновляем статусы, если они не соответствуют новым значениям
    const statusMapping = {
      'absent': 'no_reason' // Если есть старые записи с 'absent', обновляем их на 'no_reason'
    };
    
    for (const [oldStatus, newStatus] of Object.entries(statusMapping)) {
      const [updateResults] = await sequelize.query(`
        UPDATE attendance 
        SET status = :newStatus 
        WHERE status = :oldStatus;
      `, {
        replacements: { oldStatus, newStatus }
      });
      
      if (updateResults > 0) {
        console.log(`Обновлено ${updateResults} записей со статусом '${oldStatus}' на '${newStatus}'`);
      }
    }
    
    console.log('Обновление статусов завершено');
  } catch (error) {
    console.error('Ошибка при обновлении статусов:', error);
    throw error;
  }
}

// Запуск скрипта
if (require.main === module) {
  updateAttendanceStatuses()
    .then(() => {
      console.log('Скрипт выполнен успешно');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Ошибка выполнения скрипта:', error);
      process.exit(1);
    });
}

module.exports = updateAttendanceStatuses;
