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
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  workplaceId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'workplace_id',
    references: {
      model: 'workplaces',
      key: 'id'
    }
  },
  checkInTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'check_in_time'
  },
  checkOutTime: {
    type: DataTypes.DATE,
    field: 'check_out_time'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'present',
    validate: {
      isIn: [['present', 'late', 'absent', 'sick', 'business_trip', 'vacation', 'no_reason']]
    }
  },
  notes: {
    type: DataTypes.TEXT
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  }
}, {
  tableName: 'attendance'
});

module.exports = Attendance;
