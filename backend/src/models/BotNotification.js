const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BotNotification = sequelize.define('BotNotification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('OTP_REGISTRATION', 'OTP_RESET', 'PAYMENT_CONFIRMED', 'LOAN_VOTING', 'REMINDER', 'INVOICE_GENERATED', 'LOAN_APPROVED', 'LOAN_PAYMENT_CONFIRMED'),
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'sent', 'failed'),
    defaultValue: 'pending'
  }
});

module.exports = BotNotification;
