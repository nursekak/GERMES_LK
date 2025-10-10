const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  workplaceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'workplaces',
      key: 'id'
    }
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: false
  },
  checkOutTime: {
    type: DataTypes.DATE
  },
  status: {
    type: DataTypes.ENUM('present', 'late', 'absent'),
    allowNull: false,
    defaultValue: 'present'
  },
  notes: {
    type: DataTypes.TEXT
  },
  ipAddress: {
    type: DataTypes.STRING
  },
  userAgent: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'attendance',
  indexes: [
    {
      fields: ['userId', 'checkInTime']
    },
    {
      fields: ['workplaceId', 'checkInTime']
    }
  ]
});

module.exports = Attendance;
