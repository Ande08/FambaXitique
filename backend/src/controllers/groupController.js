const { Group, Membership, User, ValidationCode, Loan, LoanVote, Invoice, Plan, Subscription, MemberRemoval, RemovalVote } = require('../models');
const crypto = require('crypto');

exports.createGroup = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check Plan Limits
    const subscription = await Subscription.findOne({
      where: { userId: req.user.id, status: 'active' },
      include: [{ model: Plan, as: 'Plan' }]
    });

    const currentGroupsCount = await Group.count({ where: { adminId: req.user.id } });

    if (subscription && subscription.Plan) {
      const limit = subscription.Plan.groupLimit;
      if (limit !== -1 && currentGroupsCount >= limit) {
        return res.status(403).json({ 
          message: `Atingiu o limite de grupos para o plano ${subscription.Plan.name} (${limit} grupos). Por favor, faça um upgrade para criar mais grupos.` 
        });
      }
    } else {
        // Default Grátis limit if no subscription found
        if (currentGroupsCount >= 1) {
            return res.status(403).json({ message: 'Limite de 1 grupo gratuito atingido. Torne-se Premium para criar mais!' });
        }
    }

    const group = await Group.create({
      name,
      description,
      adminId: req.user.id
    });

    // Automatically make creator the ADMIN
    await Membership.create({
      UserId: req.user.id,
      GroupId: group.id,
      role: 'ADMIN'
    });

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    // Both Regular users and Super Admins see ONLY groups they belong to in the dashboard views
    // ( Sequelize with where in include performs an INNER JOIN )
    const groups = await Group.findAll({
      include: [
        {
          model: User,
          as: 'Members',
          where: { id: req.user.id },
          through: { attributes: ['role'] }
        },
        { 
          model: Loan, 
          as: 'Loans',
          include: [
            { model: User, as: 'User', attributes: ['id', 'firstName', 'lastName'] },
            { model: LoanVote, as: 'Votes' }
          ]
        }
      ]
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
};

exports.getPendingGroups = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const groups = await Group.findAll({ 
      where: { status: 'pending' }, 
      include: [{ model: User, as: 'Creator', attributes: ['id', 'firstName', 'lastName', 'phone'] }] 
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pending groups', error: error.message });
  }
};

exports.getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const totalUsers = await User.count();
    const totalGroups = await Group.count();
    res.json({ totalUsers, totalGroups });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

exports.getAllGroups = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const groups = await Group.findAll({
      include: [
        { model: User, as: 'Creator', attributes: ['firstName', 'lastName', 'phone'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all groups', error: error.message });
  }
};

exports.updateGroupStatus = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'rejected'
    
    const group = await Group.findByPk(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    
    group.status = status;
    await group.save();
    
    res.json({ message: `Group ${status} successfully`, group });
  } catch (error) {
    res.status(500).json({ message: 'Error updating group status', error: error.message });
  }
};

exports.getGroupDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const group = await Group.findByPk(id, {
            include: [
                { model: User, as: 'Members', attributes: ['id', 'firstName', 'lastName', 'phone'], through: { attributes: ['role'] } },
                { model: Loan, as: 'Loans' }
            ]
        });
        if (!group) return res.status(404).json({ message: 'Group not found' });
        res.json(group);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching group details', error: error.message });
    }
};

exports.generateJoinCode = async (req, res) => {
  try {
    const { groupId } = req.body;
    const group = await Group.findByPk(groupId);

    if (!group || group.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Only admins can generate join codes' });
    }

    const code = crypto.randomInt(100000, 999999).toString();
    
    // Set expiry to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await ValidationCode.create({
      code,
      groupId,
      userId: req.user.id, // Who generated it
      expiresAt,
      used: false
    });

    res.json({ code });
  } catch (error) {
    res.status(500).json({ message: 'Error generating code', error: error.message });
  }
};

