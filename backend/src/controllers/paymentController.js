const { Payment, Group, User, Invoice, Loan, BotNotification, Membership } = require('../models');
const receiptService = require('../services/receiptService');
const path = require('path');
const fs = require('fs');

exports.submitPayment = async (req, res) => {
  try {
    const { amount, transactionId, groupId, notes, invoiceId, loanId, paymentMethod } = req.body;
    const proofImage = req.file ? req.file.path : null;

    if (!transactionId && !proofImage) {
      return res.status(400).json({ message: 'É necessário fornecer o ID da transação ou o comprovativo (anexo).' });
    }

    const payment = await Payment.create({
      amount,
      transactionId: transactionId || null,
      proofImage,
      groupId,
      userId: req.user.id,
      notes,
      invoiceId: invoiceId || null,
      loanId: loanId || null,
      paymentMethod,
      status: 'pending'
    });

    res.status(201).json({ message: 'Payment submitted successfully', payment });
  } catch (error) {
    console.error(error);

    if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({ 
            message: 'O ID da transação já foi utilizado. Verifique os dados inseridos.', 
            error: error.errors[0].message 
        });
    }

    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
            message: 'Erro de validação nos dados do pagamento.', 
            error: error.errors.map(e => e.message) 
        });
    }

    res.status(500).json({ message: 'Error submitting payment', error: error.message });
  }
};

exports.approvePayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'

    const payment = await Payment.findByPk(paymentId, {
      include: [{ association: 'Group' }]
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if the requester is the admin of the group
    const group = await Group.findByPk(payment.groupId);
    if (group.adminId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to approve payments for this group' });
    }

    if (action === 'approve') {
      payment.status = 'approved';
      // Update group balance
      group.balance = parseFloat(group.balance) + parseFloat(payment.amount);
      await group.save();

      // Update linked invoice if exists
      if (payment.invoiceId) {
        await Invoice.update({ status: 'paid' }, { where: { id: payment.invoiceId } });
      }

      // Update linked loan if exists (Progressive Abatement)
      if (payment.loanId) {
        const loan = await Loan.findByPk(payment.loanId);
        if (loan) {
          const newBalance = parseFloat(loan.remainingBalance) - parseFloat(payment.amount);
          loan.remainingBalance = Math.max(0, newBalance);
          if (loan.remainingBalance <= 0) {
            loan.status = 'settled';
          }
          await loan.save();
        }
      }
    } else {
      payment.status = 'rejected';
    }

    await payment.save();

    // Generate receipt if approved
    if (action === 'approve') {
        try {
            const fullPayment = await Payment.findByPk(paymentId, {
                include: [
                    { model: User, as: 'User', attributes: ['firstName', 'lastName'] },
                    { model: Group, as: 'Group', attributes: ['name'] },
                    { model: Invoice, as: 'Invoice' }
                ]
            });
            const receiptPath = await receiptService.generateReceipt(fullPayment, fullPayment.User, fullPayment.Group);
            fullPayment.receiptPath = receiptPath;
            await fullPayment.save();

            // Queue WhatsApp Notification
            let notificationType = 'PAYMENT_CONFIRMED';
            let message = `✅ Pagamento Confirmado!\nO valor de ${fullPayment.amount} MT foi adicionado ao seu saldo no grupo ${fullPayment.Group.name}.\nRecibo disponível no seu dashboard.`;

            if (fullPayment.loanId) {
                notificationType = 'LOAN_PAYMENT_CONFIRMED';
                message = `✅ *Pagamento de Empréstimo Confirmado!*\n\nOlá, *${fullPayment.User.firstName}*!\nSeu pagamento de ${fullPayment.amount} MT para o empréstimo no grupo *${fullPayment.Group.name}* foi processado.\nRecibo disponível no sistema.`;
            }

            await BotNotification.create({
                phone: fullPayment.User.phone,
                userId: fullPayment.User.id,
                groupId: fullPayment.groupId,
                type: notificationType,
                content: message,
                status: 'pending'
            });
        } catch (err) {
            console.error('Error generating receipt or notification:', err);
        }
    }

    res.json({ message: `Payment ${action}d successfully`, payment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

exports.getPendingPayments = async (req, res) => {
    try {
        // Find all groups where the user is an ADMIN
        const adminGroups = await Group.findAll({
            where: { adminId: req.user.id },
            attributes: ['id'],
            raw: true
        });
        
        const groupIds = adminGroups.map(g => g.id);
        console.log(`User ${req.user.id} has ${groupIds.length} admin groups: ${groupIds}`);
        
        if (groupIds.length === 0) {
            console.log('No admin groups found for user, returning empty array.');
            return res.json([]);
        }

        const payments = await Payment.findAll({
            where: { 
                status: 'pending',
                groupId: groupIds
            },
            include: [
                { association: 'User', attributes: ['firstName', 'lastName', 'phone'] },
                { association: 'Group', attributes: ['name'] },
                { association: 'Invoice', attributes: ['month', 'year', 'id'] },
                { association: 'Loan', attributes: ['id', 'amountRequested'] }
            ]
        });
        res.json(payments);
    } catch (error) {
        console.error('Error in getPendingPayments:', error);
        res.status(500).json({ message: 'Error fetching pending payments', error: error.message });
    }
};

exports.getUserPaymentHistory = async (req, res) => {
    try {
        const { userId, groupId } = req.params;
        const requesterId = req.user.id;

        // Check if requester is a member or admin of the group
        const membership = await Membership.findOne({
            where: { userId: requesterId, groupId }
        });

        if (!membership && requesterId !== userId) {
            return res.status(403).json({ message: 'Não autorizado a ver o histórico deste grupo.' });
        }

        const payments = await Payment.findAll({
            where: { userId, groupId },
            order: [['createdAt', 'DESC']],
            include: [
                { association: 'Group', attributes: ['name'] },
                { association: 'Invoice', attributes: ['month', 'year', 'id'] }
            ]
        });
        res.json(payments);
    } catch (error) {
        console.error('Error in getUserPaymentHistory:', error);
        res.status(500).json({ message: 'Error fetching payment history', error: error.message });
    }
};
exports.downloadReceipt = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await Payment.findByPk(paymentId);

        if (!payment || !payment.receiptPath) {
            return res.status(404).json({ message: 'Recibo não encontrado.' });
        }

        // Allow owner or group admin to download
        const group = await Group.findByPk(payment.groupId);
        if (payment.userId !== req.user.id && group.adminId !== req.user.id) {
            return res.status(403).json({ message: 'Não autorizado.' });
        }

        const absolutePath = path.join(__dirname, '../../', payment.receiptPath);
        if (!fs.existsSync(absolutePath)) {
            return res.status(404).json({ message: 'Arquivo físico do recibo não encontrado.' });
        }

        res.download(absolutePath, `Recibo_${payment.id}.pdf`);
    } catch (error) {
        console.error('Error downloading receipt:', error);
        res.status(500).json({ message: 'Erro ao processar download.', error: error.message });
    }
};
