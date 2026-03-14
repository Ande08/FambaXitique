const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminPaymentMethod = sequelize.define('AdminPaymentMethod', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.STRING, // e.g., 'M-Pesa', 'E-Mola', 'Bank'
    allowNull: false
  },
  accountName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  accountNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

module.exports = AdminPaymentMethod;
