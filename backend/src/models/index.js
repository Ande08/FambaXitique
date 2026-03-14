const User = require('./User');
const Group = require('./Group');
const Membership = require('./Membership');
const Payment = require('./Payment');
const ValidationCode = require('./ValidationCode');
const Invoice = require('./Invoice');
const Loan = require('./Loan');
const LoanVote = require('./LoanVote');
const BotNotification = require('./BotNotification');
const Plan = require('./Plan');
const Subscription = require('./Subscription');
const AdminPaymentMethod = require('./AdminPaymentMethod');
const SubscriptionPayment = require('./SubscriptionPayment');
const MemberRemoval = require('./MemberRemoval');
const RemovalVote = require('./RemovalVote');

// Relationships
User.belongsToMany(Group, { through: Membership, as: 'Groups' });
Group.belongsToMany(User, { through: Membership, as: 'Members' });

// Group Creator association
Group.belongsTo(User, { as: 'Creator', foreignKey: 'adminId' });
User.hasMany(Group, { as: 'CreatedGroups', foreignKey: 'adminId' });

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

Group.hasMany(BotNotification, { as: 'Notifications', foreignKey: 'groupId' });
BotNotification.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });

// Validation Codes
User.hasMany(ValidationCode, { as: 'ValidationCodes', foreignKey: 'userId' });
ValidationCode.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Group.hasMany(ValidationCode, { as: 'ValidationCodes', foreignKey: 'groupId' });
ValidationCode.belongsTo(Group, { as: 'Group', foreignKey: 'groupId' });

// Subscriptions
User.hasMany(Subscription, { as: 'Subscriptions', foreignKey: 'userId' });
Subscription.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Plan.hasMany(Subscription, { as: 'Subscriptions', foreignKey: 'planId' });
Subscription.belongsTo(Plan, { as: 'Plan', foreignKey: 'planId' });

// Subscription Payment associations
User.hasMany(SubscriptionPayment, { as: 'SubscriptionPayments', foreignKey: 'userId' });
SubscriptionPayment.belongsTo(User, { as: 'User', foreignKey: 'userId' });

Plan.hasMany(SubscriptionPayment, { as: 'SubscriptionPayments', foreignKey: 'planId' });
SubscriptionPayment.belongsTo(Plan, { foreignKey: 'planId' });

// Member Removal & Voting
Group.hasMany(MemberRemoval, { foreignKey: 'groupId' });
MemberRemoval.belongsTo(Group, { foreignKey: 'groupId' });

User.hasMany(MemberRemoval, { as: 'RemovalRequests', foreignKey: 'requesterId' });
User.hasMany(MemberRemoval, { as: 'RemovalTargets', foreignKey: 'targetUserId' });
MemberRemoval.belongsTo(User, { as: 'Requester', foreignKey: 'requesterId' });
MemberRemoval.belongsTo(User, { as: 'Target', foreignKey: 'targetUserId' });

MemberRemoval.hasMany(RemovalVote, { as: 'Votes', foreignKey: 'removalId' });
RemovalVote.belongsTo(MemberRemoval, { foreignKey: 'removalId' });

User.hasMany(RemovalVote, { foreignKey: 'userId' });
RemovalVote.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  User,
  Group,
  Membership,
  Payment,
  ValidationCode,
  Invoice,
  Loan,
  LoanVote,
  BotNotification,
  Plan,
  Subscription,
  AdminPaymentMethod,
  SubscriptionPayment,
  MemberRemoval,
  RemovalVote
};
