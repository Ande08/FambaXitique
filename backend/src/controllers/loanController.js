const { Loan, Group, User, Membership, LoanVote, BotNotification } = require('../models');

exports.requestLoan = async (req, res) => {
    try {
        const { groupId, amountRequested, notes } = req.body;
        const userId = req.user.id;

        const group = await Group.findByPk(groupId);
        if (!group) return res.status(404).json({ message: 'Grupo não encontrado.' });

        // Enforce Borrowing Limit
        if (parseFloat(amountRequested) > parseFloat(group.balance)) {
            return res.status(400).json({ message: `O grupo só tem ${group.balance} MT disponível em caixa.` });
        }

        // Use group-specific interest rate
        const interestRate = parseFloat(group.loanInterestRate) || 10.00; 
        const totalToRepay = parseFloat(amountRequested) * (1 + interestRate / 100);

        const loan = await Loan.create({
            amountRequested,
            interestRate,
            totalToRepay,
            remainingBalance: totalToRepay,
            status: 'pending',
            notes,
            userId,
            groupId
        });

        res.status(201).json({ message: 'Solicitação de empréstimo enviada com sucesso!', loan });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao solicitar empréstimo', error: error.message });
    }
};

exports.getPendingLoans = async (req, res) => {
    try {
        // Find groups where user is ADMIN
        const memberships = await Membership.findAll({
            where: { UserId: req.user.id, role: 'ADMIN' }
        });
        const groupIds = memberships.map(m => m.GroupId);

        const loans = await Loan.findAll({
            where: { groupId: groupIds, status: 'pending' },
            include: [
                { model: User, as: 'User', attributes: ['firstName', 'lastName', 'phone'] },
                { 
                    model: Group, 
                    as: 'Group', 
                    attributes: ['id', 'name'],
                    include: [{ model: User, as: 'Members', attributes: ['id'] }]
                },
                { model: LoanVote, as: 'Votes' }
            ]
        });

        res.json(loans);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar solicitações pendentes', error: error.message });
    }
};

exports.approveLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'approve' or 'reject'
        const disbursementProof = req.file ? req.file.path : null;

        const loan = await Loan.findByPk(id, { 
            include: [
                { model: Group, as: 'Group' },
                { model: LoanVote, as: 'Votes' }
            ] 
        });
        if (!loan) return res.status(404).json({ message: 'Empréstimo não encontrado.' });

        // Authorization
        if (loan.Group.adminId !== req.user.id) {
            return res.status(403).json({ message: 'Apenas o administrador do grupo pode aprovar empréstimos.' });
        }

        if (action === 'approve') {
            // Check if all members have voted
            const memberCount = await Membership.count({ where: { GroupId: loan.groupId } });
            const positiveVotes = loan.Votes.filter(v => v.vote === 'approve').length;

            if (positiveVotes < memberCount) {
                return res.status(400).json({ 
                    message: `Aprovação bloqueada: Necessário ${memberCount} votos de aprovação (atualmente: ${positiveVotes}).` 
                });
            }

            if (!disbursementProof) {
                return res.status(400).json({ message: 'Comprovativo de desembolso é obrigatório para aprovação.' });
            }
            loan.status = 'approved';
            loan.disbursementProof = disbursementProof;
            
            // Optionally update group balance (decrease)
            const group = loan.Group;
            group.balance = parseFloat(group.balance) - parseFloat(loan.amountRequested);
            await group.save();

            // Queue WhatsApp Notification for loan approval
            try {
                const user = await User.findByPk(loan.userId);
                if (user) {
                    await BotNotification.create({
                        phone: user.phone,
                        userId: user.id,
                        type: 'LOAN_APPROVED',
                        content: `🎊 *Empréstimo Aprovado!*\n\nOlá, *${user.firstName}*!\nSua solicitação de empréstimo no grupo *${group.name}* foi aprovada.\n\n💰 *Valor:* ${loan.amountRequested} MT\n💵 *Total a Repagar:* ${loan.totalToRepay} MT\n\nO comprovativo de transferência já está disponível no sistema.`,
                        status: 'pending'
                    });
                }
            } catch (err) {
                console.error('Error queuing loan approval notification:', err);
            }
        } else {
            loan.status = 'rejected';
        }

        await loan.save();
        res.json({ message: `Empréstimo ${action === 'approve' ? 'aprovado' : 'rejeitado'} com sucesso!`, loan });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao processar empréstimo', error: error.message });
    }
};

exports.voteLoan = async (req, res) => {
    try {
        const { id } = req.params;
        const { vote } = req.body; // 'approve' or 'reject'
        const userId = req.user.id;

        const loan = await Loan.findByPk(id);
        if (!loan) return res.status(404).json({ message: 'Empréstimo não encontrado.' });

        if (loan.status !== 'pending') {
            return res.status(400).json({ message: 'Este empréstimo já não está pendente de votação.' });
        }

        // Check if user is a member of the group
        const membership = await Membership.findOne({ 
            where: { UserId: userId, GroupId: loan.groupId } 
        });
        if (!membership) {
            return res.status(403).json({ message: 'Apenas membros do grupo podem votar.' });
        }

        // Create or update vote
        const [loanVote, created] = await LoanVote.findOrCreate({
            where: { loanId: id, userId },
            defaults: { vote }
        });

        if (!created) {
            loanVote.vote = vote;
            await loanVote.save();
        }

        res.json({ message: 'Voto registrado com sucesso!', vote: loanVote });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao registrar voto', error: error.message });
    }
};

exports.getUserLoans = async (req, res) => {
    try {
        const { groupId } = req.params;
        const loans = await Loan.findAll({
            where: { userId: req.user.id, groupId },
            order: [['createdAt', 'DESC']]
        });
        res.json(loans);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seus empréstimos', error: error.message });
    }
};
