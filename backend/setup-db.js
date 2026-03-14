const sequelize = require('./src/config/database');
const { User, Group, Membership, Payment, ValidationCode, Plan } = require('./src/models');

async function initializeDatabase() {
  try {
    // We try to authenticate first
    await sequelize.authenticate();
    console.log('Connection to database established successfully.');

    // Sync all models
    // force: true will drop tables if they exist - USE WITH CAUTION
    // alter: true will match the models to the existing tables
    await sequelize.sync({ alter: true });
    console.log('All models were synchronized successfully.');

    // Seed Super Admin
    const superAdminPhone = '870046109';
    const existing = await User.findOne({ where: { phone: superAdminPhone } });
    if (!existing) {
      await User.create({
        firstName: 'Ande',
        lastName: 'Admin',
        phone: superAdminPhone,
        password: 'ande0000',
        role: 'SUPER_ADMIN'
      });
      console.log('Super Admin account created successfully.');
    } else {
      console.log('Super Admin account already exists.');
    }

    // Seed Plans
    const plans = [
      { name: 'Grátis', description: 'Plano básico gratuito', monthlyPrice: 0, groupLimit: 1, botEnabled: false },
      { name: 'Básico', description: 'Até 3 grupos com bot', monthlyPrice: 500, groupLimit: 3, botEnabled: true },
      { name: 'Premium', description: 'Grupos ilimitados com bot', monthlyPrice: 1500, groupLimit: -1, botEnabled: true }
    ];

    for (const planData of plans) {
      const [plan, created] = await Plan.findOrCreate({
        where: { name: planData.name },
        defaults: planData
      });
      if (!created) {
        // Update price in case Super Admin changed it via code or we want to reset
        await plan.update({ 
            description: planData.description,
            groupLimit: planData.groupLimit,
            botEnabled: planData.botEnabled
        });
      }
    }
    console.log('Plans seeded/updated successfully.');

    process.exit(0);
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    
    // Check if the error is because the database doesn't exist
    if (error.code === 'ER_BAD_DB_ERROR' || error.original?.code === 'ER_BAD_DB_ERROR') {
      console.log('Database does not exist. Please create it manually or ensure your DB_USER has permissions to create databases.');
      console.log('You can run: CREATE DATABASE fambaxitique;');
    }
    
    process.exit(1);
  }
}

initializeDatabase();
