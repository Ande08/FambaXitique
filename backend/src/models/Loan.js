const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Loan = sequelize.define('Loan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  amountRequested: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  interestRate: {
    type: DataTypes.DECIMAL(5, 2), // ex., 10.00 para 10%
    allowNull: false,
    defaultValue: 10.00
  },
  totalToRepay: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  remainingBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'settled'),
    defaultValue: 'pending'
  },
  disbursementProof: {
    type: DataTypes.STRING,
    allowNull: true // Preenchido quando o administrador aprovar
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

module.exports = Loan;
