const { Plan, Subscription } = require('../models');

exports.getPlans = async (req, res) => {
  try {
    const plans = await Plan.findAll({ order: [['monthlyPrice', 'ASC']] });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching plans', error: error.message });
  }
};

exports.updatePlan = async (req, res) => {
  try {
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { id } = req.params;
    const { monthlyPrice, groupLimit, botEnabled, description } = req.body;
    
    const plan = await Plan.findByPk(id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    
    await plan.update({ 
        monthlyPrice, 
        groupLimit, 
        botEnabled, 
        description 
    });
    
    res.json({ message: 'Plan updated successfully', plan });
  } catch (error) {
    res.status(500).json({ message: 'Error updating plan', error: error.message });
  }
};

exports.getMySubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { userId: req.user.id, status: 'active' },
            include: [{ model: Plan, as: 'Plan' }]
        });
        res.json(subscription);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar subscrição', error: error.message });
    }
};
