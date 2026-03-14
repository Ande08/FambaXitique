const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LoanVote = sequelize.define('LoanVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  loanId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  vote: {
    type: DataTypes.ENUM('approve', 'reject'),
    allowNull: false
  }
}, {
  uniqueKeys: {
    unique_vote: {
      fields: ['loanId', 'userId']
    }
  }
});

module.exports = LoanVote;
