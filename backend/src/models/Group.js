const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Group = sequelize.define('Group', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  adminId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'rejected'),
    defaultValue: 'pending'
  },
  contributionAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  contributionFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  paymentMethods: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [
      { type: 'M-Pesa', accountName: '' },
      { type: 'e-Mola', accountName: '' }
    ]
  },
  dueDay: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5, // Default to day 5 of the month
    validate: {
      min: 0,
      max: 31
    }
  },
  loanInterestRate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10.00
  },
  lastInvoicedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Group;