exports.joinGroupByCode = async (req, res) => {
  try {
    const { code } = req.body;
    const validation = await ValidationCode.findOne({
      where: { code, used: false },
      include: [{ association: 'Group' }]
    });

    if (!validation) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }

    if (new Date() > validation.expiresAt) {
      return res.status(400).json({ message: 'Code has expired' });
    }

    // Check if user is already a member
    const existingMember = await Membership.findOne({
      where: { UserId: req.user.id, GroupId: validation.groupId }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    // Join as MEMBER
    await Membership.create({
      UserId: req.user.id,
      GroupId: validation.groupId,
      role: 'MEMBER'
    });

    // Mark code as used
    validation.used = true;
    await validation.save();

    res.json({ message: 'Joined group successfully', group: validation.Group });
  } catch (error) {
    res.status(500).json({ message: 'Error joining group', error: error.message });
  }
};

exports.updateGroupSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contributionAmount, contributionFrequency, paymentMethods, dueDay, generateNow } = req.body;

    const group = await Group.findByPk(id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    // Ensure requester is the admin
    if (group.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Only the group admin can update settings' });
    }

    // Ensure group is active
    if (group.status !== 'active') {
      return res.status(400).json({ message: 'Group must be approved before configuring settings' });
    }

    if (name !== undefined) group.name = name;
    if (contributionAmount !== undefined) group.contributionAmount = contributionAmount;
    if (contributionFrequency !== undefined) group.contributionFrequency = contributionFrequency;
    if (paymentMethods !== undefined) group.paymentMethods = paymentMethods;
    if (dueDay !== undefined) group.dueDay = dueDay;
    if (req.body.loanInterestRate !== undefined) group.loanInterestRate = req.body.loanInterestRate;
    
    await group.save();

    // Trigger immediate generation if requested
    if (generateNow) {
      const { automateInvoiceGeneration } = require('./invoiceController');
      // We can run this specifically for this group or just trigger the global check
      // For precision, let's trigger it 
      await automateInvoiceGeneration(group.id);
    }

    res.json({ message: 'Settings updated successfully', group });
  } catch (error) {
    res.status(500).json({ message: 'Error updating settings', error: error.message });
  }
};

exports.getGroupReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { Invoice, Loan, User, LoanVote } = require('../models');

        const group = await Group.findByPk(id, {
            include: [
                { model: Invoice, as: 'Invoices', include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName'] }] },
                { model: Loan, as: 'Loans', include: [{ model: User, as: 'User', attributes: ['firstName', 'lastName'] }] },
                { model: User, as: 'Members', attributes: ['id', 'firstName', 'lastName', 'phone'] }
            ]
        });

        if (!group) return res.status(404).json({ message: 'Group not found' });

        const report = {
            groupName: group.name,
            balance: group.balance,
            interestRate: group.loanInterestRate,
            invoices: {
                total: group.Invoices.length,
                paid: group.Invoices.filter(i => i.status === 'paid').length,
                pending: group.Invoices.filter(i => i.status === 'pending').length,
                overdue: group.Invoices.filter(i => i.status === 'overdue').length,
                totalAmount: group.Invoices.reduce((sum, i) => sum + Number(i.amount), 0),
                paidAmount: group.Invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0)
            },
            loans: {
                totalCount: group.Loans.length,
                activeCount: group.Loans.filter(l => l.status === 'approved').length,
                settledCount: group.Loans.filter(l => l.status === 'settled').length,
                totalLoaned: group.Loans.filter(l => l.status !== 'rejected').reduce((sum, l) => sum + Number(l.amountRequested), 0),
                totalInterest: group.Loans.filter(l => l.status === 'approved' || l.status === 'settled').reduce((sum, l) => sum + (Number(l.totalToRepay) - Number(l.amountRequested)), 0),
                remainingBalance: group.Loans.filter(l => l.status === 'approved').reduce((sum, l) => sum + Number(l.remainingBalance), 0)
            },
            members: group.Members.map(member => {
                const memberInvoices = group.Invoices.filter(i => i.userId === member.id);
                const memberLoans = group.Loans.filter(l => l.userId === member.id);
                return {
                    id: member.id,
                    name: `${member.firstName} ${member.lastName}`,
                    phone: member.phone,
                    invoicesPaid: memberInvoices.filter(i => i.status === 'paid').length,
                    invoicesPending: memberInvoices.filter(i => i.status === 'pending' || i.status === 'overdue').length,
                    activeLoanBalance: memberLoans.filter(l => l.status === 'approved').reduce((sum, l) => sum + Number(l.remainingBalance), 0)
                };
            })
        };

        res.json(report);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.requestMemberRemoval = async (req, res) => {
  try {
    const { groupId, targetUserId, reason } = req.body;
    
    // Check if requester is group admin
    const group = await Group.findByPk(groupId);
    if (!group || group.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Apenas o administrador do grupo pode solicitar a remoção de membros.' });
    }

    // Check if target is a member
    const targetMembership = await Membership.findOne({ where: { UserId: targetUserId, GroupId: groupId } });
    if (!targetMembership) {
      return res.status(404).json({ message: 'O usuário alvo não é membro deste grupo.' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ message: 'Você não pode remover a si mesmo através deste processo.' });
    }

    // Check if there is already a pending removal
    const existingRemoval = await MemberRemoval.findOne({ where: { groupId, targetUserId, status: 'pending' } });
    if (existingRemoval) {
      return res.status(400).json({ message: 'Já existe um processo de remoção pendente para este membro.' });
    }

    const removal = await MemberRemoval.create({
      groupId,
      requesterId: req.user.id,
      targetUserId,
      reason,
      status: 'pending'
    });

    res.status(201).json({ message: 'Pedido de remoção criado. A votação foi iniciada.', removal });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao solicitar remoção', error: error.message });
  }
};

