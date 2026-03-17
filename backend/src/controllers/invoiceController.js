const { Invoice, Group, Membership, User, BotNotification } = require('../models');
const { Op } = require('sequelize');

exports.getMemberInvoices = async (req, res) => {
    try {
        const { userId, groupId } = req.params;
        const requesterId = req.user.id;

        // Check if requester is at least a member of the group
        const membership = await Membership.findOne({
            where: { userId: requesterId, groupId }
        });

        if (!membership && requesterId !== userId) {
            return res.status(403).json({ message: 'Não autorizado a ver faturas neste grupo.' });
        }

        // Auto-generate for the current month if not exists
        await generateInvoicesForUserInGroup(userId, groupId);

        const invoices = await Invoice.findAll({
            where: { userId, groupId },
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.json(invoices);
    } catch (error) {
        console.error('Error in getMemberInvoices:', error);
        res.status(500).json({ message: 'Erro ao buscar faturas', error: error.message });
    }
};

exports.getUserInvoices = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user.id;

        // Auto-generate for the current month if not exists
        await generateInvoicesForUserInGroup(userId, groupId);

        const invoices = await Invoice.findAll({
            where: { userId, groupId },
            order: [['year', 'DESC'], ['month', 'DESC']]
        });

        res.json(invoices);
    } catch (error) {
        console.error('Error in getUserInvoices:', error);
        res.status(500).json({ message: 'Error fetching invoices', error: error.message });
    }
};

exports.bulkGenerateInvoices = async (req, res) => {
    try {
        const { groupId } = req.params;
        const requesterId = req.user.id;

        const group = await Group.findByPk(groupId, {
            include: [{ association: 'Members', attributes: ['id'] }]
        });

        if (!group) return res.status(404).json({ message: 'Grupo não encontrado.' });
        if (group.adminId !== requesterId) {
            return res.status(403).json({ message: 'Apenas o administrador pode iniciar o ciclo de faturas.' });
        }

        const counts = { created: 0, existing: 0 };

        for (const member of group.Members) {
            const result = await generateInvoicesForUserInGroup(member.id, groupId);
            if (result === 'created') counts.created++;
            else counts.existing++;
        }

        res.json({ message: 'Ciclo de faturas processado com sucesso!', counts });
    } catch (error) {
        console.error('Error in bulkGenerateInvoices:', error);
        res.status(500).json({ message: 'Erro ao gerar faturas em massa', error: error.message });
    }
};

