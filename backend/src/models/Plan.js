const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Plan = sequelize.define('Plan', {
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
  monthlyPrice: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  groupLimit: {
    type: DataTypes.INTEGER,
    defaultValue: 1 // -1 for unlimited
  },
  botEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

module.exports = Plan;
