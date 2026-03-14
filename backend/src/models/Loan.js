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
    type: DataTypes.DECIMAL(5, 2), // e.g., 10.00 for 10%
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
    allowNull: true // Filled when admin approves
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