async function generateInvoicesForUserInGroup(userId, groupId) {
    const group = await Group.findByPk(groupId);
    if (!group || group.status !== 'active') return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    let dueDate;
    let month = currentMonth;
    let year = currentYear;
    let week = null;

    if (group.contributionFrequency === 'weekly') {
        const targetDay = group.dueDay; 
        const currentDay = now.getDay();
        let diff = targetDay - currentDay;
        
        // If we are generating manually and the day has passed, 
        // it usually means we are late for THIS week's contribution.
        // But if the user wants it to be 'strange', they might mean it's going back too far.
        // Let's keep it targeting the current/upcoming week.
        
        dueDate = new Date(now);
        dueDate.setDate(now.getDate() + diff);
        dueDate.setHours(23, 59, 59, 999);
        
        month = dueDate.getMonth() + 1;
        year = dueDate.getFullYear();
        
        // Calculate week number more robustly
        const startOfYear = new Date(year, 0, 1);
        const days = Math.floor((dueDate - startOfYear) / (24 * 60 * 60 * 1000));
        week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    } else if (group.contributionFrequency === 'monthly') {
        dueDate = new Date(year, now.getMonth(), group.dueDay);
        
        // If today is the 20th and dueDay is 5, it generates for 5th of current month (past).
        // This is usually correct for 'late' invoices, but let's ensure it doesn't wrap weirdly.
        const lastDayOfMonth = new Date(year, now.getMonth() + 1, 0).getDate();
        if (group.dueDay > lastDayOfMonth) {
            dueDate = new Date(year, now.getMonth(), lastDayOfMonth);
        }
        
        dueDate.setHours(23, 59, 59, 999);
    } else if (group.contributionFrequency === 'daily') {
        dueDate = new Date(now);
        dueDate.setHours(23, 59, 59, 999);
        // For daily, use year, month, day as unique period
        // We'll use 'week' field to store 'day' for daily frequency uniqueness
        week = now.getDate(); 
    }

    // Check if invoice already exists for this specific period
    const existing = await Invoice.findOne({
        where: { 
            userId, 
            groupId, 
            month, 
            year,
            week: week || null
        }
    });

    if (!existing) {
        const invoice = await Invoice.create({
            amount: group.contributionAmount,
            dueDate,
            status: 'pending',
            month,
            year,
            week,
            userId,
            groupId
        });

        // Queue WhatsApp Notification for new invoice
        try {
            const user = await User.findByPk(userId);
            if (user) {
                const monthName = new Intl.DateTimeFormat('pt-PT', { month: 'long' }).format(new Date(year, month - 1));
                const formattedDate = new Date(dueDate).toLocaleDateString('pt-PT');
                
                // Ensure phone has country code for WhatsApp
                const formattedPhone = user.phone.startsWith('258') ? user.phone : `258${user.phone}`;

                await BotNotification.create({
                    phone: formattedPhone,
                    userId: user.id,
                    groupId: group.id,
                    type: 'INVOICE_GENERATED',
                    content: `🔔 *Nova Fatura Gerada*\n\nOlá, *${user.firstName}*!\nFoi gerada a sua fatura de contribuição para o grupo *${group.name}*.\n\n💰 *Valor:* ${group.contributionAmount} MT\n📅 *Vencimento:* ${formattedDate}\n📂 *Referência:* ${monthName}/${year}\n\nPor favor, efetue o pagamento para manter seu status em dia.`,
                    status: 'pending'
                });
            }
        } catch (botErr) {
            console.error('Error queuing invoice notification:', botErr);
        }

        return 'created';
    }
    return 'existing';
}

exports.automateInvoiceGeneration = async (specificGroupId = null) => {
    try {
        const where = { status: 'active' };
        if (specificGroupId) where.id = specificGroupId;

        const activeGroups = await Group.findAll({ 
            where, 
            include: [{ association: 'Members', attributes: ['id'] }] 
        });

        const now = new Date();
        const currentDayOfMonth = now.getDate();
        const currentDayOfWeek = now.getDay();
        
        for (const group of activeGroups) {
            let shouldGenerate = false;
            
            // If specificGroupId is provided, it's a forced trigger from settings
            if (specificGroupId) {
                shouldGenerate = true;
            } else {
                if (group.contributionFrequency === 'monthly') {
                    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    const targetDay = Math.min(group.dueDay, lastDayOfMonth);
                    if (currentDayOfMonth === targetDay) {
                        shouldGenerate = true;
                    }
                } else if (group.contributionFrequency === 'weekly' && currentDayOfWeek === group.dueDay) {
                    shouldGenerate = true;
                } else if (group.contributionFrequency === 'daily') {
                    shouldGenerate = true;
                }
            }
            
            if (shouldGenerate) {
                const lastInvoiced = group.lastInvoicedAt ? new Date(group.lastInvoicedAt) : null;
                const isToday = lastInvoiced && lastInvoiced.toDateString() === now.toDateString();
                
                if (!isToday || specificGroupId) {
                    console.log(`[Scheduler] Generating invoices for group: ${group.name}`);
                    for (const member of group.Members) {
                        try {
                            await generateInvoicesForUserInGroup(member.id, group.id);
                        } catch (memberErr) {
                            console.error(`[Scheduler] Error generating invoice for member ${member.id} in group ${group.id}:`, memberErr.message);
                        }
                    }
                    group.lastInvoicedAt = now;
                    await group.save();
                }
            }
        }
    } catch (error) {
        console.error('[Scheduler] Error in automateInvoiceGeneration:', error);
    }
};

exports.updateOverdueInvoices = async () => {
    try {
        const now = new Date();
        await Invoice.update(
            { status: 'overdue' },
            {
                where: {
                    status: 'pending',
                    dueDate: { [Op.lt]: now }
                }
            }
        );
    } catch (error) {
        console.error('Error updating overdue invoices:', error);
    }
};
