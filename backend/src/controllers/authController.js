const { User, BotNotification, Plan, Subscription } = require('../models');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, phone, password } = req.body;
    
    if (!firstName || !lastName || !phone || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
    }

    if (!/^\d{8,15}$/.test(phone)) {
      return res.status(400).json({ message: 'Número de telefone inválido.' });
    }

    const user = await User.create({ firstName, lastName, phone, password });

    // Queue OTP for Registration (Simulated 6-digit code)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Ensure phone has country code for WhatsApp
    const formattedPhone = phone.startsWith('258') ? phone : `258${phone}`;

    await BotNotification.create({
      phone: formattedPhone,
      userId: user.id,
      type: 'OTP_REGISTRATION',
      content: `Olá ${user.firstName}! Bem-vindo ao FambaXitique. Seu código de ativação é: ${otp}`,
      status: 'pending'
    });

    // Auto-assign "Grátis" Plan
    const freePlan = await Plan.findOne({ where: { name: 'Grátis' } });
    if (freePlan) {
      await Subscription.create({
        userId: user.id,
        planId: freePlan.id,
        status: 'active',
        endDate: new Date(Date.now() + 365 * 10 * 24 * 60 * 60 * 1000) // Default far expiry
      });
    }

    res.status(201).json({ 
      message: 'Usuário registrado com sucesso. Verifique seu WhatsApp!', 
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone } 
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Este número de telefone já está registrado no sistema.' });
    }
    res.status(500).json({ message: 'Erro ao registrar usuário', error: error.message });
  }
};

exports.login = async (req, res) => {
  console.log(`[DEBUG] Login attempt for phone: ${req.body.phone}`);
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json({ message: 'Telefone e senha são obrigatórios.' });
    }
    console.log('[DEBUG] Finding user...');
    const user = await User.findOne({ where: { phone } });

    if (!user) {
      console.log('[DEBUG] User not found');
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    console.log('[DEBUG] Verifying password...');
    const isValid = await user.validPassword(password);
    if (!isValid) {
      console.log('[DEBUG] Invalid password');
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    console.log('[DEBUG] Generating token...');
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role }, 
      process.env.JWT_SECRET || 'secret', 
      { expiresIn: '1d' }
    );
    console.log('[DEBUG] Login successful, sending response');
    res.json({ 
      token, 
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role } 
    });
  } catch (error) {
    console.error('[DEBUG] Login error:', error);
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

exports.requestReset = async (req, res) => {
  try {
    const { phone } = req.body;
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      // For security, don't reveal if user exists, but for this demo, let's be helpful
      return res.status(404).json({ message: 'Número não encontrado.' });
    }

    const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    user.resetToken = resetToken;
    user.resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    console.log(`[PASSWORD RESET] Code for ${phone}: ${resetToken}`);
    
    // Ensure phone has country code for WhatsApp
    const formattedPhone = phone.startsWith('258') ? phone : `258${phone}`;

    // Queue OTP for WhatsApp
    await BotNotification.create({
      phone: formattedPhone,
      userId: user.id,
      type: 'OTP_RESET',
      content: `FambaXitique: Seu código de recuperação de senha é: ${resetToken}`,
      status: 'pending'
    });

    res.json({ message: 'Código enviado via WhatsApp com sucesso!', demoCode: resetToken });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao solicitar reset', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    const user = await User.findOne({ where: { phone, resetToken: code } });

    if (!user || user.resetTokenExpiry < new Date()) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    user.password = newPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.json({ message: 'Senha redefinida com sucesso!' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao redefinir senha', error: error.message });
  }
};
