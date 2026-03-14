const User = require('./User');
const Group = require('./Group');
const Membership = require('./Membership');
const Payment = require('./Payment');
const ValidationCode = require('./ValidationCode');
const Invoice = require('./Invoice');
const Loan = require('./Loan');
const LoanVote = require('./LoanVote');
const BotNotification = require('./BotNotification');

// Relationships
User.belongsToMany(Group, { through: Membership, as: 'Groups' });
Group.belongsToMany(User, { through: Membership, as: 'Members' });

User.hasMany(Payment, { as: 'Payments', foreignKey: 'userId' });
Payment.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Group.hasMany(Payment, { as: 'Payments', foreignKey: 'groupId' });
Payment.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });

// Invoice associations
User.hasMany(Invoice, { as: 'Invoices', foreignKey: 'userId' });
Invoice.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Group.hasMany(Invoice, { as: 'Invoices', foreignKey: 'groupId' });
Invoice.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });

Payment.belongsTo(Invoice, { as: 'Invoice', foreignKey: 'invoiceId' });
Invoice.hasMany(Payment, { as: 'Payments', foreignKey: 'invoiceId' });

Payment.belongsTo(Loan, { as: 'Loan', foreignKey: 'loanId' });
Loan.hasMany(Payment, { as: 'Payments', foreignKey: 'loanId' });

User.hasMany(Loan, { as: 'Loans', foreignKey: 'userId' });
Loan.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Group.hasMany(Loan, { as: 'Loans', foreignKey: 'groupId' });
Loan.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });

// Loan Voting associations
Loan.hasMany(LoanVote, { as: 'Votes', foreignKey: 'loanId' });
LoanVote.belongsTo(Loan, { as: 'Loan', foreignKey: 'loanId' });

User.hasMany(LoanVote, { as: 'LoanVotes', foreignKey: 'userId' });
LoanVote.belongsTo(User, { as: 'User', foreignKey: 'userId' });

// Bot Notifications
User.hasMany(BotNotification, { as: 'Notifications', foreignKey: 'userId' });
BotNotification.belongsTo(User, { as: 'User', foreignKey: 'userId' });

// Validation Codes
User.hasMany(ValidationCode, { as: 'ValidationCodes', foreignKey: 'userId' });
ValidationCode.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Group.hasMany(ValidationCode, { as: 'ValidationCodes', foreignKey: 'groupId' });
ValidationCode.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });

module.exports = {
  User,
  Group,
  Membership,
  Payment,
  ValidationCode,
  Invoice,
  Loan,
  LoanVote,
  BotNotification
};
