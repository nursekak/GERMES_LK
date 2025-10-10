const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Workplace = sequelize.define('Workplace', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [1, 100]
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  qrCode: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'qr_code'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  description: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'workplaces'
});

module.exports = Workplace;
