const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Membership = sequelize.define('Membership', {
  role: {
    type: DataTypes.ENUM('ADMIN', 'MEMBER'),
    defaultValue: 'MEMBER'
  }
});

module.exports = Membership;
