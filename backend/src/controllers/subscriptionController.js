const { Subscription, Plan, User, SubscriptionPayment, AdminPaymentMethod, BotNotification } = require('../models');
const { Op } = require('sequelize');

exports.getAdminPaymentMethods = async (req, res) => {
    try {
        const methods = await AdminPaymentMethod.findAll({ where: { isActive: true } });
        res.json(methods);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar métodos de pagamento', error: error.message });
    }
};

exports.createAdminPaymentMethod = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Acesso negado' });
        const { type, accountName, accountNumber } = req.body;
        const method = await AdminPaymentMethod.create({ type, accountName, accountNumber });
        res.status(201).json({ message: 'Método de pagamento criado', method });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar método de pagamento', error: error.message });
    }
};

exports.requestUpgrade = async (req, res) => {
    try {
        const { planId, amount, paymentMethodDetails, transactionId } = req.body;
        
        if (!transactionId && !req.file) {
            return res.status(400).json({ message: 'É necessário informar o ID da transação ou anexar um comprovativo.' });
        }

        const proofPath = req.file ? `/uploads/subscriptions/${req.file.filename}` : null;

        const upgradeRequest = await SubscriptionPayment.create({
            userId: req.user.id,
            planId,
            amount,
            paymentMethodDetails,
            transactionId,
            proofPath,
            status: 'pending'
        });

        res.status(201).json({ message: 'Pedido de upgrade enviado com sucesso. Aguarde aprovação.', upgradeRequest });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao solicitar upgrade', error: error.message });
    }
};

exports.getPendingUpgrades = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Acesso negado' });
        const pending = await SubscriptionPayment.findAll({
            where: { status: 'pending' },
            include: [
                { model: User, as: 'User', attributes: ['firstName', 'lastName', 'phone'] },
                { model: Plan, as: 'Plan' }
            ]
        });
        res.json(pending);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar pedidos pendentes', error: error.message });
    }
};

exports.approveUpgrade = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ message: 'Acesso negado' });
        const { id } = req.params;
        const payment = await SubscriptionPayment.findByPk(id, {
            include: [{ model: User, as: 'User' }, { model: Plan, as: 'Plan' }]
        });

        if (!payment) return res.status(404).json({ message: 'Pagamento não encontrado' });

        // 1. Update/Create Subscription
        const [subscription, created] = await Subscription.findOrCreate({
            where: { userId: payment.userId, status: 'active' },
            defaults: {
                userId: payment.userId,
                planId: payment.planId,
                status: 'active',
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }
        });

        if (!created) {
            // Extend existing subscription or update plan
            const newEndDate = new Date(Math.max(subscription.endDate, Date.now()) + 30 * 24 * 60 * 60 * 1000);
            await subscription.update({
                planId: payment.planId,
                endDate: newEndDate
            });
        }

        // 2. Mark payment as approved
        payment.status = 'approved';
        await payment.save();

        // 3. Queue WhatsApp Congratulatory message
        await BotNotification.create({
            phone: payment.User.phone,
            userId: payment.userId,
            type: 'SUBSCRIPTION_UPGRADE',
            content: `🎉 Parabéns ${payment.User.firstName}! Sua subscrição ao plano ${payment.Plan.name} foi aprovada. Agora você pode desfrutar de todas as funcionalidades!`,
            status: 'pending'
        });

        res.json({ message: 'Upgrade aprovado com sucesso!', subscription });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao aprovar upgrade', error: error.message });
    }
};
