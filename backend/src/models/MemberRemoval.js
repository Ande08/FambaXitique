const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MemberRemoval = sequelize.define('MemberRemoval', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  groupId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  requesterId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  targetUserId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  }
});

module.exports = MemberRemoval;