exports.voteMemberRemoval = async (req, res) => {
  try {
    const { removalId, vote } = req.body; // vote: 'approve' or 'reject'
    
    const removal = await MemberRemoval.findByPk(removalId, {
      include: [{ model: Group }]
    });

    if (!removal || removal.status !== 'pending') {
      return res.status(404).json({ message: 'Processo de remoção não encontrado ou já finalizado.' });
    }

    // Check if voter is member of the group
    const voterMembership = await Membership.findOne({ where: { UserId: req.user.id, GroupId: removal.groupId } });
    if (!voterMembership) {
      return res.status(403).json({ message: 'Apenas membros do grupo podem votar.' });
    }

    if (req.user.id === removal.targetUserId) {
      return res.status(403).json({ message: 'Você não pode votar no seu próprio processo de remoção.' });
    }

    // Create or update vote
    await RemovalVote.upsert({
      removalId,
      userId: req.user.id,
      vote
    });

    // Check if threshold is met
    const totalMembers = await Membership.count({ where: { GroupId: removal.groupId } });
    const eligibleVoters = totalMembers - 1; // Everyone except the target user
    
    const approveVotes = await RemovalVote.count({ where: { removalId, vote: 'approve' } });
    
    // Majority threshold
    if (approveVotes > eligibleVoters / 2) {
      removal.status = 'approved';
      await removal.save();
      
      // Execute removal
      await Membership.destroy({ where: { UserId: removal.targetUserId, GroupId: removal.groupId } });
      
      // If the target member was the admin (unlikely given request logic), we'd need to handle that, 
      // but only admin can request removal for now.
    } else {
      const rejectVotes = await RemovalVote.count({ where: { removalId, vote: 'reject' } });
      // If reject votes make it impossible to reach majority approval
      if (rejectVotes >= eligibleVoters / 2 + 1 || (eligibleVoters % 2 === 0 && rejectVotes === eligibleVoters / 2)) {
         // This is a bit complex, let's just check if it's already impossible
         // If more than half vote reject, it's rejected.
         if (rejectVotes > eligibleVoters / 2) {
           removal.status = 'rejected';
           await removal.save();
         }
      }
    }

    res.json({ message: 'Voto registrado com sucesso.', status: removal.status });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar voto', error: error.message });
  }
};

exports.getPendingRemovals = async (req, res) => {
  try {
    const { groupId } = req.params;
    const removals = await MemberRemoval.findAll({
      where: { groupId, status: 'pending' },
      include: [
        { model: User, as: 'Target', attributes: ['firstName', 'lastName', 'phone'] },
        { model: RemovalVote, as: 'Votes' }
      ]
    });
    res.json(removals);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar remoções pendentes', error: error.message });
  }
};
