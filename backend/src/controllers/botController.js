const { User, Group, Membership, Payment, Loan, Invoice, BotNotification, Plan, Subscription } = require('../models');
const { Op } = require('sequelize');

exports.getUserInfo = async (req, res) => {
    try {
        const { phone } = req.params;
        const user = await User.findOne({
            where: { phone },
            include: [
                {
                    model: Group,
                    as: 'Groups',
                    through: { attributes: ['role'] },
                    attributes: ['id', 'name', 'balance']
                },
                {
                    model: Subscription,
                    as: 'Subscriptions',
                    where: { status: 'active' },
                    required: false,
                    include: [{ model: Plan, as: 'Plan' }]
                }
            ]
        });

        if (!user) return res.status(404).json({ message: 'Número não registado.' });

        const activeSub = user.Subscriptions?.[0];

        res.json({
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            subscription: activeSub ? {
                planName: activeSub.Plan?.name,
                endDate: activeSub.endDate,
                botEnabled: activeSub.Plan?.botEnabled
            } : null,
            groups: user.Groups.map(g => ({
                id: g.id,
                name: g.name,
                role: g.Membership.role,
                balance: g.balance
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar usuário', error: error.message });
    }
};

exports.getStatus = async (req, res) => {
    try {
        const { phone } = req.params;
        const user = await User.findOne({ 
            where: { phone },
            include: [{
                model: Subscription,
                as: 'Subscriptions',
                where: { status: 'active' },
                required: false,
                include: [{ model: Plan, as: 'Plan' }]
            }]
        });
        if (!user) return res.status(404).json({ message: 'Membro não encontrado.' });

        // Basic status check is allowed even on Free, 
        // but we can warn if bot is not enabled for their groups
        // For now, let's keep it open but enrich data if needed

        const groups = await Group.findAll({
            include: [{
                model: User,
                as: 'Members',
                where: { id: user.id }
            }]
        });

        const activeLoans = await Loan.findAll({
            where: { userId: user.id, status: { [Op.or]: ['approved', 'settled'] } },
            include: [{ model: Group, as: 'Group', attributes: ['name'] }]
        });

        const totalContribution = await Payment.sum('amount', {
            where: { userId: user.id, status: 'approved', loanId: null }
        }) || 0;

        res.json({
            totalContribution,
            activeLoans: activeLoans.map(l => ({
                amountRequested: l.amountRequested,
                totalToRepay: l.totalToRepay,
                remainingBalance: l.remainingBalance,
                paid: parseFloat(l.totalToRepay) - parseFloat(l.remainingBalance),
                progress: Math.round(((parseFloat(l.totalToRepay) - parseFloat(l.remainingBalance)) / parseFloat(l.totalToRepay)) * 100) || 0,
                groupName: l.Group?.name,
                status: l.status
            }))
        });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar status', error: error.message });
    }
};

exports.submitBotPayment = async (req, res) => {
    try {
        const { phone, transactionId, amount, groupId, notes } = req.body;
        
        // Check if group creator has bot enabled
        const group = await Group.findByPk(groupId, {
            include: [{
                model: User,
                as: 'Creator',
                include: [{
                    model: Subscription,
                    as: 'Subscriptions',
                    where: { status: 'active' },
                    required: false,
                    include: [{ model: Plan, as: 'Plan' }]
                }]
            }]
        });

        if (!group) return res.status(404).json({ message: 'Grupo não encontrado.' });

        const activeSub = group.Creator?.Subscriptions?.[0];
        if (!activeSub || !activeSub.Plan?.botEnabled) {
            return res.status(403).json({ message: 'O serviço de Bot não está ativo para este grupo. Contacte o administrador.' });
        }

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'Membro não encontrado.' });

        const payment = await Payment.create({
            amount,
            transactionId,
            groupId,
            userId: user.id,
            notes: notes || 'Pagamento via Bot WhatsApp',
            status: 'pending'
        });

        res.status(201).json({ message: 'Pagamento registado. Aguarde validação do administrador.', payment });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Este ID de transação já foi submetido.' });
        }
        res.status(500).json({ message: 'Erro ao submeter pagamento', error: error.message });
    }
};

exports.submitBotLoanRequest = async (req, res) => {
    try {
        const { phone, amount, groupId, notes } = req.body;

        // Check if group creator has bot enabled
        const group = await Group.findByPk(groupId, {
            include: [{
                model: User,
                as: 'Creator',
                include: [{
                    model: Subscription,
                    as: 'Subscriptions',
                    where: { status: 'active' },
                    required: false,
                    include: [{ model: Plan, as: 'Plan' }]
                }]
            }]
        });

        if (!group) return res.status(404).json({ message: 'Grupo não encontrado.' });

        const activeSub = group.Creator?.Subscriptions?.[0];
        if (!activeSub || !activeSub.Plan?.botEnabled) {
            return res.status(403).json({ message: 'O serviço de Bot não está ativo para este grupo. Contacte o administrador.' });
        }

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ message: 'Membro não encontrado.' });

        const loan = await Loan.create({
            amountRequested: amount,
            totalToRepay: parseFloat(amount) * (1 + (parseFloat(group.loanInterestRate) / 100)),
            remainingBalance: parseFloat(amount) * (1 + (parseFloat(group.loanInterestRate) / 100)),
            userId: user.id,
            groupId,
            notes: notes || 'Solicitado via Bot WhatsApp',
            status: 'pending'
        });

        res.status(201).json({ message: 'Solicitação de empréstimo enviada com sucesso.', loan });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao solicitar empréstimo', error: error.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        // Find pending notifications
        // We include Group and its Admin's active Plan if groupId exists
        const notifications = await BotNotification.findAll({
            where: { status: 'pending' },
            include: [
                {
                    model: Group,
                    as: 'Group',
                    required: false,
                    include: [{
                        model: User,
                        as: 'Creator', // This is the adminId link
                        include: [{
                            model: Subscription,
                            as: 'Subscriptions',
                            where: { status: 'active' },
                            required: false,
                            include: [{ model: Plan, as: 'Plan' }]
                        }]
                    }]
                }
            ],
            limit: 100
        });

        // Filter: 
        // 1. If no groupId (OTP), allow.
        // 2. If groupId, check if Group Creator has a plan with botEnabled: true
        const filtered = notifications.filter(n => {
            if (!n.groupId) return true;
            
            const creator = n.Group?.Creator;
            const activeSub = creator?.Subscriptions?.[0];
            return activeSub?.Plan?.botEnabled === true;
        });

        res.json(filtered);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar notificações', error: error.message });
    }
};

exports.markNotificationSent = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'sent' or 'failed'
        const notification = await BotNotification.findByPk(id);
        if (!notification) return res.status(404).json({ message: 'Notificação não encontrada.' });

        notification.status = status || 'sent';
        await notification.save();
        res.json({ message: 'Status da notificação atualizado.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar notificação', error: error.message });
    }
};
