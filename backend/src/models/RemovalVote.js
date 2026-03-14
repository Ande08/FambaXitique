const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RemovalVote = sequelize.define('RemovalVote', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  removalId: {
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
    unique_removal_vote: {
      fields: ['removalId', 'userId']
    }
  }
});

module.exports = RemovalVote;
