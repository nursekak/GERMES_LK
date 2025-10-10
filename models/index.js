const sequelize = require('../config/database');
const User = require('./User');
const Workplace = require('./Workplace');
const Attendance = require('./Attendance');
const Report = require('./Report');

// Определение связей между моделями
User.hasMany(Attendance, { foreignKey: 'userId', as: 'attendance' });
Attendance.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Workplace.hasMany(Attendance, { foreignKey: 'workplaceId', as: 'attendance' });
Attendance.belongsTo(Workplace, { foreignKey: 'workplaceId', as: 'workplace' });

User.hasMany(Report, { foreignKey: 'userId', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Связь для утверждения отчетов
User.hasMany(Report, { foreignKey: 'approvedBy', as: 'approvedReports' });
Report.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

module.exports = {
  sequelize,
  User,
  Workplace,
  Attendance,
  Report
};
